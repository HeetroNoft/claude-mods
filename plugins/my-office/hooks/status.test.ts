import { expect, test } from 'claude-code/testing'

import { lastQuestion, pausePlan, rateOf, resumePlan, todoSteps, newDesk } from './core'
import { register } from './register'

// A tiny in-memory engine: enough of the engine to run one session's hooks and read its desk file back.
// The module keeps its desk and its setup across tests (as across a session), so each test sets up
// what it relies on instead of counting on the order the tests run in.
function engine(files = new Map<string, string>()) {
  const handlers: { ev: string, filter?: any, fn: any }[] = []
  let now = 1_000_000
  const $: any = {
    env: { get: async () => '/home' },
    session: { id: async () => 's1', usage: async () => ({ rateLimits: [{ kind: 'five_hour', percentUsed: 40, resetsAt: '2026-10-29T18:00:00Z' }] }) },
    clock: { now: async () => (now += 1000), every: () => ({ cancel() {} }) },
    store: { get: async () => undefined, set: async () => undefined },
    tool: { register: async () => undefined },
    command: { register: async () => undefined },
    plugin: { root: '/plugin' },
    audio: { play: async () => undefined },
    fs: {
      read: async (p: string) => { if (!files.has(p)) throw new Error('missing'); return files.get(p) },
      write: async (p: string, s: string) => { files.set(p, s) },
      list: async (d: string) => [...files.keys()].filter(k => k.startsWith(d + '/')).map(k => ({ name: k.slice(d.length + 1), mtimeMs: now })),
    },
  }
  register(((ev: string, a: any, b?: any) => handlers.push(b ? { ev, filter: a, fn: b } : { ev, fn: a })) as any)
  // Runs the hooks for an event like a chain: each one's next calls the one after it, then `inner`.
  const fire = (ev: string, e: any, inner: (e: any) => any = x => x) => {
    const hs = handlers.filter(h => h.ev === ev && (!h.filter?.tool || h.filter.tool === e.tool) && (!h.filter?.command || h.filter.command === e.command))
    const run = (i: number, x: any): any => (i < hs.length ? hs[i].fn($, x, (y: any) => run(i + 1, y)) : inner(x))
    return run(0, e)
  }
  const deskNow = () => JSON.parse(files.get('/home/.claude/my-office/desks/s1.json') ?? '{}')
  return { fire, deskNow }
}

test('a question keeps the Claude waiting at its desk until it is answered', async () => {
  const o = engine()
  await o.fire('session.start', {})
  let during: any
  await o.fire('tool.call', { tool: 'AskUserQuestion', tool_use_id: 't1', questions: [{ question: 'Which theme do you prefer?' }] }, async x => { during = o.deskNow().waiting; return x })
  expect(during.kind).toBe('question')
  expect(during.text).toBe('Which theme do you prefer?')
  expect(o.deskNow().waiting).toBeUndefined()
})

test('a permission prompt waits for the OK of that tool only', async () => {
  const o = engine()
  await o.fire('session.start', {})
  await o.fire('tool.call', { tool: 'Bash', tool_use_id: 't2', description: 'deploy' }, async x => {
    await o.fire('classic.PermissionRequest', { tool_name: 'Bash' })
    expect(o.deskNow().waiting.kind).toBe('permission')
    await o.fire('tool.call', { tool: 'Read', tool_use_id: 't3', file_path: '/a/b.md' })
    expect(o.deskNow().waiting.kind).toBe('permission')
    return x
  })
  expect(o.deskNow().waiting).toBeUndefined()
})

test('a turn that ends on a question waits for the reply, and the plan pauses meanwhile', async () => {
  const o = engine()
  await o.fire('session.start', {})
  await o.fire('prompt.submit', {})
  await o.fire('turn.start', {})
  await o.fire('tool.call', { tool: 'mcp__my-office__plan', steps: [{ label: 'One', minutes: 5 }, { label: 'Two', minutes: 5 }] })
  await o.fire('turn.complete', { answer: 'Step one is done. Shall I go on with step two?', isAborted: false })
  const d = o.deskNow()
  expect(d.waiting.kind).toBe('reply')
  expect(d.waiting.text).toBe('Shall I go on with step two?')
  expect(d.eta.paused).toBe(true)
  await o.fire('prompt.submit', {})
  expect(o.deskNow().waiting).toBeUndefined()
  expect(o.deskNow().eta.paused).toBeUndefined()
})

test('a turn that ends without a question ticks the steps left and finishes the plan', async () => {
  const o = engine()
  await o.fire('session.start', {})
  await o.fire('prompt.submit', {})
  await o.fire('turn.start', {})
  await o.fire('tool.call', { tool: 'mcp__my-office__plan', steps: [{ label: 'One', minutes: 5 }, { label: 'Two', minutes: 5 }] })
  await o.fire('turn.complete', { answer: 'All done.', isAborted: false })
  const d = o.deskNow()
  expect(d.steps.every((s: any) => s.doneMs)).toBe(true)
  expect(d.pausedMs).toBeUndefined()
  expect(d.eta.allDone).toBe(true)
  expect(d.stopped).toBeUndefined()
})

test('an interrupted turn keeps its steps, frozen until the next prompt', async () => {
  const o = engine()
  await o.fire('session.start', {})
  await o.fire('prompt.submit', {})
  await o.fire('turn.start', {})
  await o.fire('tool.call', { tool: 'mcp__my-office__plan', steps: [{ label: 'One', minutes: 5 }, { label: 'Two', minutes: 5 }] })
  await o.fire('turn.complete', { answer: '', isAborted: true })
  const d = o.deskNow()
  expect(d.stopped.kind).toBe('interrupted')
  expect(d.steps.some((s: any) => s.doneMs)).toBe(false)
  await o.fire('prompt.submit', {})
  expect(o.deskNow().stopped).toBeUndefined()
  expect(o.deskNow().eta.paused).toBeUndefined()
})

test('an error keeps the steps left and reads as no success', async () => {
  const o = engine()
  await o.fire('session.start', {})
  await o.fire('prompt.submit', {})
  await o.fire('turn.start', {})
  await o.fire('tool.call', { tool: 'mcp__my-office__plan', steps: [{ label: 'One', minutes: 5 }, { label: 'Two', minutes: 5 }] })
  const line = o.deskNow().doneLine
  await o.fire('classic.StopFailure', { error: 'server_error' })
  await o.fire('turn.complete', { answer: '', isAborted: false })
  const d = o.deskNow()
  expect(d.stopped.kind).toBe('error')
  expect(d.steps.some((s: any) => s.doneMs)).toBe(false)
  expect(d.doneLine).toBe(line)
})

test('the usage limit knocks the session out until its next prompt or restart', async () => {
  const o = engine()
  await o.fire('session.start', {})
  await o.fire('session.measure', { changed: ['rateLimits'], rateLimits: [{ kind: 'five_hour', percentUsed: 100, resetsAt: '2026-10-29T18:00:00Z' }] })
  await o.fire('turn.start', {})
  await o.fire('classic.StopFailure', { error: 'rate_limit' })
  await o.fire('turn.complete', { answer: '', isAborted: false })
  const d = o.deskNow()
  expect(d.activity).toBe('limit')
  expect(d.limited.resetsAt).toBe('2026-10-29T18:00:00Z')
  await o.fire('prompt.submit', {})
  expect(o.deskNow().limited).toBeUndefined()
  expect(o.deskNow().activity).toBe('think')
})

test('the usage gauge follows every measure the engine pushes', async () => {
  const o = engine()
  await o.fire('session.start', {})
  await o.fire('session.measure', { changed: ['rateLimits'], rateLimits: [{ kind: 'five_hour', percentUsed: 55 }, { kind: 'seven_day', percentUsed: 12 }] })
  expect(o.deskNow().rate.fiveHour).toBe(55)
  expect(o.deskNow().rate.sevenDay).toBe(12)
})

test('without an office plan the board follows Claude Code\'s task list, and the office plan wins', async () => {
  const o = engine()
  await o.fire('session.start', {})
  await o.fire('turn.start', {})
  await o.fire('tool.call', { tool: 'TodoWrite', todos: [{ content: 'Read', status: 'completed' }, { content: 'Write', status: 'in_progress' }, { content: 'Test', status: 'pending' }] })
  let d = o.deskNow()
  expect(d.planSource).toBe('todos')
  expect(d.steps.map((s: any) => Boolean(s.doneMs))).toEqual([true, false, false])
  await o.fire('tool.call', { tool: 'mcp__my-office__plan', steps: [{ label: 'A', minutes: 3 }, { label: 'B', minutes: 3 }] })
  await o.fire('tool.call', { tool: 'mcp__mission-control__set_plan', steps: ['A', 'B'] })
  await o.fire('tool.call', { tool: 'TodoWrite', todos: [{ content: 'Other', status: 'pending' }] })
  d = o.deskNow()
  expect(d.planSource).toBe('office')
  expect(d.steps.map((s: any) => s.label)).toEqual(['A', 'B'])
  // the step ticked only on mission-control's panel is ticked here too, as both plans match
  await o.fire('tool.call', { tool: 'mcp__mission-control__step_done', step: 1 })
  expect(Boolean(o.deskNow().steps[0].doneMs)).toBe(true)
})

test('pure helpers: task list, questions, usage windows, pausing', async () => {
  const steps = todoSteps([{ content: 'Read', status: 'completed' }, { content: 'Ship', status: 'pending' }], [], 5)
  expect(steps).toEqual([{ label: 'Read', estMin: 0, startMs: 5, doneMs: 5 }, { label: 'Ship', estMin: 0, startMs: undefined, doneMs: undefined }])
  expect(lastQuestion('All done.')).toBe('')
  expect(lastQuestion('I fixed it. Want a test too?')).toBe('Want a test too?')
  expect(rateOf([], 1)).toBeUndefined()
  expect(rateOf([{ kind: 'seven_day', percentUsed: 80 }], 1)).toEqual({ ms: 1, sevenDay: 80, sevenResets: undefined })
  const d = newDesk('x', 'X', 0)
  d.steps = [{ label: 'A', estMin: 5, startMs: 100 }]; d.planMs = 100
  pausePlan(d, 1000); resumePlan(d, 4000)
  expect(d.planMs).toBe(3100)
  expect(d.steps[0].startMs).toBe(3100)
})

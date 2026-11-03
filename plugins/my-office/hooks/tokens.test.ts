import { expect, test } from 'claude-code/testing'

import { addTokens, estTokens, newDesk, officeDefs } from './core'
import { register } from './register'
import { PROMPT_HINT } from './tools'

// The office's own token count: the hint, its tool calls, its commands, and its tool schemas apart.
function engine(files = new Map<string, string>()) {
  const handlers: { ev: string, filter?: any, fn: any }[] = []
  let now = 2_000_000
  const $: any = {
    env: { get: async () => '/home' },
    session: { id: async () => 's1', usage: async () => ({ rateLimits: [] }) },
    clock: { now: async () => (now += 1000), every: () => ({ cancel() {} }) },
    store: { get: async () => undefined, set: async () => undefined },
    tool: { register: async () => undefined },
    command: { register: async () => undefined },
    plugin: { root: '/plugin' },
    audio: { play: async () => undefined },
    prompt: { submit: async () => undefined },
    fs: {
      read: async (p: string) => { if (!files.has(p)) throw new Error('missing'); return files.get(p) },
      write: async (p: string, s: string) => { files.set(p, s) },
      list: async (d: string) => [...files.keys()].filter(k => k.startsWith(d + '/')).map(k => ({ name: k.slice(d.length + 1), mtimeMs: now })),
    },
  }
  register(((ev: string, a: any, b?: any) => handlers.push(b ? { ev, filter: a, fn: b } : { ev, fn: a })) as any)
  const fire = (ev: string, e: any, inner: (e: any) => any = x => x) => {
    const hs = handlers.filter(h => h.ev === ev && (!h.filter?.tool || h.filter.tool === e.tool) && (!h.filter?.command || h.filter.command === e.command))
    const run = (i: number, x: any): any => (i < hs.length ? hs[i].fn($, x, (y: any) => run(i + 1, y)) : inner(x))
    return run(0, e)
  }
  const tokens = () => JSON.parse(files.get('/home/.claude/my-office/desks/s1.json') ?? '{}').tokens ?? { hint: 0, calls: 0, cmds: 0 }
  return { fire, tokens }
}

test('the hint counts each time it goes out, and only then', async () => {
  const o = engine()
  await o.fire('session.start', {})
  await o.fire('session.end', { reason: 'clear' }) // a /clear sends the hint again
  await o.fire('session.start', {})
  const before = o.tokens().hint
  let sent: any
  await o.fire('prompt.submit', {}, x => { sent = x; return x })
  expect(sent.context).toContain(PROMPT_HINT)
  expect(o.tokens().hint).toBe(before + estTokens(PROMPT_HINT))
  await o.fire('prompt.submit', {})
  expect(o.tokens().hint).toBe(before + estTokens(PROMPT_HINT))
})

test('an office tool call counts what the model wrote and the answer it got', async () => {
  const o = engine()
  await o.fire('session.start', {})
  const before = o.tokens().calls
  const r = await o.fire('tool.call', { tool: 'mcp__my-office__name_desk', tool_use_id: 'x', name: 'Writer' })
  const wrote = 'mcp__my-office__name_desk' + JSON.stringify({ name: 'Writer' }) + r.result
  expect(o.tokens().calls).toBe(before + estTokens(wrote))
  // another tool counts nothing
  await o.fire('tool.call', { tool: 'Read', file_path: '/a.md' })
  expect(o.tokens().calls).toBe(before + estTokens(wrote))
})

test('an office command counts its output', async () => {
  const o = engine()
  await o.fire('session.start', {})
  const before = o.tokens().cmds
  const r = await o.fire('command.run', { command: 'my-office-quiet', args: 'maybe' })
  expect(o.tokens().cmds).toBe(before + estTokens(r.text))
})

test('the tool schemas are read from a full context breakdown, office tools only', () => {
  const b = { mcpTools: [
    { name: 'mcp__my-office__plan', serverName: 'my-office', tokens: 120, isLoaded: false },
    { name: 'mcp__my-office__step_done', serverName: 'my-office', tokens: 40, isLoaded: true },
    { name: 'mcp__other__x', serverName: 'other', tokens: 999, isLoaded: true },
  ] }
  expect(officeDefs(b)).toEqual({ tokens: 160, loaded: true })
  expect(officeDefs({ mcpTools: [] })).toBeUndefined()
  expect(officeDefs(undefined)).toBeUndefined()
  const d = newDesk('a', 'A', 0)
  addTokens(d, 'cmds', 'abcdefgh')
  addTokens(d, 'cmds', 'abc')
  expect(d.tokens).toEqual({ hint: 0, calls: 0, cmds: 3 })
})

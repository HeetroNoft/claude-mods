import { expect, mock, test } from 'claude-code/testing'

// Every state the panel's header can show, and what moves it in and out of each one.
const txt = (n: any): string => (typeof n === 'string' ? n : (n?.children ?? []).map(txt).join(' '))
const PANEL = { plugin: 'mission-control', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 16, bodyColumns: 80 } } as any
const WAIT = 'Action requise de votre part'

const kit = (on: any, opts: { check?: string; permission?: any } = {}) => {
  const plays: string[] = []
  mock.clock(on, { now: 1_000_000 })
  on('ui.render', async () => null as any)
  on('audio.play', async (_$: any, e: any) => { plays.push(String(e.clip?.asset ?? e.asset ?? '')); return { value: {} } as any })
  on('tool.check', async () => ({ decision: opts.check ?? 'allow' }) as any)
  on('classic.PermissionRequest', async () => (typeof opts.permission === 'function' ? opts.permission() : opts.permission ?? {}) as any)
  on('prompt.submit', async (_$: any, e: any) => ({ text: e.text }) as any)
  on('turn.start', async (_$: any, e: any) => ({ turnId: e.turnId }) as any)
  on('turn.complete', async () => ({ text: '' }) as any)
  return plays
}
const drawn = async ($: any) => {
  const ui = await $.ui.mount(PANEL)
  const t = txt(await ui.drawn())
  await ui.unmount()
  return t
}
const turn = (reason: string) => ({ answer: '', durationMs: 1000, isAborted: reason === 'aborted', turnId: 't1', reason }) as any

test('auto mode: an ask the classifier answers never says you are needed', async ($, on) => {
  const plays = kit(on, { check: 'ask' })
  on('tool.call', async () => ({ result: 'ok' }) as any)
  await $.turn.start({ text: 'go', turnId: 't1' } as any)
  // The verdict alone, as tool.check gives it before the mode's decider runs.
  expect(((await $.tool.check({ tool: 'Bash', tool_use_id: 'u1', input: { command: 'npm publish' } } as any)) as any).decision).toBe('ask')
  expect(await drawn($)).not.toContain(WAIT)
  // And the request as auto mode raises it for its classifier.
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { description: 'publier le post' }, permission_mode: 'auto' } as any)
  const t = await drawn($)
  expect(t).toContain('En cours')
  expect(t).not.toContain(WAIT)
  expect(plays).not.toContain('sounds/ask.wav')
})

test('a real permission dialog says so, and its end clears it', async ($, on) => {
  const plays = kit(on)
  let during = ''
  on('tool.call', async () => { during = await drawn($); return { result: 'ok' } as any })
  await $.turn.start({ text: 'go', turnId: 't1' } as any)
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'npm publish', description: 'publier le post' }, permission_mode: 'default' } as any)
  const asked = await drawn($)
  expect(asked).toContain(WAIT)
  expect(asked).toContain('Autoriser : publier le post')
  expect(plays).toContain('sounds/ask.wav')
  await $.tool.call({ tool: 'Bash', command: 'npm publish', description: 'publier le post' } as any)
  expect(during).toContain(WAIT) // still asked until the call settles
  const after = await drawn($)
  expect(after).not.toContain(WAIT)
  expect(after).toContain('En cours')
})

test('another tool ending does not clear a dialog still open for a different one', async ($, on) => {
  kit(on)
  on('tool.call', async () => ({ result: 'ok' }) as any)
  await $.turn.start({ text: 'go', turnId: 't1' } as any)
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { description: 'publier le post' }, permission_mode: 'default' } as any)
  await $.tool.call({ tool: 'Read', file_path: '/x/a.md' } as any)
  expect(await drawn($)).toContain(WAIT)
})

test('no dialog in auto, bypass or dontAsk mode, nor when a settings hook answered it', async ($, on) => {
  let answered = false
  kit(on, { permission: () => (answered ? { decision: { behavior: 'allow' } } : {}) })
  await $.turn.start({ text: 'go', turnId: 't1' } as any)
  for (const mode of ['auto', 'bypassPermissions', 'dontAsk']) {
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: {}, permission_mode: mode } as any)
    expect(await drawn($)).not.toContain(WAIT)
  }
  answered = true
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: {}, permission_mode: 'default' } as any)
  expect(await drawn($)).not.toContain(WAIT)
})

test('a question or a plan to approve waits on you while it is open', async ($, on) => {
  kit(on)
  const seen: string[] = []
  on('tool.call', async () => { seen.push(await drawn($)); return { result: 'ok' } as any })
  await $.turn.start({ text: 'go', turnId: 't1' } as any)
  await $.tool.call({ tool: 'AskUserQuestion', questions: [] } as any)
  await $.tool.call({ tool: 'ExitPlanMode', plan: 'x' } as any)
  expect(seen[0]).toContain('Répondre à la question de Claude')
  expect(seen[1]).toContain('Valider le plan proposé')
  for (const s of seen) expect(s).toContain(WAIT)
  expect(await drawn($)).not.toContain(WAIT)
})

test('typing a prompt clears a wait left behind', async ($, on) => {
  kit(on)
  await $.turn.start({ text: 'go', turnId: 't1' } as any)
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: {}, permission_mode: 'default' } as any)
  await $.prompt.submit({ text: 'non, fais autrement' } as any)
  expect(await drawn($)).not.toContain(WAIT)
})

test('each way a turn ends has its own state, and only a finished one chimes', async ($, on) => {
  const plays = kit(on)
  const cases: [string, string][] = [['answer', 'Terminé'], ['aborted', 'Interrompu'], ['error', 'Erreur'], ['refusal', 'Refusé par le modèle']]
  for (const [reason, label] of cases) {
    await $.turn.start({ text: 'go', turnId: 't1' } as any)
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: {}, permission_mode: 'default' } as any)
    plays.length = 0
    await $.turn.complete(turn(reason))
    const t = await drawn($)
    expect(t).toContain(label)
    expect(t).not.toContain(WAIT)
    expect(t).not.toContain('En cours')
    expect(plays.includes('sounds/done.wav')).toBe(reason === 'answer')
  }
})

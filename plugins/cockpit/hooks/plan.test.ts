import { expect, mock, test } from 'claude-code/testing'

const txt = (n: any): string => (typeof n === 'string' ? n : (n?.children ?? []).map(txt).join(' '))
const PANEL = { plugin: 'cockpit', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 14, bodyColumns: 80 } } as any

const kit = (on: any) => {
  mock.clock(on, { now: 1_000_000 })
  on('ui.render', async () => null as any)
  on('audio.play', async () => ({ value: {} }) as any)
  on('tool.call', async () => ({ result: 'ok' }) as any)
  on('prompt.submit', async (_$: any, e: any) => ({ text: e.text }) as any)
}
const drawn = async ($: any) => {
  const ui = await $.ui.mount(PANEL)
  const t = txt(await ui.drawn())
  await ui.unmount()
  return t
}

test('a new prompt after a finished plan clears the old plan from the panel', async ($, on) => {
  kit(on)
  await $.tool.call({ tool: 'mcp__cockpit__set_plan', steps: ['Tidy notes.txt', 'Move the drafts'] } as any)
  await $.tool.call({ tool: 'mcp__cockpit__step_done', step: 1 } as any)
  await $.tool.call({ tool: 'mcp__cockpit__step_done', step: 2 } as any)
  expect(await drawn($)).toContain('2/2')
  await $.prompt.submit({ text: 'Create two small PNG charts of the numbers.' } as any)
  const after = await drawn($)
  expect(after).not.toContain('2/2')
  expect(after).not.toContain('Tidy notes.txt')
})

test('a turn that ends well closes its plan, a question or an interruption does not', async ($, on) => {
  kit(on)
  on('turn.complete', async () => ({ text: '' }) as any)
  const end = (answer: string, isAborted = false) => ({ answer, durationMs: 1000, isAborted, turnId: 't1', reason: isAborted ? 'aborted' : 'answer' }) as any
  await $.tool.call({ tool: 'mcp__cockpit__set_plan', steps: ['Tidy notes.txt', 'Move the drafts'] } as any)
  await $.turn.complete(end('Shall I go on?'))
  expect(await drawn($)).not.toContain('2/2')
  await $.turn.complete(end('', true))
  expect(await drawn($)).not.toContain('2/2')
  await $.turn.complete(end('All done.'))
  expect(await drawn($)).toContain('2/2')
})

test('a new prompt during an unfinished plan keeps the plan', async ($, on) => {
  kit(on)
  await $.tool.call({ tool: 'mcp__cockpit__set_plan', steps: ['Tidy notes.txt', 'Move the drafts'] } as any)
  await $.tool.call({ tool: 'mcp__cockpit__step_done', step: 1 } as any)
  await $.prompt.submit({ text: 'Go on.' } as any)
  expect(await drawn($)).toContain('1/2')
})

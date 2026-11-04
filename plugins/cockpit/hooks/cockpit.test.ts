import { expect, mock, test } from 'claude-code/testing'

import { extractAsks } from './asks'
import { applyTask, bar, clock, describe, finishStep, fromTodos, progressSvg, setPlan, stepTime, stepWindow, tick, timed } from './core'

// The engine's clock, answered by an in-memory clock that only moves when a test moves it.
const clockOf = (on: any) => mock.clock(on, { now: 1_000_000 })

test('feed lines are plain French with no tool names and no folder paths', () => {
  expect(describe('Read', { file_path: '/Users/sam/work/draft.md' })).toBe('Reading draft.md')
  expect(describe('Edit', { file_path: '/Users/sam/work/caption.txt' })).toBe('Editing caption.txt')
  expect(describe('Write', { file_path: '/tmp/a/plan.md' })).toBe('Writing plan.md')
  expect(describe('Bash', { command: 'npm test', description: 'lancer les tests' })).toBe('Lancer les tests')
  expect(describe('Bash', { command: 'ls' })).toBe('Running a command')
  expect(describe('WebFetch', { url: 'https:' + '//www.example.com/x' })).toBe('Reading a page on example.com')
  expect(describe('mcp__notion__notion-fetch', {})).toBe('Notion: fetch')
  expect(describe('mcp__something__do_it', {})).toBe('A connected app: do it')
  for (const line of ['Read', 'Edit', 'Grep', 'Glob', 'Bash', 'Agent', 'SomethingNew'].map(t => describe(t, { file_path: '/Users/sam/x/y.md' }))) {
    expect(String(line).includes('/')).toBe(false)
    expect(/\b(Read|Edit|Grep|Glob|Bash|SomethingNew)\b/.test(String(line))).toBe(false)
  }
})

test('its own tools and lookups stay out of the feed', () => {
  expect(describe('mcp__cockpit__set_plan', {})).toBe(null)
  expect(describe('ToolSearch', {})).toBe(null)
})

test('a plan starts on step 1 and the bar fills as steps finish', () => {
  let steps = setPlan(['Write the tests', 'Build it', 'Record it'])
  expect(steps.map(s => s.status)).toEqual(['now', 'todo', 'todo'])
  expect(bar(steps, 12)).toEqual({ fill: '', tip: '', empty: '━'.repeat(12), label: '0/3 · 0%' })
  steps = finishStep(steps, 1)
  expect(steps.map(s => s.status)).toEqual(['done', 'now', 'todo'])
  steps = finishStep(finishStep(steps, 2), 3)
  expect(bar(steps, 12)).toEqual({ fill: '━'.repeat(12), tip: '', empty: '', label: '3/3 · 100%' })
})

test('the bar moves in half cells and always spans the same width', () => {
  for (const total of [1, 3, 5, 7]) {
    let steps = setPlan(Array.from({ length: total }, (_, i) => 'S' + i))
    for (let d = 0; d <= total; d++) {
      const b = bar(steps, 9)
      expect(b.fill.length + b.tip.length + b.empty.length).toBe(9)
      expect(b.tip === '' || b.tip === '╸').toBe(true)
      steps = finishStep(steps, d + 1)
    }
  }
  // 1 of 3 on 9 cells is 3 cells; 1 of 4 on 10 cells is 2.5: two cells and the half tip.
  expect(bar(finishStep(setPlan(['a', 'b', 'c', 'd']), 1), 10)).toEqual({ fill: '━━', tip: '╸', empty: '━'.repeat(7), label: '1/4 · 25%' })
})

test('each step is timed from when it starts to when it is done', () => {
  let steps = setPlan(['A', 'B', 'C'], 0)
  expect(stepTime(steps[0], 12_000)).toBe('12s')
  expect(stepTime(steps[1], 12_000)).toBe('')
  steps = finishStep(steps, 1, 42_000)
  expect(stepTime(steps[0], 999_000)).toBe('42s')
  expect(stepTime(steps[1], 102_000)).toBe('1m 00s')
  expect(stepTime(finishStep(setPlan(['Q'], 0), 1, 400)[0], 9_000)).toBe('') // ticked at once: no "0 s"
  // A TodoWrite plan keeps the times it had and starts the clock of a step that moves on.
  let todos = timed([], fromTodos([{ content: 'X', status: 'completed' }, { content: 'Y', status: 'in_progress' }, { content: 'Z', status: 'pending' }]), 5_000)
  expect(stepTime(todos[0], 9_000)).toBe('') // arrived done: no honest duration
  expect(stepTime(todos[1], 9_000)).toBe('4s')
  todos = timed(todos, fromTodos([{ content: 'X', status: 'completed' }, { content: 'Y', status: 'completed' }, { content: 'Z', status: 'in_progress' }]), 20_000)
  expect(stepTime(todos[1], 99_000)).toBe('15s')
  expect(stepTime(todos[2], 21_000)).toBe('1s')
})

test('a long plan shows a window around the current step, never more rows than the room', () => {
  const labels = Array.from({ length: 8 }, (_, i) => `S${i + 1}`)
  let steps = setPlan(labels)
  let w = stepWindow(steps, 6)
  expect(w.shown.map(s => s.label)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5'])
  expect([w.before, w.after]).toEqual([0, 3])
  for (let i = 1; i <= 4; i++) steps = finishStep(steps, i)
  w = stepWindow(steps, 6)
  expect(w.shown[0].label).toBe('S4')
  expect(w.shown.length + (w.before ? 1 : 0) + (w.after ? 1 : 0)).toBeLessThanOrEqual(6)
  for (let i = 5; i <= 8; i++) steps = finishStep(steps, i)
  w = stepWindow(steps, 6)
  expect(w.after).toBe(0)
  expect(w.shown[w.shown.length - 1].label).toBe('S8')
  expect(stepWindow(setPlan(['A', 'B']), 6)).toEqual({ shown: setPlan(['A', 'B']), before: 0, after: 0 })
})

test('a TodoWrite or Task list becomes the plan by itself', () => {
  expect(fromTodos([{ content: 'A', status: 'completed' }, { content: 'B', status: 'in_progress' }, { content: 'C', status: 'pending' }]).map(s => s.status)).toEqual(['done', 'now', 'todo'])
  let steps = applyTask([], 'TaskCreate', { subject: 'A' })
  steps = applyTask(steps, 'TaskCreate', { subject: 'B' })
  steps = applyTask(steps, 'TaskUpdate', { taskId: '1', status: 'completed' })
  expect(steps).toEqual([{ label: 'A', status: 'done' }, { label: 'B', status: 'todo' }])
})

test('an ask ticks only by id, and the timer reads like a clock', () => {
  const asks = [{ id: 1, text: 'Send me the MP4', done: false }]
  expect(tick(asks, 2, 'x').found).toBe(false)
  const r = tick(asks, 1, '/tmp/out.mp4')
  expect(r.asks[0].done).toBe(true)
  expect(clock(9_400)).toBe('9s')
  expect(clock(83_000)).toBe('1m 23s')
})

test('asks come from what you typed, not from replies like "go"', () => {
  expect(extractAsks('Build the hero mod. Can you send me the MP4 path?')).toEqual(['Build the hero mod.', 'Can you send me the MP4 path?'])
  expect(extractAsks('go')).toEqual([])
})

test('French asks are picked up, French replies are not', () => {
  expect(extractAsks('Toi tu vas t’occuper du design. Je veux que l’interface soit plus claire.\n\nAméliore la structure')).toEqual([
    'Toi tu vas t’occuper du design.', 'Je veux que l’interface soit plus claire.', 'Améliore la structure',
  ])
  expect(extractAsks('Peux-tu vérifier le build ?')).toEqual(['Peux-tu vérifier le build ?'])
  for (const reply of ['oui', 'vas-y', 'parfait !', 'merci', 'continue']) expect(extractAsks(reply)).toEqual([])
})

test('a plan set through its tool shows on the panel state', async ($, on) => {
  clockOf(on)
  const r: any = await $.tool.call({ tool: 'mcp__cockpit__set_plan', steps: ['One', 'Two'] } as any)
  expect(String(r.result ?? '')).toContain('2 steps')
  const d: any = await $.tool.call({ tool: 'mcp__cockpit__step_done', step: 1 } as any)
  expect(String(d.result ?? '')).toContain('Step 1 done')
})

test('the same ask sent twice shows once', async ($, on) => {
  clockOf(on)
  on('ui.render', async () => null as any)
  on('prompt.submit', async (_$: any, e: any) => ({ text: e.text }) as any)
  const prompt = { text: 'Ajoute une barre plus nette. Améliore l’interface.', origin: { kind: 'composer' } } as any
  await $.prompt.submit(prompt)
  await $.prompt.submit(prompt)
  const a: any = await $.tool.call({ tool: 'mcp__cockpit__add_ask', text: 'ajoute une barre plus nette.' } as any)
  expect(String(a.result)).toContain('#1')
  const ui = await $.ui.mount({ plugin: 'cockpit', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 16, bodyColumns: 80 } } as any)
  expect(await ui.find({ type: 'Text', text: /Asks 0\/2/ })).toBeDefined()
  await ui.unmount()
})

test('an ask from another session can be put on the panel and ticked with proof', async ($, on) => {
  clockOf(on)
  const a: any = await $.tool.call({ tool: 'mcp__cockpit__add_ask', text: 'Send me the MP4 path' } as any)
  expect(String(a.result ?? '')).toContain('is on the cockpit')
  const none: any = await $.tool.call({ tool: 'mcp__cockpit__tick_ask', id: 1, proof: '' } as any)
  expect(String(none.result ?? '')).toContain('proof is required')
})

test('the panel draws above the prompt with the plan, the feed and the asks', async ($, on) => {
  clockOf(on)
  on('ui.render', async () => null as any)
  await $.tool.call({ tool: 'mcp__cockpit__set_plan', steps: ['Copy it', 'Test it'] } as any)
  await $.tool.call({ tool: 'mcp__cockpit__add_ask', text: 'Add it to the pack' } as any)
  // The terminal: everything laid out in cells, the bar drawn with ━.
  const ui = await $.ui.mount({
    plugin: 'cockpit', surface: 'terminal', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: true, maxRows: 16, bodyColumns: 80 },
  } as any)
  expect(await ui.find({ type: 'Text', text: /Working/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Mission$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /0\/2 · 0%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Copy it/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Add it to the pack/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Asks 0\/1/ })).toBeDefined()
  await ui.unmount()
  const small = await $.ui.mount({
    plugin: 'cockpit', surface: 'terminal', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: true, maxRows: 3, bodyColumns: 80 },
  } as any)
  expect(await small.find({ type: 'Text', text: /0\/2/ })).toBeDefined()
  expect(await small.find({ type: 'Text', text: /asks 0\/1/ })).toBeDefined()
  await small.unmount()
  // The desktop app: the page-like panel, its bar a picture, no row of ━ to wrap.
  const desk = await $.ui.mount({
    plugin: 'cockpit', surface: 'desktop', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: true, maxRows: 16, bodyColumns: 80 },
  } as any)
  expect(await desk.find({ type: 'Text', text: /Working/ })).toBeDefined()
  expect(await desk.find({ type: 'Svg' })).toBeDefined()
  expect(await desk.find({ type: 'Text', text: /0 of 2 steps · 0%/ })).toBeDefined()
  expect(await desk.find({ type: 'Text', text: /ASKS · 0\/1/ })).toBeDefined()
  expect(await desk.find({ type: 'Text', text: /━/ })).toBeUndefined()
  await desk.unmount()
})

test('the picture bar has one segment per step, and one bar past twelve', () => {
  let steps = setPlan(['a', 'b', 'c'])
  steps = finishStep(steps, 1)
  const svg = progressSvg(steps, '#111111', '#eeeeee')
  expect(svg.startsWith('<svg')).toBe(true)
  // a done (filled), b running (track + half-tinted fill), c to do (track).
  expect((svg.match(/<rect /g) ?? []).length).toBe(4)
  expect(svg).toContain('fill-opacity="0.45"')
  const long = progressSvg(setPlan(Array.from({ length: 20 }, (_, i) => 'S' + i)), '#111111', '#eeeeee')
  expect((long.match(/<rect /g) ?? []).length).toBe(2)
})

test('VS Code gets the band alone, page-like, and no side pane opens', async ($, on) => {
  clockOf(on)
  const opened: any[] = []
  on('ui.open', async (_$: any, e: any) => (opened.push(e), { value: { isPlaced: true } }) as any)
  on('session.surfaces', async () => ({ value: ['vscode'] }) as any)
  on('ui.render', async () => null as any)
  await $.tool.call({ tool: 'mcp__cockpit__set_plan', steps: ['Copy it', 'Test it'] } as any)
  const pane = await $.ui.mount({
    plugin: 'cockpit', surface: 'vscode', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: true, maxRows: 16, bodyColumns: 50 },
  } as any)
  expect(opened).toEqual([])
  expect(await pane.find({ type: 'Text', text: /Copy it/ })).toBeDefined()
  expect(await pane.find({ type: 'Svg' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /━/ })).toBeUndefined()
  expect(await pane.find({ type: 'Text', text: /STEPS/ })).toBeDefined()
  // The mark rides in the label's own Text, so the two can never land on two lines.
  // VS Code puts a nested run of another weight on a line of its own: none may differ.
  const mixed: string[] = []
  const walk = (n: any, weight?: string) => {
    if (!n || typeof n !== 'object') return
    const own = n.props?.weight ?? (n.props?.bold ? 'semibold' : undefined)
    if (n.type === 'Text' && weight && own && own !== weight) mixed.push(own + ' in ' + weight)
    for (const c of n.children ?? []) walk(c, n.type === 'Text' ? own ?? weight : undefined)
  }
  walk(await pane.drawn())
  expect(mixed).toEqual([])
  expect(await pane.find({ type: 'Text', text: /●[\s ]+Copy it/ })).toBeDefined()
  await pane.unmount()
})

test('tool rows read in plain English, with no folder path and no tool name', async ($, on) => {
  clockOf(on)
  on('ui.render', async () => null as any)
  for (const surface of ['terminal', 'desktop'] as const) {
    const edit = await $.ui.mount({
      plugin: 'cockpit', surface, component: 'ToolUse',
      props: { tool_use_id: 't1', tool: 'Edit', input: { file_path: '/Users/sam/Documents/newsletter/intro.md' }, isRunning: false, isErrored: false, isInterrupted: false },
    } as any)
    expect(await edit.find({ type: 'Text', text: /Editing intro\.md/ })).toBeDefined()
    expect(await edit.find({ type: 'Text', text: /\/Users/ })).toBeUndefined()
    await edit.unmount()
    const plan = await $.ui.mount({
      plugin: 'cockpit', surface, component: 'ToolUse',
      props: { tool_use_id: 't2', tool: 'mcp__cockpit__set_plan', input: { steps: ['a', 'b', 'c'] }, isRunning: false, isErrored: false, isInterrupted: false },
    } as any)
    expect(await plan.find({ type: 'Text', text: /Plan: 3 steps/ })).toBeDefined()
    expect(await plan.find({ type: 'Text', text: /set_plan|MCP/ })).toBeUndefined()
    await plan.unmount()
    const early = await $.ui.mount({
      plugin: 'cockpit', surface, component: 'ToolUse',
      props: { tool_use_id: 't3', tool: 'mcp__cockpit__step_done', input: {}, isRunning: true, isErrored: false, isInterrupted: false },
    } as any)
    expect(await early.find({ type: 'Text', text: /Step done/ })).toBeDefined()
    expect(await early.find({ type: 'Text', text: /undefined/ })).toBeUndefined()
    await early.unmount()
  }
})

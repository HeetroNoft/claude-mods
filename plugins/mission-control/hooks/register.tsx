import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Mission } from '../types'
import { extractAsks } from './asks'
import { applyTask, bar, clock, describe, finishStep, fromTodos, progressSvg, setPlan, stepTime, stepWindow, tick, timed } from './core'

// Mission control: one live panel of the turn. The plan fills as a progress bar, a line says
// what Claude is doing in plain French, your asks tick off with proof, and a chime plays when
// the turn ends. Above the prompt in the terminal and desktop app; VS Code has no band there,
// so it gets the same panel in a pane. It reads tool calls and prompts in this session only
// and sends nothing anywhere.

const EMPTY: Mission = { steps: [], feed: [], asks: [], nextAsk: 1, startedMs: 0, nowMs: 0, running: false, doneBanner: '' }
const mission = atom({ plugin: 'mission-control', key: 'mission' } as const, EMPTY)

const FEED = 3
const plainRows = atom({ plugin: 'mission-control', key: 'plainRows' } as const, true)

const PANE = 'mission'
// Surfaces that draw the band above the prompt. Any other one gets the pane.
const BAND_SURFACES = ['terminal', 'desktop']

// How its own tool calls read in the transcript.
const OWN: Record<string, (i: any) => string> = {
  set_plan: i => `Plan : ${(i.steps ?? []).length} étapes`,
  step_done: i => (i.step == null ? 'Étape terminée' : `Étape ${i.step} terminée`),
  add_ask: () => 'Demande ajoutée',
  tick_ask: () => 'Demande validée',
}
const set = ($: any, fn: (m: Mission) => Partial<Mission>) => update($, mission, m => ({ ...(m ?? EMPTY), ...fn(m ?? EMPTY) }))
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, Math.max(1, n - 1))}…` : s)

const TOOLS = [
  {
    name: 'set_plan',
    description: 'Show the plan for this task as a progress bar the user can watch. Give 2 to 6 short steps in the user\'s language, no tool names.',
    inputSchema: { type: 'object', properties: { steps: { type: 'array', items: { type: 'string' } } }, required: ['steps'] },
  },
  {
    name: 'step_done',
    description: 'Mark a plan step as finished (1-based). The bar fills and the next step lights up.',
    inputSchema: { type: 'object', properties: { step: { type: 'number' } }, required: ['step'] },
  },
  {
    name: 'add_ask',
    description: "Put an ask on the panel that did not come from a typed prompt (for example one sent by another session).",
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  },
  {
    name: 'tick_ask',
    description: "Tick off one of the user's asks once it is really done. Give the ask id and the proof.",
    inputSchema: { type: 'object', properties: { id: { type: 'number' }, proof: { type: 'string' } }, required: ['id', 'proof'] },
  },
]

function reminder(m: Mission) {
  const open = m.asks.filter(a => !a.done)
  const lines = [
    'MISSION CONTROL (mission-control mod). The user watches a live panel of this turn.',
    'For any task of 2+ steps, first call mcp__mission-control__set_plan with short plain steps in the user\'s language, then mcp__mission-control__step_done in the same round as real work, never in a round of their own; skip the last step, the end of the turn closes the plan.',
  ]
  if (open.length) {
    lines.push(`Asks on the panel: ${open.map(a => `#${a.id} "${short(a.text, 70)}"`).join('; ')}.`)
    lines.push('Asks sent by another session go on with mcp__mission-control__add_ask. Call mcp__mission-control__tick_ask with the id and proof from this session when one is done. Never tick without proof.')
  }
  return lines.join('\n')
}

// The same text twice (a prompt sent again, an ask added by hand that was typed too) is one ask.
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

async function addAsks($: any, all: string[]) {
  const had = (await read($, mission)).asks
  const texts = all.filter((t, i) => !had.some(a => !a.done && same(a.text, t)) && all.findIndex(u => same(u, t)) === i)
  const first = (await read($, mission)).nextAsk
  if (!texts.length) return had.find(a => !a.done && all.some(t => same(a.text, t)))?.id ?? first
  await set($, m => ({
    asks: [...m.asks, ...texts.map((text, i) => ({ id: m.nextAsk + i, text, done: false }))].slice(-12),
    nextAsk: m.nextAsk + texts.length,
  }))
  return first
}

let timer: { cancel: () => void } | undefined

// Starts the panel's clock. Called from turn.start and, as a fallback, from the first tool
// call: in a live run (03/10/2026) the panel stayed hidden on a turn woken by a background job.
async function start($: any) {
  const now = await $.clock.now()
  await set($, () => ({ running: true, startedMs: now, nowMs: now, doneBanner: '', outcome: undefined, feed: [], waiting: undefined, waitingTool: undefined }))
  tickClock($)
}

function tickClock($: any) {
  timer?.cancel()
  timer = $.clock.every(1000, () => void $.clock.now().then(t => set($, () => ({ nowMs: t }))))
}

// A dialog the person must answer. Only these put the panel in the "your turn" state: an ask
// in tool.check is no such thing, since in auto mode the classifier answers it, not the person.
const PERSON_TOOLS: Record<string, string> = {
  AskUserQuestion: 'Répondre à la question de Claude',
  ExitPlanMode: 'Valider le plan proposé',
}
// Modes in which the person is not the one asked: in auto mode the classifier answers the
// request (the hook cannot tell its rare fallback to a dialog apart), and the other two never ask.
const NO_DIALOG_MODES = ['auto', 'bypassPermissions', 'dontAsk']

const waitOn = ($: any, tool: string, text: string) => set($, () => ({ waiting: text, waitingTool: tool }))
const waitOff = ($: any, tool?: string) =>
  set($, m => (m.waiting && (!tool || !m.waitingTool || m.waitingTool === tool) ? { waiting: undefined, waitingTool: undefined } : {}))

// Opens the pane once per session where a surface cannot draw the band (VS Code, mobile).
// Closed by the person, it stays closed until /mission-panel.
let paneOffered = false
async function offerPane($: any) {
  if (paneOffered) return
  paneOffered = true
  const surfaces: readonly string[] = await $.session.surfaces().catch(() => [])
  if (surfaces.some(s => !BAND_SURFACES.includes(s))) await $.ui.open({ id: PANE, title: 'Mission' }).catch(() => undefined)
}

// Setup runs once: at session start or, after /reload-plugins (which does not fire
// session.start), on the first prompt or tool call.
let ready: Promise<void> | undefined
function setup($: any): Promise<void> {
  ready ??= doSetup($).catch(() => undefined) // a missing engine call must not stop the hooks
  return ready
}
async function doSetup($: any) {
  for (const t of TOOLS) await $.tool.register(t)
  await $.command.register({ name: 'mission', description: 'Vider le panneau Mission control' })
  await $.command.register({ name: 'mission-panel', description: 'Ouvrir Mission control dans un panneau latéral' })
  await $.command.register({ name: 'mission-rows', description: 'Activer ou couper les lignes d’outils en français clair' })
  // After a reload the clock's timer is gone while a turn may still run: start it again.
  if ((await read($, mission)).running) tickClock($)
}

// ---- drawing ----

type Phase = 'idle' | 'working' | 'waiting' | 'done' | 'stopped' | 'error' | 'refusal'

function phaseOf(m: Mission): Phase {
  if (m.running) return m.waiting ? 'waiting' : 'working'
  if (m.outcome && m.outcome !== 'done') return m.outcome
  return m.doneBanner ? 'done' : 'idle'
}

// One colour per state, from the person's theme, so the panel reads the same in light and dark.
const LOOK: Record<Phase, { glyph: string; label: string; color: string }> = {
  idle: { glyph: '○', label: 'En attente', color: 'inactive' },
  working: { glyph: '●', label: 'En cours', color: 'claude' },
  waiting: { glyph: '⚑', label: 'Action requise de votre part', color: 'warning' },
  done: { glyph: '✓', label: 'Terminé', color: 'success' },
  stopped: { glyph: '■', label: 'Interrompu', color: 'inactive' },
  error: { glyph: '✕', label: 'Erreur', color: 'error' },
  refusal: { glyph: '✕', label: 'Refusé par le modèle', color: 'error' },
}

const MARK = { done: '✓', now: '›', todo: '○' } as const
// In a proportional face › is a sliver beside ✓ and ○; ● pairs with ○ at the same size.
const GMARK = { done: '✓', now: '●', todo: '○' } as const

// The bar's fill: the accent while work goes on, green once done, the state's own colour when
// it needs you or went wrong. The rest of the track is the same line, faint.
const fillColor = (p: Phase) => (p === 'working' ? 'claude' : p === 'done' || p === 'idle' ? 'success' : LOOK[p].color)

function Progress({ el, m, phase, cells, label = true }: { el: any; m: Mission; phase: Phase; cells: number; label?: boolean }) {
  const { Text } = el
  const b = bar(m.steps, cells)
  return (
    <Text wrap="truncate-end">
      <Text color={fillColor(phase)}>{b.fill + b.tip}</Text>
      <Text color="subtle" dimColor>{b.empty}</Text>
      {label && <Text bold>{`  ${b.label}`}</Text>}
    </Text>
  )
}

// What the "Maintenant" row says.
function activity(m: Mission, phase: Phase) {
  if (phase === 'waiting') return m.waiting ?? ''
  if (phase !== 'working' && phase !== 'idle') return m.doneBanner
  return m.feed[0] ?? (m.running ? 'Réflexion…' : 'Rien en cours')
}

// An SVG cannot read the person's theme, so the bar takes fixed colours chosen to read on a
// light and a dark editor alike, one per theme key the text uses.
const HEX: Record<string, string> = { claude: '#D97757', success: '#3FA266', warning: '#D9A021', error: '#E5534B', inactive: '#8B949E' }
const TRACK = 'rgba(139,148,158,0.28)'

// The panel for surfaces that draw text in a proportional face and lay boxes out like a page
// (VS Code, the desktop app, mobile). Nothing here is counted in character cells: rows flex to
// the pane's width, the bar is a picture, and each section has its own caption above it.
function GraphicPanel({ el, m }: { el: any; m: Mission }) {
  const { Box, Text, Svg } = el
  const phase = phaseOf(m)
  const look = LOOK[phase]
  const n = m.steps.length
  const done = m.steps.filter(s => s.status === 'done').length
  const right = m.running ? clock(m.nowMs - m.startedMs) : m.startedMs ? `en ${clock(m.nowMs - m.startedMs)}` : ''
  const win = stepWindow(m.steps, 7)
  const asks = [...m.asks.filter(a => !a.done).slice(0, 4), ...m.asks.filter(a => a.done).slice(-2)]
  const caption = (t: string) => <Text size="caption" weight="medium" color="inactive">{t.toUpperCase()}</Text>
  // One list row. The mark and the label are one Text, so they can never land on two lines
  // (VS Code wrapped a two-column row, the mark above its label: 29/10/2026); the mark is a
  // monospaced run, so ✓ ● ○ take the same width and every label starts at the same x.
  // A time sits on the right in a row that may not wrap, the label shrinking for it.
  // The mark inherits the line's weight: VS Code lays a nested run of another weight out as a
  // block of its own, which put a semibold label under its mark (29/10/2026).
  const item = (key: string, mark: string, markColor: string, label: string, look: { color?: string; weight?: string } = {}, time?: string) => {
    const line = (
      <Text wrap="truncate-end" color={look.color ?? 'text'} weight={look.weight ?? 'regular'}>
        <Text mono color={markColor}>{`${mark} `}</Text>
        {` ${label}`}
      </Text>
    )
    if (!time) return <Box key={key}>{line}</Box>
    return (
      <Box key={key} flexDirection="row" flexWrap="nowrap" justifyContent="space-between" gap="sm">
        <Box flexShrink={1} minWidth={0}>{line}</Box>
        <Box flexShrink={0}><Text size="footnote" color="inactive" tabular>{time}</Text></Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" width="100%">
      {item('head', look.glyph, look.color, look.label, { color: look.color, weight: 'semibold' }, right)}

      {n > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Svg source={progressSvg(m.steps, HEX[fillColor(phase)] ?? HEX.claude, TRACK)} alt={`Progression : ${done} étape${done > 1 ? 's' : ''} sur ${n}`} height={8} />
          <Text size="footnote" color="inactive" tabular>{`${done} sur ${n} étapes · ${Math.round((done / n) * 100)} %`}</Text>
        </Box>
      )}

      {n > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {caption('Étapes')}
          {win.before > 0 && item('before', GMARK.done, 'success', `${win.before} étape${win.before > 1 ? 's' : ''} terminée${win.before > 1 ? 's' : ''}`, { color: 'inactive' })}
          {win.shown.map((st, i) => {
            const color = st.status === 'done' ? 'inactive' : st.status === 'now' ? look.color : 'text'
            return item(`s${win.before + i}`, GMARK[st.status], st.status === 'done' ? 'success' : st.status === 'now' ? look.color : 'inactive',
              st.label, { color, weight: st.status === 'now' ? 'semibold' : 'regular' }, stepTime(st, m.nowMs))
          })}
          {win.after > 0 && item('after', '…', 'inactive', `${win.after} autre${win.after > 1 ? 's' : ''} à venir`, { color: 'inactive' })}
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        {caption('Maintenant')}
        <Text wrap="truncate-end" color={phase === 'waiting' ? 'warning' : phase === 'working' ? 'text' : look.color} weight={phase === 'waiting' ? 'semibold' : 'regular'}>
          {activity(m, phase)}
        </Text>
      </Box>

      {asks.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {caption(`Demandes · ${m.asks.filter(a => a.done).length}/${m.asks.length}`)}
          {asks.map(a => item(`a${a.id}`, a.done ? GMARK.done : GMARK.todo, a.done ? 'success' : 'inactive',
            a.text, { color: a.done ? 'inactive' : 'text' }))}
          {m.asks.length > asks.length && item('more', '+', 'inactive', `${m.asks.length - asks.length} de plus`, { color: 'inactive' })}
        </Box>
      )}
    </Box>
  )
}

// The full panel: state and time, progress, the steps, what is happening now, your asks.
// Every section has a label in the same left column, so the eye finds each one at once.
function Panel({ el, m, width, framed }: { el: any; m: Mission; width: number; framed: boolean }) {
  const { Box, Text } = el
  const phase = phaseOf(m)
  const look = LOOK[phase]
  const inner = framed ? width - 4 : width
  const n = m.steps.length
  const done = m.steps.filter(s => s.status === 'done').length
  const right = m.running ? clock(m.nowMs - m.startedMs) : m.startedMs ? `en ${clock(m.nowMs - m.startedMs)}` : ''
  const win = stepWindow(m.steps, 6)
  const asks = [...m.asks.filter(a => !a.done).slice(0, 3), ...m.asks.filter(a => a.done).slice(-2)]
  const asksDone = m.asks.filter(a => a.done).length
  // Section titles share one left column, so each section starts where the eye expects it.
  const LABEL = 13
  const TIME = 11 // "12 min 05 s"
  const title = (t: string) => <Box width={LABEL} flexShrink={0}><Text color="inactive">{t}</Text></Box>

  const body = (
    <Box flexDirection="column" width={inner}>
      {/* State on the left, the turn's time on the right. */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text>
          <Text bold color={look.color}>{`${look.glyph} ${look.label}`}</Text>
          <Text color="inactive">{'   Mission'}</Text>
        </Text>
        <Text color="inactive">{right}</Text>
      </Box>

      {n > 0 && (
        <Box marginTop={1}>
          {Progress({ el, m, phase, cells: Math.max(10, inner - `  ${done}/${n} · 100 %`.length) })}
        </Box>
      )}

      {/* The steps, each with how long it took, or has taken so far, on the right. */}
      {n > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {win.before > 0 && <Text color="inactive">{`✓ ${win.before} étape${win.before > 1 ? 's' : ''} terminée${win.before > 1 ? 's' : ''}`}</Text>}
          {win.shown.map((st, i) => {
            const t = stepTime(st, m.nowMs)
            const color = st.status === 'done' ? 'inactive' : st.status === 'now' ? look.color : 'text'
            return (
              <Box key={`s${win.before + i}`} flexDirection="row">
                <Box flexGrow={1} flexShrink={1}>
                  <Text wrap="truncate-end" color={color} bold={st.status === 'now'}>
                    <Text color={st.status === 'done' ? 'success' : color}>{`${MARK[st.status]} `}</Text>
                    {st.label}
                  </Text>
                </Box>
                {t && <Box width={TIME} flexShrink={0} justifyContent="flex-end"><Text color="inactive">{t}</Text></Box>}
              </Box>
            )
          })}
          {win.after > 0 && <Text color="inactive">{`… ${win.after} autre${win.after > 1 ? 's' : ''} à venir`}</Text>}
        </Box>
      )}

      <Box flexDirection="row" marginTop={1}>
        {title('Maintenant')}
        <Text wrap="truncate-end" color={phase === 'waiting' ? 'warning' : phase === 'working' ? 'text' : look.color} bold={phase === 'waiting'}>
          {activity(m, phase)}
        </Text>
      </Box>

      {asks.length > 0 && (
        <Box flexDirection="row">
          {title(`Demandes ${asksDone}/${m.asks.length}`)}
          <Box flexDirection="column" flexShrink={1}>
            {asks.map(a => (
              <Text key={`a${a.id}`} wrap="truncate-end" color={a.done ? 'inactive' : 'text'}>
                <Text color={a.done ? 'success' : 'inactive'}>{a.done ? '✓ ' : '○ '}</Text>
                {short(a.text, Math.max(10, inner - LABEL - 2))}
              </Text>
            ))}
            {m.asks.length > asks.length && <Text color="inactive">{`+ ${m.asks.length - asks.length} de plus`}</Text>}
          </Box>
        </Box>
      )}
    </Box>
  )

  if (!framed) return body
  // A quiet frame like the prompt's; it takes the state's colour only when you are needed.
  return (
    <Box borderStyle="round" borderColor={phase === 'waiting' ? 'warning' : 'promptBorder'} borderDimColor={phase !== 'waiting'} paddingX={1} width={width}>
      {body}
    </Box>
  )
}

// A short window leaves the band 2 or 3 rows: the state with the bar, then what is happening.
function Compact({ el, m, width }: { el: any; m: Mission; width: number }) {
  const { Box, Text } = el
  const phase = phaseOf(m)
  const look = LOOK[phase]
  const n = m.steps.length
  const b = bar(m.steps, 1)
  const current = m.steps.find(s => s.status === 'now')
  const tail = [
    m.asks.length ? `demandes ${m.asks.filter(a => a.done).length}/${m.asks.length}` : '',
    m.startedMs ? clock(m.nowMs - m.startedMs) : '',
  ].filter(Boolean).join('  ·  ')
  return (
    <Box flexDirection="column" width={width}>
      <Text wrap="truncate-end">
        <Text bold color={look.color}>{`${look.glyph} ${look.label}  `}</Text>
        {n > 0 && Progress({ el, m, phase, cells: Math.max(8, Math.min(20, width - 60)), label: false })}
        {n > 0 && <Text>{`  ${b.label}`}</Text>}
        {current && phase !== 'done' && <Text color={look.color}>{`  › ${current.label}`}</Text>}
      </Text>
      <Text wrap="truncate-end">
        <Text color="inactive">{'Maintenant  '}</Text>
        <Text color={phase === 'waiting' ? 'warning' : 'text'}>{activity(m, phase)}</Text>
        {tail && <Text color="inactive">{`  ·  ${tail}`}</Text>}
      </Text>
    </Box>
  )
}

const hasContent = (m: Mission) => m.running || !!m.doneBanner || m.steps.length > 0 || m.asks.length > 0 || m.feed.length > 0

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await setup($)
    return next(e)
  })

  on('command.run', { command: 'mission-rows' }, async $ => {
    await setup($)
    await update($, plainRows, v => !v)
    return { text: (await read($, plainRows)) ? 'Lignes d’outils en français clair : activées.' : 'Lignes d’outils en français clair : coupées, les lignes complètes sont de retour.' }
  })

  on('command.run', { command: 'mission' }, async $ => {
    await setup($)
    await update($, mission, () => EMPTY)
    return { text: 'Panneau Mission control vidé.' }
  })

  on('command.run', { command: 'mission-panel' }, async $ => {
    await setup($)
    paneOffered = true
    await $.ui.open({ id: PANE, title: 'Mission' })
    return { text: 'Mission control est ouvert dans un panneau.' }
  })

  on('turn.start', async ($, e, next) => {
    await setup($)
    await start($)
    await offerPane($)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await setup($)
    // A new prompt after a finished plan is a new task: the old plan leaves the panel.
    // An unfinished plan stays, because "go on" or a correction continues the same task.
    const before = await read($, mission)
    if (before.steps.length && before.steps.every(st => st.status === 'done')) await set($, () => ({ steps: [] }))
    await waitOff($) // the person typed: nothing waits on them any more
    const typed = (e as any).origin?.kind === 'composer'
    const texts = typed ? extractAsks(e.text) : []
    if (texts.length) await addAsks($, texts)
    return next({ ...e, context: [...(e.context ?? []), reminder(await read($, mission))] })
  })

  on('tool.call', { tool: 'mcp__mission-control__add_ask' }, async ($, e: any) => {
    await setup($)
    const text = String(e.text ?? '').trim()
    if (!text) return { result: 'Nothing added: text was empty.' }
    const id = await addAsks($, [text])
    return { result: `Ask #${id} is on the panel.` }
  })

  on('tool.call', { tool: 'mcp__mission-control__set_plan' }, async ($, e: any) => {
    await setup($)
    if (!(await read($, mission)).running) await start($)
    const steps = setPlan(Array.isArray(e.steps) ? e.steps.slice(0, 8) : [], await $.clock.now())
    // A new plan is a new job: asks already ticked off drop away, open ones stay.
    await set($, m2 => ({ steps, asks: m2.asks.filter(a => !a.done) }))
    return { result: `Plan shown with ${steps.length} steps.` }
  })

  on('tool.call', { tool: 'mcp__mission-control__step_done' }, async ($, e: any) => {
    await setup($)
    const m = await read($, mission)
    const n = Number(e.step)
    if (!m.steps[n - 1]) return { result: `No step ${n}.` }
    const now = await $.clock.now()
    await set($, m2 => ({ steps: finishStep(m2.steps, n, now) }))
    await $.audio.play({ asset: 'sounds/step.wav' }).catch(() => undefined)
    return { result: `Step ${n} done.` }
  })

  on('tool.call', { tool: 'mcp__mission-control__tick_ask' }, async ($, e: any) => {
    await setup($)
    const proof = String(e.proof ?? '').trim()
    if (!proof) return { result: 'Not ticked: proof is required.' }
    const r = tick((await read($, mission)).asks, Number(e.id), proof)
    if (r.found) await set($, () => ({ asks: r.asks }))
    return { result: r.found ? `Ask #${e.id} ticked.` : `No ask #${e.id}.` }
  })

  // A permission dialog is about to be put to the person: the only sure sign they are needed.
  // tool.check's "ask" is not one: it goes to the mode's decider, the classifier in auto mode.
  // A settings hook beneath may still answer it, and then no dialog shows.
  on('classic.PermissionRequest', async ($, e: any, next) => {
    await setup($)
    const r: any = await next(e)
    if (r?.decision || NO_DIALOG_MODES.includes(String(e.permission_mode ?? ''))) return r
    const tool = String(e.tool_name ?? '')
    const what = describe(tool, e.tool_input ?? {}) || 'un outil'
    await waitOn($, tool, `Autoriser : ${what.charAt(0).toLowerCase()}${what.slice(1)}`)
    await $.audio.play({ asset: 'sounds/ask.wav' }).catch(() => undefined)
    return r
  })

  on('tool.call', async ($, e: any, next) => {
    await setup($)
    if (!(await read($, mission)).running) await start($)
    const line = describe(e.tool, e)
    if (line) await set($, m => ({ feed: [line, ...m.feed.filter(f => f !== line)].slice(0, FEED) }))
    if (e.tool === 'TodoWrite' || e.tool === 'TaskCreate' || e.tool === 'TaskUpdate') {
      const now = await $.clock.now()
      await set($, m => ({ steps: timed(m.steps, e.tool === 'TodoWrite' ? fromTodos(e.todos) : applyTask(m.steps, e.tool, e), now) }))
    }
    // A question or a plan to approve waits on the person whatever the mode.
    const person = PERSON_TOOLS[e.tool]
    if (person) {
      await waitOn($, e.tool, person)
      await $.audio.play({ asset: 'sounds/ask.wav' }).catch(() => undefined)
    }
    try {
      return await next(e)
    } finally {
      // Allowed, refused or answered: the dialog for this tool is over either way.
      await waitOff($, e.tool)
    }
  })

  on('turn.complete', async ($, e, next) => {
    await setup($)
    if (e.agentId) return next(e)
    timer?.cancel()
    timer = undefined
    const m = await read($, mission)
    const now = await $.clock.now()
    const reason = (e as any).reason ?? (e.isAborted ? 'aborted' : 'answer')
    const outcome = reason === 'aborted' ? 'stopped' : reason === 'error' ? 'error' : reason === 'refusal' ? 'refusal' : 'done'
    const head = { done: 'Terminé', stopped: 'Interrompu', error: 'Arrêté par une erreur', refusal: 'Refusé' }[outcome]
    // a turn that ends well closes its plan, so nobody has to tick the last step; a question leaves it open
    const closed = outcome === 'done' && !String(e.answer ?? '').trim().endsWith('?')
    const steps = closed ? m.steps.map(s => ({ ...s, status: 'done' as const })) : m.steps
    const parts = [`${head} après ${clock(now - m.startedMs)}`]
    if (steps.length) parts.push(`${steps.filter(s => s.status === 'done').length}/${steps.length} étapes`)
    if (m.asks.length) parts.push(`${m.asks.filter(a => a.done).length}/${m.asks.length} demandes`)
    await set($, () => ({ steps, running: false, nowMs: now, doneBanner: parts.join(' · '), outcome, waiting: undefined, waitingTool: undefined }))
    // The chime means "done": an interrupted, failed or refused turn ends quietly.
    if (outcome === 'done') await $.audio.play({ asset: 'sounds/done.wav' }).catch(() => undefined)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = await read($, mission)
    const p = e.props as any
    if (p.hasSurvey || !hasContent(m)) return next(e)
    const el = $.ui.resolve(e)
    // Only the terminal lays text out in cells; the desktop app gets the page-like panel.
    if (e.surface !== 'terminal') return GraphicPanel({ el, m })
    const width = Math.max(30, Math.min(80, p.bodyColumns ?? 80))
    // The full panel takes up to 15 rows; a short window gets the two-line form.
    return (p.maxRows ?? 12) < 10 ? Compact({ el, m, width }) : Panel({ el, m, width, framed: true })
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const m = await read($, mission)
    const el = $.ui.resolve(e)
    const terminal = e.surface === 'terminal'
    const width = Math.max(24, (e.props as any).bodyColumns ?? 60)
    if (!hasContent(m)) {
      const { Box, Text } = el
      return (
        <Box flexDirection="column" width={terminal ? width : '100%'}>
          <Text color="inactive" weight="semibold">○  Aucune tâche en cours</Text>
          <Text color="inactive" size="footnote" wrap="wrap">Le plan, l’activité de Claude et vos demandes s’afficheront ici dès le prochain message.</Text>
        </Box>
      )
    }
    return terminal ? Panel({ el, m, width, framed: false }) : GraphicPanel({ el, m })
  })

  // Plain rows in the transcript: "Modification de intro.md" in place of a tool name and a
  // full folder path. /mission-rows turns them off and puts the engine's own rows back.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const p = e.props as any
    if (!(await read($, plainRows))) return next(e)
    const own = OWN[String(p.tool).replace(/^mcp__mission-control__/, '')]
    const line = own ? own(p.input ?? {}) : describe(String(p.tool), p.input ?? {})
    if (!line || String(p.tool).startsWith('mcp__open-loops__')) return next(e)
    const { Text } = $.ui.resolve(e)
    return (
      <Text>
        <Text color={p.isErrored ? 'error' : p.isRunning ? 'claude' : 'success'}>● </Text>
        <Text bold={!!own}>{line}</Text>
      </Text>
    )
  })

  // Its own tools' results say nothing a reader needs: the panel already shows them.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const p = e.props as any
    if (!(await read($, plainRows)) || !String(p.tool ?? '').startsWith('mcp__mission-control__')) return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}

import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Card, Mission, State, Tab } from '../types'
import { extractAsks } from './asks'
import { ago, bar as slide, clean, liveOthers, order, rowTime, summary, updateCard } from './cards'
import { applyTask, bar, clock, describe, finishStep, fromTodos, progressSvg, setPlan, stepTime, stepWindow, tick, timed } from './core'

// Cockpit: one band above the prompt, on every surface (terminal, VS Code, the desktop app, the
// web). Its Mission tab is this turn: the plan fills as a progress bar, a line says what Claude
// is doing in plain words, your asks tick off with proof, and a chime plays when the turn ends.
// Its Sessions tab lists your other open sessions, each from the card it writes to
// ~/.claude/session-cards/, with an Ask button that only drafts a line in your prompt.
// Nothing is sent anywhere.

const EMPTY: Mission = { steps: [], feed: [], asks: [], nextAsk: 1, startedMs: 0, nowMs: 0, running: false, doneBanner: '' }
const mission = atom({ plugin: 'cockpit', key: 'mission' } as const, EMPTY)

const FEED = 3
const plainRows = atom({ plugin: 'cockpit', key: 'plainRows' } as const, true)
const tab = atom({ plugin: 'cockpit', key: 'tab' } as const, 'mission' as Tab)
const others = atom({ plugin: 'cockpit', key: 'others' } as const, [] as Card[])
const isHidden = atom({ plugin: 'cockpit', key: 'isHidden' } as const, false)
// The band folded to one line, like an accordion; kept for this session only ($.state).
const folded = atom({ plugin: 'cockpit', key: 'folded' } as const, false)
const nowMs = atom({ plugin: 'cockpit', key: 'nowMs' } as const, 0)

// How its own tool calls read in the transcript.
const OWN: Record<string, (i: any) => string> = {
  set_plan: i => `Plan: ${(i.steps ?? []).length} steps`,
  step_done: i => (i.step == null ? 'Step done' : `Step ${i.step} done`),
  add_ask: () => 'Ask added',
  tick_ask: () => 'Ask ticked off',
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
    description: "Put an ask on the cockpit that did not come from a typed prompt (for example one sent by another session).",
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
    'COCKPIT (cockpit mod). The user watches a live band of this turn.',
    'For any task of 2+ steps, first call mcp__cockpit__set_plan with short plain steps in the user\'s language, then mcp__cockpit__step_done in the same round as real work, never in a round of their own; skip the last step, the end of the turn closes the plan.',
  ]
  if (open.length) {
    lines.push(`Asks on the cockpit: ${open.map(a => `#${a.id} "${short(a.text, 70)}"`).join('; ')}.`)
    lines.push('Asks sent by another session go on with mcp__cockpit__add_ask. Call mcp__cockpit__tick_ask with the id and proof from this session when one is done. Never tick without proof.')
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

// Starts the band's clock. Called from turn.start and, as a fallback, from the first tool
// call: in a live run (03/10/2026) the band stayed hidden on a turn woken by a background job.
async function start($: any) {
  const now = await $.clock.now()
  await set($, () => ({ running: true, startedMs: now, nowMs: now, doneBanner: '', outcome: undefined, feed: [], waiting: undefined, waitingTool: undefined }))
  tickClock($)
}

function tickClock($: any) {
  timer?.cancel()
  timer = $.clock.every(1000, () => void $.clock.now().then((t: number) => set($, () => ({ nowMs: t }))))
}

// A dialog the person must answer. Only these put the band in the "your turn" state: an ask
// in tool.check is no such thing, since in auto mode the classifier answers it, not the person.
const PERSON_TOOLS: Record<string, string> = {
  AskUserQuestion: 'Answer Claude’s question',
  ExitPlanMode: 'Approve the proposed plan',
}
// Modes in which the person is not the one asked: in auto mode the classifier answers the
// request (the hook cannot tell its rare fallback to a dialog apart), and the other two never ask.
const NO_DIALOG_MODES = ['auto', 'bypassPermissions', 'dontAsk']

const waitOn = ($: any, tool: string, text: string) => set($, () => ({ waiting: text, waitingTool: tool }))
const waitOff = ($: any, tool?: string) =>
  set($, m => (m.waiting && (!tool || !m.waitingTool || m.waitingTool === tool) ? { waiting: undefined, waitingTool: undefined } : {}))

// ---- other sessions ----
// Each session writes one card; the Sessions tab reads every card but its own.

let dir = ''
let selfId = ''
let mine: Card | null = null

async function scan($: any) {
  if (!dir) return
  const now = await $.clock.now()
  const entries = await $.fs.list(dir).catch(() => [])
  const cards: Card[] = []
  for (const e of entries) {
    if (e.kind !== 'file' || !e.name.endsWith('.json')) continue
    try {
      cards.push(JSON.parse(await $.fs.read(`${dir}/${e.name}`)))
    } catch { /* a half-written card is skipped until the next scan */ }
  }
  const list = liveOthers(cards, selfId, now)
  // Say once, by name, when another session starts waiting for you.
  const before = new Map((await read($, others)).map((c: Card) => [c.id, c.state]))
  for (const c of list) if (c.state === 'needs' && before.has(c.id) && before.get(c.id) !== 'needs') $.ui.toast(`${c.place} is waiting on you${c.waitingFor ? `: ${c.waitingFor}` : ''}`)
  await update($, others, () => list)
  await update($, nowMs, () => now)
}

// This session's own state goes on its card, so the other sessions can show it.
async function mark($: any, state: State, waitingFor?: string) {
  if (!mine) return
  const now = await $.clock.now()
  const startMs = state === 'running' && mine.state !== 'running' && mine.state !== 'needs' ? now : mine.startMs
  mine = { ...mine, state, startMs, endMs: state === 'done' ? now : undefined, waitingFor, updatedMs: now }
  await $.fs.write(`${dir}/${selfId}.json`, JSON.stringify(mine)).catch(() => undefined)
}

async function writeMine($: any, prompt: string) {
  const now = await $.clock.now()
  mine = updateCard(mine, selfId, await $.session.cwd(), prompt, now)
  await $.fs.write(`${dir}/${selfId}.json`, JSON.stringify(mine))
}

// Setup runs once: at session start or, after /reload-plugins (which does not fire
// session.start), on the first prompt or tool call.
let ready: Promise<void> | undefined
function setup($: any): Promise<void> {
  ready ??= doSetup($).catch(() => undefined) // a missing engine call must not stop the hooks
  return ready.then(() => setupCards($))
}
async function doSetup($: any) {
  for (const t of TOOLS) await $.tool.register(t)
  await $.command.register({ name: 'cockpit', description: 'Clear the Mission tab of the cockpit' })
  await $.command.register({ name: 'cockpit-rows', description: 'Turn the plain-English tool rows on or off' })
  await $.command.register({ name: 'cockpit-fold', description: 'Fold the cockpit to one line, or open it again' })
  await $.command.register({ name: 'cockpit-sessions', description: 'List your other open sessions, and show or hide their tab' })
  // After a reload the clock's timer is gone while a turn may still run: start it again.
  if ((await read($, mission)).running) tickClock($)
}

// The session cards set up apart, and again at the next event if they failed, so a missing
// HOME or session id never leaves the Sessions tab empty for the rest of the session.
let cardsReady: Promise<void> | undefined
let cardTimers: { cancel: () => void }[] = []
async function setupCards($: any): Promise<void> {
  // Another session id means another session in the same module (a test run): start over.
  if (cardsReady && selfId && (await $.session.id().catch(() => selfId)) !== selfId) cardsReady = undefined
  cardsReady ??= doCards($).catch(() => { cardsReady = undefined })
  return cardsReady
}
async function doCards($: any) {
  const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE')) || '' // HOME can be unset on Windows
  dir = `${home.replace(/\\/g, '/')}/.claude/session-cards`
  selfId = await $.session.id()
  await scan($)
  for (const t of cardTimers) t.cancel()
  cardTimers = [$.clock.every(2000, () => void scan($))]
  // Timers and the sliding block move between scans only while another session is running.
  cardTimers.push($.clock.every(500, async () => {
    if (!(await read($, others)).some((c: Card) => c.state === 'running')) return
    const t = await $.clock.now()
    await update($, nowMs, () => t)
  }))
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
  idle: { glyph: '○', label: 'Idle', color: 'inactive' },
  working: { glyph: '●', label: 'Working', color: 'claude' },
  waiting: { glyph: '⚑', label: 'Your turn', color: 'warning' },
  done: { glyph: '✓', label: 'Done', color: 'success' },
  stopped: { glyph: '■', label: 'Stopped', color: 'inactive' },
  error: { glyph: '✕', label: 'Error', color: 'error' },
  refusal: { glyph: '✕', label: 'Refused by the model', color: 'error' },
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

// What the "Now" row says.
function activity(m: Mission, phase: Phase) {
  if (phase === 'waiting') return m.waiting ?? ''
  if (phase !== 'working' && phase !== 'idle') return m.doneBanner
  return m.feed[0] ?? (m.running ? 'Thinking…' : 'Nothing running')
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
  const right = m.running ? clock(m.nowMs - m.startedMs) : m.startedMs ? `in ${clock(m.nowMs - m.startedMs)}` : ''
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
          <Svg source={progressSvg(m.steps, HEX[fillColor(phase)] ?? HEX.claude, TRACK)} alt={`Progress: ${done} of ${n} steps`} height={8} />
          <Text size="footnote" color="inactive" tabular>{`${done} of ${n} steps · ${Math.round((done / n) * 100)}%`}</Text>
        </Box>
      )}

      {n > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {caption('Steps')}
          {win.before > 0 && item('before', GMARK.done, 'success', `${win.before} step${win.before > 1 ? 's' : ''} done`, { color: 'inactive' })}
          {win.shown.map((st, i) => {
            const color = st.status === 'done' ? 'inactive' : st.status === 'now' ? look.color : 'text'
            return item(`s${win.before + i}`, GMARK[st.status], st.status === 'done' ? 'success' : st.status === 'now' ? look.color : 'inactive',
              st.label, { color, weight: st.status === 'now' ? 'semibold' : 'regular' }, stepTime(st, m.nowMs))
          })}
          {win.after > 0 && item('after', '…', 'inactive', `${win.after} more to come`, { color: 'inactive' })}
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        {caption('Now')}
        <Text wrap="truncate-end" color={phase === 'waiting' ? 'warning' : phase === 'working' ? 'text' : look.color} weight={phase === 'waiting' ? 'semibold' : 'regular'}>
          {activity(m, phase)}
        </Text>
      </Box>

      {asks.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {caption(`Asks · ${m.asks.filter(a => a.done).length}/${m.asks.length}`)}
          {asks.map(a => item(`a${a.id}`, a.done ? GMARK.done : GMARK.todo, a.done ? 'success' : 'inactive',
            a.text, { color: a.done ? 'inactive' : 'text' }))}
          {m.asks.length > asks.length && item('more', '+', 'inactive', `${m.asks.length - asks.length} more`, { color: 'inactive' })}
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
  const right = m.running ? clock(m.nowMs - m.startedMs) : m.startedMs ? `in ${clock(m.nowMs - m.startedMs)}` : ''
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
          {Progress({ el, m, phase, cells: Math.max(10, inner - `  ${done}/${n} · 100%`.length) })}
        </Box>
      )}

      {/* The steps, each with how long it took, or has taken so far, on the right. */}
      {n > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {win.before > 0 && <Text color="inactive">{`✓ ${win.before} step${win.before > 1 ? 's' : ''} done`}</Text>}
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
          {win.after > 0 && <Text color="inactive">{`… ${win.after} more to come`}</Text>}
        </Box>
      )}

      <Box flexDirection="row" marginTop={1}>
        {title('Now')}
        <Text wrap="truncate-end" color={phase === 'waiting' ? 'warning' : phase === 'working' ? 'text' : look.color} bold={phase === 'waiting'}>
          {activity(m, phase)}
        </Text>
      </Box>

      {asks.length > 0 && (
        <Box flexDirection="row">
          {title(`Asks ${asksDone}/${m.asks.length}`)}
          <Box flexDirection="column" flexShrink={1}>
            {asks.map(a => (
              <Text key={`a${a.id}`} wrap="truncate-end" color={a.done ? 'inactive' : 'text'}>
                <Text color={a.done ? 'success' : 'inactive'}>{a.done ? '✓ ' : '○ '}</Text>
                {short(a.text, Math.max(10, inner - LABEL - 2))}
              </Text>
            ))}
            {m.asks.length > asks.length && <Text color="inactive">{`+ ${m.asks.length - asks.length} more`}</Text>}
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
    m.asks.length ? `asks ${m.asks.filter(a => a.done).length}/${m.asks.length}` : '',
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
        <Text color="inactive">{'Now  '}</Text>
        <Text color={phase === 'waiting' ? 'warning' : 'text'}>{activity(m, phase)}</Text>
        {tail && <Text color="inactive">{`  ·  ${tail}`}</Text>}
      </Text>
    </Box>
  )
}

// ---- the Sessions tab ----

const SESSION_LOOK: Record<string, { word: string; glyph: string; color: string }> = {
  running: { word: 'working', glyph: '▸', color: 'claude' },
  needs: { word: 'your turn', glyph: '⚑', color: 'warning' },
  done: { word: 'finished', glyph: '✓', color: 'success' },
}
const IDLE_LOOK = { word: 'idle', glyph: '·', color: 'inactive' }
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, Math.max(1, n - 1))}…` : s)
const whatOf = (c: Card) => (c.state === 'needs' && c.waitingFor ? `asks: ${c.waitingFor}` : c.purpose || c.now || 'just started')
// The Ask button only drafts a line in the prompt: the person sends it, or not.
const askText = (c: Card) => `Ask the session in ${c.place} working on "${cut(c.purpose || c.now, 60)}": `
const tallyLine = (list: Card[]) => {
  const t = summary(list)
  return `${t.running} working · ${t.done} finished${list.length > 5 ? ` · ${list.length - 5} more: /cockpit-sessions` : ''}`
}

// Terminal rows: state, place and purpose, a sliding block while it runs, its time, Ask.
function Sessions({ ask, el, list, now, inner }: { ask: (c: Card) => () => void; el: any; list: Card[]; now: number; inner: number }) {
  const { Box, Text, Button } = el
  const cells = inner >= 72 ? 14 : 0 // a narrow band drops the sliding block first
  const WORD = 12, TIME = 11, ASK = 8
  const nameW = Math.max(10, inner - WORD - (cells ? cells + 1 : 0) - TIME - ASK)
  return (
    <Box flexDirection="column" width={inner}>
      {list.slice(0, 5).map(c => {
        const l = SESSION_LOOK[c.state ?? ''] ?? IDLE_LOOK
        const b = slide(c, now, cells)
        return (
          <Box key={c.id} flexDirection="row">
            <Text wrap="truncate-end">
              <Text color={l.color} bold={c.state === 'needs'}>{`${l.glyph} ${l.word}`.padEnd(WORD)}</Text>
              <Text>{cut(`${c.place} · ${whatOf(c)}`, nameW).padEnd(nameW)}</Text>
              {cells > 0 && <Text color="subtle" dimColor>{` ${b.before}`}</Text>}
              {cells > 0 && <Text color={l.color}>{b.block}</Text>}
              {cells > 0 && <Text color="subtle" dimColor>{b.after}</Text>}
              <Text color={c.state === 'needs' ? 'warning' : 'inactive'}>{(rowTime(c, now) || ago(now - c.updatedMs)).padStart(TIME - 1)} </Text>
            </Text>
            <Button key={`ask-${c.id}`} label="Ask" onPress={ask(c)} />
          </Box>
        )
      })}
      <Text color="inactive" wrap="truncate-end">{tallyLine(list)}</Text>
    </Box>
  )
}

// Page-like rows for VS Code, the desktop app and the web: nothing counted in cells.
function GraphicSessions({ ask, el, list, now }: { ask: (c: Card) => () => void; el: any; list: Card[]; now: number }) {
  const { Box, Text, Button } = el
  return (
    <Box flexDirection="column" width="100%" gap="sm">
      {list.slice(0, 5).map(c => {
        const l = SESSION_LOOK[c.state ?? ''] ?? IDLE_LOOK
        return (
          <Box key={c.id} flexDirection="row" flexWrap="nowrap" justifyContent="space-between" alignItems="center" gap="sm">
            <Box flexDirection="column" flexShrink={1} minWidth={0}>
              <Text wrap="truncate-end" weight="semibold" color={l.color}>
                <Text mono color={l.color}>{`${l.glyph} `}</Text>
                {` ${c.place}`}
              </Text>
              <Text wrap="truncate-end" size="footnote" color={c.state === 'needs' ? 'warning' : 'inactive'}>{`${l.word} · ${rowTime(c, now) || ago(now - c.updatedMs)} · ${whatOf(c)}`}</Text>
            </Box>
            <Box flexShrink={0}><Button key={`ask-${c.id}`} label="Ask" variant="secondary" onPress={ask(c)} /></Box>
          </Box>
        )
      })}
      <Text size="footnote" color="inactive">{tallyLine(list)}</Text>
    </Box>
  )
}

// The folded band: one line with the state, the bar, the step under way, the time and who needs you.
function FoldedLine({ el, m, list, terminal, handle, width }: { el: any; m: Mission; list: Card[]; terminal: boolean; handle: any; width: number }) {
  const { Box, Text } = el
  const phase = phaseOf(m)
  const look = LOOK[phase]
  const n = m.steps.length
  const current = m.steps.find(s => s.status === 'now')
  const t = summary(list)
  const tail = [
    current && phase !== 'done' ? `› ${current.label}` : '',
    m.startedMs ? clock(m.nowMs - m.startedMs) : '',
    t.needs ? `⚑ ${t.needs} waiting` : list.length ? `${list.length} other session${list.length > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join('  ·  ')
  return (
    <Box flexDirection="row" flexWrap="nowrap" alignItems="center" gap={terminal ? 1 : 'sm'} width={terminal ? width : '100%'}>
      {handle}
      <Box flexShrink={1} minWidth={0}>
        <Text wrap="truncate-end">
          <Text bold color={look.color}>{`${look.glyph} ${look.label}  `}</Text>
          {terminal && n > 0 && Progress({ el, m, phase, cells: 12, label: false })}
          {n > 0 && <Text>{`  ${bar(m.steps, 1).label}`}</Text>}
          {tail && <Text color={t.needs ? 'warning' : 'inactive'}>{`  ·  ${tail}`}</Text>}
        </Text>
      </Box>
    </Box>
  )
}

const hasContent = (m: Mission) => m.running || !!m.doneBanner || m.steps.length > 0 || m.asks.length > 0 || m.feed.length > 0

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    cardsReady = undefined // a new session: read its id and HOME afresh
    mine = null
    await setup($)
    return next(e)
  })

  on('command.run', { command: 'cockpit-rows' }, async $ => {
    await setup($)
    await update($, plainRows, v => !v)
    return { text: (await read($, plainRows)) ? 'Plain-English tool rows: on.' : 'Plain-English tool rows: off, the full rows are back.' }
  })

  on('command.run', { command: 'cockpit' }, async $ => {
    await setup($)
    await update($, mission, () => EMPTY)
    return { text: 'Cockpit: Mission tab cleared.' }
  })

  on('command.run', { command: 'cockpit-fold' }, async $ => {
    await setup($)
    await update($, folded, f => !f)
    return { text: (await read($, folded)) ? 'Cockpit folded to one line (c or /cockpit-fold opens it).' : 'Cockpit open.' }
  })

  on('command.run', { command: 'cockpit-sessions' }, async $ => {
    await setup($)
    await update($, isHidden, h => !h)
    const hidden = await read($, isHidden)
    const list = order(await read($, others))
    const now = await $.clock.now()
    const word: Record<string, string> = { running: 'working', needs: 'WAITING ON YOU', done: 'finished' }
    const lines = list.map(c => `${word[c.state ?? ''] ?? 'idle'} · ${c.place}: ${c.state === 'needs' && c.waitingFor ? `asks: ${c.waitingFor}` : c.purpose || c.now} (${rowTime(c, now) || ago(now - c.updatedMs)})`)
    const head = hidden ? 'Sessions tab hidden (/cockpit-sessions brings it back).' : 'Sessions tab shown.'
    return { text: `${head}\n${list.length ? `${list.length} other session${list.length > 1 ? 's' : ''}:\n${lines.join('\n')}` : 'No other session is running the cockpit.'}` }
  })

  on('turn.start', async ($, e, next) => {
    await setup($)
    await start($)
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
    // Only what a person typed describes the session on its card: not job notices or peer messages.
    if ((typed || (e as any).origin?.kind === undefined) && e.text.trim()) await writeMine($, e.text).catch(() => undefined)
    await mark($, 'running').catch(() => undefined)
    const texts = typed ? extractAsks(e.text) : []
    if (texts.length) await addAsks($, texts)
    return next({ ...e, context: [...(e.context ?? []), reminder(await read($, mission))] })
  })

  on('tool.call', { tool: 'mcp__cockpit__add_ask' }, async ($, e: any) => {
    await setup($)
    const text = String(e.text ?? '').trim()
    if (!text) return { result: 'Nothing added: text was empty.' }
    const id = await addAsks($, [text])
    return { result: `Ask #${id} is on the cockpit.` }
  })

  on('tool.call', { tool: 'mcp__cockpit__set_plan' }, async ($, e: any) => {
    await setup($)
    if (!(await read($, mission)).running) await start($)
    const steps = setPlan(Array.isArray(e.steps) ? e.steps.slice(0, 8) : [], await $.clock.now())
    // A new plan is a new job: asks already ticked off drop away, open ones stay.
    await set($, m2 => ({ steps, asks: m2.asks.filter(a => !a.done) }))
    return { result: `Plan shown with ${steps.length} steps.` }
  })

  on('tool.call', { tool: 'mcp__cockpit__step_done' }, async ($, e: any) => {
    await setup($)
    const m = await read($, mission)
    const n = Number(e.step)
    if (!m.steps[n - 1]) return { result: `No step ${n}.` }
    const now = await $.clock.now()
    await set($, m2 => ({ steps: finishStep(m2.steps, n, now) }))
    await $.audio.play({ asset: 'sounds/step.wav' }).catch(() => undefined)
    return { result: `Step ${n} done.` }
  })

  on('tool.call', { tool: 'mcp__cockpit__tick_ask' }, async ($, e: any) => {
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
    const what = describe(tool, e.tool_input ?? {}) || 'a tool'
    await waitOn($, tool, `Allow: ${what.charAt(0).toLowerCase()}${what.slice(1)}`)
    await mark($, 'needs', clean(what, 40)).catch(() => undefined)
    await $.audio.play({ asset: 'sounds/ask.wav' }).catch(() => undefined)
    return r
  })

  on('tool.call', async ($, e: any, next) => {
    await setup($)
    if (!(await read($, mission)).running) await start($)
    if (mine?.state === 'needs') await mark($, 'running').catch(() => undefined)
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
      await mark($, 'needs', person).catch(() => undefined)
      await $.audio.play({ asset: 'sounds/ask.wav' }).catch(() => undefined)
    }
    try {
      return await next(e)
    } finally {
      // Allowed, refused or answered: the dialog for this tool is over either way.
      await waitOff($, e.tool)
      if (person) await mark($, 'running').catch(() => undefined)
    }
  })

  on('turn.complete', async ($, e, next) => {
    await setup($)
    if (e.agentId) return next(e)
    await mark($, 'done').catch(() => undefined)
    await scan($)
    timer?.cancel()
    timer = undefined
    const m = await read($, mission)
    const now = await $.clock.now()
    const reason = (e as any).reason ?? (e.isAborted ? 'aborted' : 'answer')
    const outcome = reason === 'aborted' ? 'stopped' : reason === 'error' ? 'error' : reason === 'refusal' ? 'refusal' : 'done'
    const head = { done: 'Done', stopped: 'Stopped', error: 'Stopped by an error', refusal: 'Refused' }[outcome]
    // a turn that ends well closes its plan, so nobody has to tick the last step; a question leaves it open
    const closed = outcome === 'done' && !String(e.answer ?? '').trim().endsWith('?')
    const steps = closed ? m.steps.map(s => ({ ...s, status: 'done' as const })) : m.steps
    const parts = [`${head} in ${clock(now - m.startedMs)}`]
    if (steps.length) parts.push(`${steps.filter(s => s.status === 'done').length}/${steps.length} steps`)
    if (m.asks.length) parts.push(`${m.asks.filter(a => a.done).length}/${m.asks.length} asks`)
    await set($, () => ({ steps, running: false, nowMs: now, doneBanner: parts.join(' · '), outcome, waiting: undefined, waitingTool: undefined }))
    // The chime means "done": an interrupted, failed or refused turn ends quietly.
    if (outcome === 'done') await $.audio.play({ asset: 'sounds/done.wav' }).catch(() => undefined)
    return next(e)
  })

  // A session that closes drops off the other sessions' tab at their next scan.
  on('session.end', async ($, e, next) => {
    await setup($)
    if (mine) await $.fs.write(`${dir}/${selfId}.json`, JSON.stringify({ ...mine, updatedMs: 0 })).catch(() => undefined)
    return next(e)
  })

  // One band on every surface: VS Code, the desktop app and the web draw it too, so there is
  // no side pane (VS Code showed both at once: 04/11/2026).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = await read($, mission)
    const p = e.props as any
    const list = (await read($, isHidden)) ? [] : order(await read($, others))
    if (p.hasSurvey || (!hasContent(m) && !list.length)) return next(e)
    await read($, nowMs) // redraws the sessions' timers and sliding blocks as the clock ticks
    const now = await $.clock.now()
    const el = $.ui.resolve(e)
    // The Sessions tab exists only while another session is open; with none, the band is the mission alone.
    const current: Tab = !list.length ? 'mission' : !hasContent(m) ? 'sessions' : await read($, tab)
    const pick = (t: Tab) => () => void update($, tab, () => t)
    const ask = (c: Card) => () => void $.prompt.fill({ text: askText(c) })
    const tally = summary(list)
    const sessionsLabel = `Sessions ${list.length}${tally.needs ? ` · ⚑ ${tally.needs}` : ''}`
    const isFolded = await read($, folded)
    const toggle = () => void update($, folded, f => !f)
    const terminal = e.surface === 'terminal'
    // The accordion's handle: ▾ folds the band, ▸ opens it; c presses it while the band has the focus.
    const handle = (open: boolean) => {
      const { Button } = el
      return terminal
        ? <Button key="fold" plain hotkey="c" onPress={toggle}>{open ? '▾' : '▸'}</Button>
        : <Button key="fold" variant="secondary" hotkey="c" onPress={toggle}>{open ? '▾' : '▸'}</Button>
    }
    if (isFolded) return FoldedLine({ el, m, list, terminal, handle: handle(false), width: Math.max(30, Math.min(100, p.bodyColumns ?? 80)) })

    // Only the terminal lays text out in cells; the others get the page-like layout.
    if (e.surface !== 'terminal') {
      const { Box, Button } = el
      return (
        <Box flexDirection="column" width="100%" gap="sm">
          {(
            <Box flexDirection="row" gap="sm" alignItems="center">
              {handle(true)}
              {list.length > 0 && <Button key="tab-mission" variant={current === 'mission' ? 'primary' : 'secondary'} hotkey="1" onPress={pick('mission')}>Mission</Button>}
              {list.length > 0 && <Button key="tab-sessions" variant={current === 'sessions' ? 'primary' : 'secondary'} hotkey="2" onPress={pick('sessions')}>{sessionsLabel}</Button>}
            </Box>
          )}
          {current === 'mission' ? GraphicPanel({ el, m }) : GraphicSessions({ ask, el, list, now })}
        </Box>
      )
    }

    const width = Math.max(30, Math.min(current === 'sessions' ? 100 : 80, p.bodyColumns ?? 80))
    const short = (p.maxRows ?? 12) < 10
    const { Box, Text, Button } = el
    const tabs = (
      <Box flexDirection="row" gap={2}>
        {handle(true)}
        {list.length > 0 && <Button key="tab-mission" plain hotkey="1" dimColor={current !== 'mission'} onPress={pick('mission')}>Mission</Button>}
        {list.length > 0 && <Button key="tab-sessions" plain hotkey="2" dimColor={current !== 'sessions'} onPress={pick('sessions')}>{sessionsLabel}</Button>}
        {!list.length && <Text color="inactive">Cockpit</Text>}
      </Box>
    )
    // A short window leaves two or three rows: no frame, the tabs on top of the short form.
    if (short) {
      return (
        <Box flexDirection="column" width={width}>
          {tabs}
          {current === 'mission' ? Compact({ el, m, width }) : (
            <Text wrap="truncate-end" color="inactive">{list.slice(0, 2).map(c => `${c.state === 'needs' ? '⚑' : c.state === 'running' ? '▸' : '✓'} ${c.place}`).join('   ')}</Text>
          )}
        </Box>
      )
    }
    const needsYou = phaseOf(m) === 'waiting' || tally.needs > 0
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={needsYou ? 'warning' : 'promptBorder'} borderDimColor={!needsYou} paddingX={1} width={width}>
        {tabs}
        <Box marginTop={1}>
          {current === 'mission' ? Panel({ el, m, width: width - 4, framed: false }) : Sessions({ ask, el, list, now, inner: width - 4 })}
        </Box>
      </Box>
    )
  })

  // Plain rows in the transcript: "Editing intro.md" in place of a tool name and a
  // full folder path. /cockpit-rows turns them off and puts the engine's own rows back.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const p = e.props as any
    if (!(await read($, plainRows))) return next(e)
    const own = OWN[String(p.tool).replace(/^mcp__cockpit__/, '')]
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

  // Its own tools' results say nothing a reader needs: the band already shows them.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const p = e.props as any
    if (!(await read($, plainRows)) || !String(p.tool ?? '').startsWith('mcp__cockpit__')) return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}

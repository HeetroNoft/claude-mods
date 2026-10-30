// Pure logic for the office: what each tool call looks like in the world, the ETA maths, and
// the text shown in a message bubble. No engine calls here, so the tests can reach all of it.

export type Step = { label: string; estMin: number; startMs?: number; doneMs?: number }
export type Intern = { key: string; label: string; startMs: number; background: boolean }
export type FileMark = { name: string; ms: number; kind: 'read' | 'edit' }
export type Sent = { key: string; to: string; words: string; ms: number }
export type Got = { key: string; from: string; words: string; ms: number }
export type Eta = { finishMs: number; plannedMs: number; lateMin: number; allDone: boolean; paused?: boolean }
// The session is waiting for the user: a question it asked, a permission it needs, or a turn that ended on a question.
export type Waiting = { kind: 'question' | 'permission' | 'reply' | 'form'; text: string; since: number; key?: string; tool?: string }
// The account's usage windows (percent used, 0..100) and when each resets, as last reported.
export type Rate = { fiveHour?: number; sevenDay?: number; fiveResets?: string; sevenResets?: string; ms: number }
export type Room = { theme?: string; ms?: number }
// What the session is busy with right now, more precisely than its activity.
export type Task = { kind: 'tests' | 'build' | 'commit' | 'push' | 'compact'; ms: number; auto?: boolean }
// Something that just happened: the board shows it for a few seconds and the mascot reacts once.
export type Flash = { kind: 'fail' | 'denied' | 'pass' | 'ship' | 'move' | 'model'; text: string; ms: number }
export type LogLine = { ms: number; kind: string; text: string }
export type Desk = {
  id: string
  name: string
  activity: string
  detail: string
  activityMs: number
  steps: Step[]
  planMs: number
  eta?: Eta
  interns: Intern[]
  files: FileMark[]
  sent: Sent[]
  got: Got[]
  turnMs: number
  doneMs: number
  doneLine: string
  updatedMs: number
  endedMs?: number
  // Names this Claude gave its teammates (from-name or address -> CEO), and which address
  // sent under which from-name, so a reply addressed by socket still gets a name.
  peers?: Record<string, string>
  seen?: Record<string, string>
  waiting?: Waiting
  // set when the usage limit stopped the session mid-turn; cleared by its next prompt
  limited?: { since: number; resetsAt?: string }
  rate?: Rate
  // where the plan on the board came from: the office plan tool (with estimates), mission-control's
  // plan, or Claude Code's own task list; planTurn is the turn the office plan was given in
  planSource?: 'office' | 'mission' | 'todos'
  planTurn?: number
  missionSteps?: number
  pausedMs?: number
  // the plan hint is in this conversation already: it is not sent again until a compaction
  hinted?: boolean
  // the turn stopped with steps left, by an error or by the user; cleared by the next prompt
  stopped?: { kind: 'error' | 'interrupted'; ms: number; error?: string }
  task?: Task
  flash?: Flash
  planMode?: boolean
  // percent of the context window in use
  ctx?: number
  // the turn left something running in the background, or a wake-up: the session is not on a break
  bg?: { kind: 'job' | 'wakeup'; since: number; until?: number }
  branch?: string
  model?: string
  // the task list its helpers work through
  tasks?: { done: number; total: number }
  log?: LogLine[]
}

export const newDesk = (id: string, name: string, now: number): Desk => ({
  id, name, activity: 'idle', detail: 'Coffee', activityMs: now, steps: [], planMs: 0,
  interns: [], files: [], sent: [], got: [], turnMs: 0, doneMs: 0, doneLine: '', updatedMs: now,
})

export const baseName = (p: unknown) => String(p ?? '').split(/[\\/]/).filter(Boolean).pop() ?? ''

// A short plain name reads well ("intro.md"). A long or machine-made one ("s02-plane-ceo-cto.png")
// is shown as what it is ("a screenshot") so a label never turns into noise.
const KINDS: [RegExp, string][] = [
  [/\.(png|jpe?g|gif|webp)$/i, 'a screenshot'], [/\.(mp4|mov|webm)$/i, 'a video'],
  [/\.(md|txt|docx?)$/i, 'a doc'], [/\.(html?|css)$/i, 'a web page'], [/\.(json|ya?ml|toml)$/i, 'a settings file'],
  [/\.(tsx?|jsx?|py|sh|go|rs)$/i, 'some code'], [/\.(csv|xlsx?)$/i, 'a spreadsheet'], [/\.pdf$/i, 'a PDF'],
]
export const plainFile = (name: string) => {
  if (name.length <= 10 && !/\d/.test(name)) return name
  return KINDS.find(([re]) => re.test(name))?.[1] ?? 'a file'
}

// Where the character goes for each tool. null = draw nothing new (the office's own tools).
export function activityOf(tool: string, input: any): { activity: string; detail: string; file?: FileMark['kind'] } | null {
  if (tool.startsWith('mcp__my-office__')) return null
  const f = plainFile(baseName(input?.file_path ?? input?.notebook_path))
  switch (tool) {
    case 'Read': return { activity: 'read', detail: f ? `Reading ${f}` : 'Reading', file: 'read' }
    case 'Grep': case 'Glob': return { activity: 'read', detail: 'Searching the files' }
    case 'Edit': case 'MultiEdit': case 'NotebookEdit': return { activity: 'edit', detail: f ? `Editing ${f}` : 'Editing', file: 'edit' }
    case 'Write': return { activity: 'edit', detail: f ? `Writing ${f}` : 'Writing', file: 'edit' }
    case 'Bash': {
      const d = String(input?.description ?? '').trim()
      return { activity: 'bash', detail: d ? clean(d[0].toUpperCase() + d.slice(1), 60) : 'Running a command' }
    }
    case 'WebFetch': case 'WebSearch': return { activity: 'web', detail: 'Looking something up' }
    case 'Agent': case 'Task': return { activity: 'agent', detail: 'Briefing a helper' }
    case 'SendMessage': return { activity: 'send', detail: 'Sending a note' }
    case 'TodoWrite': case 'TaskCreate': case 'TaskUpdate': return { activity: 'think', detail: 'Planning' }
    default:
      if (tool.startsWith('mcp__')) return { activity: 'web', detail: `Using ${tool.split('__')[1] ?? 'an app'}` }
      return { activity: 'think', detail: 'Thinking' }
  }
}

// What a shell command is about, read from the command itself; git first, it can follow a test run.
export function bashTask(cmd: unknown): Task['kind'] | undefined {
  const c = String(cmd ?? '')
  if (/\bgit\s+push\b/.test(c)) return 'push'
  if (/\bgit\s+commit\b/.test(c)) return 'commit'
  if (/\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\bpytest\b|\bjest\b|\bvitest\b|\b(go|cargo)\s+test\b|\bplugin test\b|\brun\.sh check\b/.test(c)) return 'tests'
  if (/\b(npm|pnpm|yarn|bun)\s+(run\s+)?build\b|\btsc\b|\bmake\b|\b(go|cargo)\s+build\b|\bvite build\b/.test(c)) return 'build'
  return undefined
}
export function branchOf(cmd: unknown): string | undefined {
  const c = String(cmd ?? '')
  return (c.match(/\bgit\s+(?:worktree\s+add\b.*?\s-b|checkout\s+-b|switch\s+-c)\s+([\w./-]+)/) ?? c.match(/\bgit\s+(?:checkout|switch)\s+(?!-)([\w./-]+)/))?.[1]
}
// How a finished tool call reads on the board. Refused: the user said no. No flash for a plain success.
export function toolFlash(kind: Task['kind'] | undefined, isError: boolean, text: string, now: number): Flash | undefined {
  if (isError && /doesn.t want to proceed|rejected|denied/i.test(text)) return { kind: 'denied', text: 'DENIED', ms: now }
  if (kind === 'tests' || kind === 'build') {
    const w = kind === 'tests' ? 'TESTS' : 'BUILD'
    return isError ? { kind: 'fail', text: `${w} FAILED`, ms: now } : { kind: 'pass', text: `${w} OK`, ms: now }
  }
  if (kind === 'commit' || kind === 'push') {
    return isError ? { kind: 'fail', text: `${kind.toUpperCase()} FAILED`, ms: now } : { kind: 'ship', text: kind === 'push' ? 'PUSHED' : 'COMMITTED', ms: now }
  }
  return isError ? { kind: 'fail', text: 'OOPS', ms: now } : undefined
}
export const note = (d: Desk, kind: string, text: string, now: number) => { d.log = push(d.log ?? [], { ms: now, kind, text: clean(text, 60) }, 12) }

// Paths and long ids never reach the page: a bubble shows words, not where files live.
export const clean = (s: string, n: number) => {
  const t = s.replace(/\b[A-Za-z]:\\[^\s"'`]+/g, '…').replace(/(~|\.{0,2})?\/[^\s"'`]+/g, '…').replace(/\b[0-9a-f]{8}-[0-9a-f-]{20,}\b/gi, '…').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

// A bubble shows the first whole sentence, never a sentence cut in half. A long first sentence
// stops at its first comma or colon past the halfway point; only a run-on gets an ellipsis.
export const firstWords = (s: string, n = 26) => {
  const t = clean(s, 400)
  const first = (t.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0] ?? t).trim()
  const w = first.split(' ').filter(Boolean)
  if (w.length <= n) return w.join(' ')
  const head = w.slice(0, n).join(' ')
  const cut = Math.max(head.lastIndexOf(', '), head.lastIndexOf(': '))
  return cut > head.length / 2 ? head.slice(0, cut) : `${head}…`
}

// The same message must give the same key on the sending desk and the receiving desk.
export const msgKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 48)

// A peer message arrives inside an envelope: <cross-session-message from=".." from-name="..">body</..>
export function parseReceived(text: string): { from: string; addr: string; body: string } {
  const addr = text.match(/<cross-session-message[^>]*?\sfrom="([^"]*)"/)?.[1] ?? ''
  const m = text.match(/<cross-session-message[^>]*?(?:from-name="([^"]*)")?[^>]*>([\s\S]*?)(?:<\/cross-session-message>|$)/)
  if (!m) return { from: '', addr, body: text.trim() }
  const name = text.match(/from-name="([^"]*)"/)?.[1] ?? ''
  return { from: name, addr, body: m[2].trim() }
}

export function planSteps(raw: unknown, now: number): Step[] {
  const list = Array.isArray(raw) ? raw.slice(0, 8) : []
  const steps = list
    .map((s: any) => ({ label: clean(String(s?.label ?? s ?? ''), 40), estMin: Math.max(0, Number(s?.minutes ?? 0)) }))
    .filter(s => s.label)
  if (steps[0]) steps[0] = { ...steps[0], startMs: now }
  return steps
}

// A plan runs in order, so ticking a step closes the ones before it: a Claude that jumps to the last
// step must not leave the first one "in progress" for good (a Manager's board did, three times).
export function finishStep(steps: Step[], n: number, now: number): Step[] {
  const out = steps.map(s => ({ ...s }))
  const s = out[n - 1]
  if (!s || s.doneMs) return out
  for (const x of out.slice(0, n)) {
    if (x.doneMs) continue
    x.startMs = x.startMs ?? now
    x.doneMs = now
  }
  const next = out.find(x => !x.doneMs)
  if (next && !next.startMs) next.startMs = now
  return out
}

// The finish time re-estimates from the real pace so far: steps done took r times their guess,
// so the steps left are expected to take about r times theirs too. A step that runs past its share
// pushes the finish later every tick, so a slip always shows.
export function eta(steps: Step[], planMs: number, now: number): Eta | undefined {
  if (!steps.length || steps.every(s => !s.estMin)) return undefined
  const MIN = 60_000
  const done = steps.filter(s => s.doneMs)
  const est = done.reduce((a, s) => a + s.estMin * MIN, 0)
  const act = done.reduce((a, s) => a + ((s.doneMs ?? 0) - (s.startMs ?? planMs)), 0)
  // Trust the measured pace in proportion to how much of the plan it covers: one quick first
  // step out of six must not shrink the whole estimate (a live run did: 14:58 became 14:07).
  const total = steps.reduce((a, s) => a + s.estMin * MIN, 0)
  const raw = done.length && est > 0 ? Math.min(4, Math.max(0.25, act / est)) : 1
  const r = 1 + (raw - 1) * (total > 0 ? est / total : 0)
  let left = 0
  for (const s of steps) {
    if (s.doneMs) continue
    const share = s.estMin * MIN * r
    left += s.startMs ? Math.max(0, share - (now - s.startMs)) : share
  }
  const allDone = steps.every(s => s.doneMs)
  const finishMs = allDone ? Math.max(...steps.map(s => s.doneMs ?? 0)) : now + left
  const plannedMs = planMs + steps.reduce((a, s) => a + s.estMin * MIN, 0)
  return { finishMs, plannedMs, lateMin: Math.max(0, Math.round((finishMs - plannedMs) / MIN)), allDone }
}

export const hhmm = (ms: number) => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const push = <T>(list: T[], item: T, max: number) => [...list, item].slice(-max)

// One tool call, applied to the desk: where the character goes, which file glows, which intern
// walks in. File names only: the folder never reaches the desk file.
export function applyTool(d: Desk, tool: string, input: any, key: string, now: number): Desk {
  const a = activityOf(tool, input)
  if (!a) return d
  const out = { ...d, activity: a.activity, detail: a.detail, activityMs: now }
  const kind = tool === 'Bash' ? bashTask(input?.command) : undefined
  out.task = kind ? { kind, ms: now } : undefined
  const branch = tool === 'Bash' ? branchOf(input?.command) : undefined
  if (branch) out.branch = clean(branch, 30)
  if (a.detail !== d.detail) out.log = push(d.log ?? [], { ms: now, kind: a.activity, text: a.detail }, 12)
  const f = plainFile(baseName(input?.file_path ?? input?.notebook_path))
  if (a.file && f) out.files = push(d.files.filter(x => x.name !== f), { name: f, ms: now, kind: a.file }, 12)
  if (a.activity === 'agent') {
    out.interns = push(d.interns, { key, label: firstWords(String(input?.description ?? 'Helper'), 3), startMs: now, background: Boolean(input?.run_in_background) }, 6)
  }
  return out
}

// room: what the whole office shares, here the theme a /my-office-theme asked for (the page follows it once).
export const dataJs = (now: number, desks: Desk[], room?: Room) =>
  `window.__office && window.__office(${JSON.stringify({ now, desks, room })})\n`

// One line of /my-office-who: who it is, what it does now, how far its plan is.
export function whoLine(d: Desk, mine: boolean) {
  const bits = [d.limited ? 'out of usage' : d.waiting ? `waiting for you: ${d.waiting.text}` : d.detail]
  if (d.steps.length) bits.push(`plan ${d.steps.filter(s => s.doneMs).length}/${d.steps.length}`)
  if (d.eta && !d.eta.allDone) bits.push(`due ${hhmm(d.eta.finishMs)}${d.eta.lateMin ? `, ${d.eta.lateMin} min late` : ''}`)
  return `${d.name}${mine ? ' (you)' : ''}: ${bits.join(' · ')}`
}

// A desk's plan, one step a line.
export const planLines = (d: Desk) => d.steps.map((s, i) => `${s.doneMs ? '[x]' : '[ ]'} ${i + 1}. ${s.label}${s.estMin ? ` (${s.estMin} min)` : ''}`)

// The usage left, from the freshest reading any desk has.
export function usageLine(desks: Desk[]) {
  const r = desks.map(d => d.rate).filter((x): x is Rate => Boolean(x)).sort((a, b) => b.ms - a.ms)[0]
  if (!r) return ''
  const left = (used?: number) => `${Math.round(100 - (used ?? 0))}%`
  return `Usage left: ${[r.fiveHour != null && `5 hours ${left(r.fiveHour)}`, r.sevenDay != null && `week ${left(r.sevenDay)}`].filter(Boolean).join(', ')}`
}

// Takes the plan off the board.
export function clearPlan(d: Desk) {
  d.steps = []; d.planMs = 0; d.doneMs = 0; d.pausedMs = undefined; d.stopped = undefined; d.planSource = undefined; d.planTurn = undefined; d.missionSteps = undefined
}

// The name to show for a teammate: the role this Claude gave it, else its own session name.
export function peerName(d: Pick<Desk, 'peers' | 'seen'>, who: string) {
  const peers = d.peers ?? {}
  const viaAddr = d.seen?.[who]
  return peers[who] ?? (viaAddr ? peers[viaAddr] ?? viaAddr : who)
}

// Claude Code's own task list (TodoWrite), mirrored onto the board when no office plan was given
// this turn. A step already started or done keeps its times; a step put back to pending is undone.
export function todoSteps(todos: unknown, prev: Step[], now: number): Step[] {
  const list = Array.isArray(todos) ? todos.slice(0, 8) : []
  return list.map((t: any) => {
    const label = clean(String(t?.content ?? t?.subject ?? ''), 40)
    const was = prev.find(p => p.label === label)
    const status = String(t?.status ?? 'pending')
    const s: Step = { label, estMin: was?.estMin ?? 0, startMs: was?.startMs, doneMs: status === 'completed' ? (was?.doneMs ?? now) : undefined }
    if (status !== 'pending') s.startMs = s.startMs ?? now
    return s
  }).filter(s => s.label)
}

// A turn that ends on a question to the user: that question, in a few words; '' when it does not.
export function lastQuestion(answer: unknown): string {
  const t = String(answer ?? '').trim()
  if (!t.endsWith('?')) return ''
  const parts = t.split(/(?<=[.!?])\s+/)
  return firstWords(parts[parts.length - 1], 12)
}

// The rate-limit windows the engine reports ($.session.usage, session.measure), as the gauge reads them.
export function rateOf(windows: unknown, now: number): Rate | undefined {
  const list = Array.isArray(windows) ? windows : []
  const r: Rate = { ms: now }
  for (const w of list as any[]) {
    if (w?.kind === 'five_hour') { r.fiveHour = Number(w.percentUsed); r.fiveResets = w.resetsAt }
    else if (w?.kind === 'seven_day') { r.sevenDay = Number(w.percentUsed); r.sevenResets = w.resetsAt }
  }
  return r.fiveHour == null && r.sevenDay == null ? undefined : r
}

// Usage windows and their resets. A date in the past means that window has started again.
export const passed = (iso: string | undefined, now: number) => { const t = Date.parse(iso ?? ''); return !isNaN(t) && t <= now }
const windowsOf = (r?: Rate) => (r ? [[r.fiveHour, r.fiveResets], [r.sevenDay, r.sevenResets]] as [number | undefined, string | undefined][] : [])
// The reading was taken before a reset that has since gone by: it says nothing about now.
export const rateStale = (d: Desk, now: number) => windowsOf(d.rate).some(([, at]) => passed(at, now) && Date.parse(at ?? '') > (d.rate?.ms ?? 0))
// A reading can lag behind a reset: a window past its reset date is empty again, whatever it still says.
export function freshRate(r: Rate, now: number): Rate {
  const out = { ...r }
  if (passed(r.fiveResets, now)) { out.fiveHour = 0; out.fiveResets = undefined }
  if (passed(r.sevenResets, now)) { out.sevenDay = 0; out.sevenResets = undefined }
  return out
}
// When a session stopped by the limit can go on: at the reset of the window that is empty, not of the
// nearest one (a full week's limit outlasts the five hours); the nearest only when none reads as empty.
export function limitReset(r?: Rate) {
  const w = windowsOf(r).filter(([, at]) => at)
  const full = w.filter(([used]) => (used ?? 0) >= 100).map(([, at]) => at as string).sort()
  return full[full.length - 1] ?? w.map(([, at]) => at as string).sort()[0]
}
// Called once the reset has gone by, with what the usage reads now: true when the session can resume.
// Still empty, it waits for that window's own reset.
export function limitOver(d: Desk, fresh: Rate | undefined, now: number) {
  if (!d.limited || !passed(d.limited.resetsAt, now)) return false
  const still = fresh ? limitReset(freshRate(fresh, now)) : undefined
  if (fresh && windowsOf(freshRate(fresh, now)).some(([used]) => (used ?? 0) >= 100) && still) { d.limited = { ...d.limited, resetsAt: still }; return false }
  return true
}

// A turn that ends normally finishes its plan: every step left is ticked.
export function finishPlan(d: Desk, now: number) {
  d.steps = d.steps.map(s => (s.doneMs ? s : { ...s, startMs: s.startMs ?? now, doneMs: now }))
  d.pausedMs = undefined
}
// A turn stopped by an error or by the user leaves its steps as they are, frozen until the next prompt.
export function stopPlan(d: Desk, kind: 'error' | 'interrupted', now: number, error?: string) {
  if (error || d.steps.some(s => !s.doneMs)) { d.stopped = { kind, ms: now, ...(error ? { error } : {}) }; pausePlan(d, now) }
}

// While the session waits for the user the plan is paused, so waiting never reads as running late:
// on resume, every time the plan counts from moves forward by the length of the pause.
export function pausePlan(d: Desk, now: number) {
  if (!d.pausedMs && d.steps.some(s => !s.doneMs)) d.pausedMs = now
}
export function resumePlan(d: Desk, now: number) {
  d.stopped = undefined
  if (!d.pausedMs) return
  const gap = now - d.pausedMs
  d.pausedMs = undefined
  d.planMs += gap
  d.steps = d.steps.map(s => (s.doneMs || s.startMs == null ? s : { ...s, startMs: s.startMs + gap }))
}

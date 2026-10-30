// The pure half of mission-control: plain-French activity lines, the plan, the progress bar.
// Nothing here touches the engine, so every line the panel shows is tested.

import type { Ask, Step } from '../types'

const base = (p: unknown) => String(p ?? '').split(/[\\/]/).filter(Boolean).pop() ?? ''
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Server names people recognise. Anything else is shown as "Une app connectée".
const APPS: Record<string, string> = {
  notion: 'Notion', claude_ai_Notion: 'Notion', claude_ai_Gmail: 'Gmail', claude_ai_Google_Drive: 'Google Drive',
  claude_ai_Google_Calendar: 'Google Calendar', figma: 'Figma', 'claude-in-chrome': 'Chrome', 'my-office': 'Office',
}

// One tool call in, one line anyone can read out. null = not worth showing.
export function describe(tool: string, input: any = {}): string | null {
  const file = base(input.file_path ?? input.notebook_path ?? input.path)
  switch (tool) {
    case 'Read': return file ? `Lecture de ${file}` : 'Lecture d’un fichier'
    case 'Edit': case 'MultiEdit': return file ? `Modification de ${file}` : 'Modification d’un fichier'
    case 'Write': return file ? `Écriture de ${file}` : 'Écriture d’un fichier'
    case 'NotebookEdit': return `Modification de ${file || 'un notebook'}`
    case 'Grep': return input.pattern ? `Recherche de « ${cut(String(input.pattern), 30)} » dans les fichiers` : 'Recherche dans les fichiers'
    case 'Glob': return 'Recherche de fichiers'
    case 'Bash': case 'PowerShell': return input.description ? cap(cut(String(input.description), 60)) : 'Exécution d’une commande'
    case 'WebSearch': return input.query ? `Recherche web : « ${cut(String(input.query), 30)} »` : 'Recherche sur le web'
    case 'WebFetch': {
      const host = String(input.url ?? '').match(/^https?:\/\/([^/]+)/)?.[1]
      return host ? `Lecture d’une page sur ${host.replace(/^www\./, '')}` : 'Lecture d’une page web'
    }
    case 'Agent': case 'Task': return input.description ? `Délégation à un agent : ${cut(String(input.description), 40)}` : 'Délégation à un agent'
    case 'Skill': return input.skill ? `Ouverture du skill ${String(input.skill).split(':').pop()}` : 'Ouverture d’un skill'
    case 'SendMessage': return 'Message à une autre session'
    case 'TodoWrite': case 'TaskCreate': case 'TaskUpdate': return 'Mise à jour du plan'
    case 'AskUserQuestion': return 'Question pour vous'
    case 'ToolSearch': case 'TaskList': case 'TaskGet': return null
  }
  const mcp = tool.match(/^mcp__(.+?)__(.+)$/)
  if (mcp) {
    if (mcp[1] === 'mission-control') return null
    const app = APPS[mcp[1]] ?? APPS[mcp[1].replace(/^claude_ai_/, '')] ?? 'Une app connectée'
    const verb = mcp[2].replace(/^(notion|mcp)-/, '').replace(/[_-]+/g, ' ')
    return `${app} : ${verb}`
  }
  return 'Travail en cours'
}

// ---- the plan ----

export function fromTodos(todos: any[]): Step[] {
  return (todos ?? []).map(t => ({
    label: String(t.content ?? t.subject ?? ''),
    status: t.status === 'completed' ? 'done' : t.status === 'in_progress' ? 'now' : 'todo',
  }))
}

// Each step keeps when it started and ended, so the panel can say how long it took.
export function setPlan(labels: string[], now?: number): Step[] {
  const steps: Step[] = labels.map(l => ({ label: String(l).trim(), status: 'todo' as const })).filter(s => s.label)
  if (steps[0]) steps[0] = { ...steps[0], status: 'now', startMs: now }
  return steps
}

// Marks step n (1-based) done and moves "now" to the first step still to do.
export function finishStep(steps: readonly Step[], n: number, now?: number): Step[] {
  const next = steps.map((s, i) => (i === n - 1 && s.status !== 'done' ? { ...s, status: 'done' as const, doneMs: now } : s))
  if (!next.some(s => s.status === 'now')) {
    const i = next.findIndex(s => s.status === 'todo')
    if (i >= 0) next[i] = { ...next[i], status: 'now', startMs: now }
  }
  return next
}

// A plan rebuilt from a TodoWrite or a Task update keeps the times of the steps it had, by
// label, and starts or stops the clock of a step whose status moved.
export function timed(prev: readonly Step[], next: readonly Step[], now: number): Step[] {
  return next.map(s => {
    const was = prev.find(p => p.label === s.label)
    // Only a step seen running is timed: one that arrives already done has no honest duration.
    const startMs = s.status === 'todo' ? undefined : was?.startMs ?? (s.status === 'now' ? now : undefined)
    const doneMs = s.status !== 'done' ? undefined : was?.status === 'done' ? was.doneMs : startMs != null ? now : undefined
    return { ...s, startMs, doneMs }
  })
}

// How long a step took, or has taken so far; '' when it never started or was not timed.
export function stepTime(s: Step, now: number): string {
  if (s.status === 'todo' || s.startMs == null) return ''
  const end = s.status === 'done' ? s.doneMs : now
  // A step ticked off the moment it started has no duration worth a "0 s".
  if (end == null || (s.status === 'done' && end - s.startMs < 1000)) return ''
  return clock(end - s.startMs)
}

export function applyTask(steps: readonly Step[], tool: string, input: any): Step[] {
  if (tool === 'TaskCreate') return [...steps, { label: String(input.subject ?? ''), status: 'todo' }]
  if (tool === 'TaskUpdate' && input.status) {
    const i = Number(input.taskId) - 1
    if (!steps[i]) return [...steps]
    if (input.status === 'deleted') return steps.filter((_, j) => j !== i)
    const status = input.status === 'completed' ? 'done' : input.status === 'in_progress' ? 'now' : 'todo'
    return steps.map((s, j) => (j === i ? { ...s, status } : s))
  }
  return [...steps]
}

// One heavy line in two colours, "━━━━━━━╸━━━━━━  2/4 · 50 %", in a fixed number of cells so it
// reads the same at any width. The ╸ tip is half a cell, so the fill moves in half steps and
// a plan of 7 steps still lands on its true share.
export function bar(steps: readonly Step[], cells = 24): { fill: string; tip: string; empty: string; label: string } {
  const total = steps.length
  const done = steps.filter(s => s.status === 'done').length
  const halves = total ? Math.round((done / total) * cells * 2) : 0
  const full = Math.floor(halves / 2)
  const tip = halves % 2 ? '╸' : ''
  return {
    fill: '━'.repeat(full),
    tip,
    empty: '━'.repeat(cells - full - tip.length),
    label: total ? `${done}/${total} · ${Math.round((done / total) * 100)} %` : 'pas de plan',
  }
}

// The same progress as a picture, for the surfaces that draw text in a proportional face (VS
// Code, the desktop app), where a row of ━ never lands on the width it was counted for. One
// rounded segment per step: done ones filled, the current one half-tinted, the rest a faint
// track. Past 12 steps the segments would be slivers, so it is one continuous bar.
export function progressSvg(steps: readonly Step[], fill: string, track: string): string {
  const W = 400, H = 8, R = 3
  const n = steps.length
  const rect = (x: number, w: number, color: string, opacity = 1) =>
    `<rect x="${x.toFixed(1)}" y="0" width="${Math.max(0, w).toFixed(1)}" height="${H}" rx="${R}" fill="${color}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''}/>`
  let body = ''
  if (n && n <= 12) {
    const gap = n > 1 ? 4 : 0
    const w = (W - gap * (n - 1)) / n
    steps.forEach((s, i) => {
      const x = i * (w + gap)
      body += s.status === 'done' ? rect(x, w, fill) : s.status === 'now' ? rect(x, w, track) + rect(x, w, fill, 0.45) : rect(x, w, track)
    })
  } else {
    const done = steps.filter(s => s.status === 'done').length
    body = rect(0, W, track) + (n ? rect(0, (done / n) * W, fill) : '')
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${body}</svg>`
}

// The steps to list when there are more than fit: a window that keeps the current step in
// view, with how many are hidden on each side.
export function stepWindow(steps: readonly Step[], room: number): { shown: Step[]; before: number; after: number } {
  if (steps.length <= room) return { shown: [...steps], before: 0, after: 0 }
  const open = steps.findIndex(s => s.status !== 'done')
  const cur = open < 0 ? steps.length - 1 : open
  const place = (rows: number) => Math.max(0, Math.min(cur - 1, steps.length - rows))
  // A "+N" line on one side costs a row; one on each side costs two.
  let rows = Math.max(1, room - 1)
  let start = place(rows)
  if (start > 0 && start + rows < steps.length) { rows = Math.max(1, room - 2); start = place(rows) }
  return { shown: steps.slice(start, start + rows), before: start, after: steps.length - start - rows }
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
}

export function tick(asks: readonly Ask[], id: number, proof: string): { asks: Ask[]; found: boolean } {
  let found = false
  const next = asks.map(a => (a.id === id ? ((found = true), { ...a, done: true, proof }) : a))
  return { asks: next, found }
}

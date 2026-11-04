/** `startMs` and `doneMs` time a step; absent on plans from TodoWrite or an older version. */
export type Step = { label: string; status: 'todo' | 'now' | 'done'; startMs?: number; doneMs?: number }
export type Ask = { id: number; text: string; done: boolean; proof?: string }
export type Mission = {
  steps: Step[]
  feed: string[]
  asks: Ask[]
  nextAsk: number
  startedMs: number
  nowMs: number
  running: boolean
  doneBanner: string
  /** How the last turn ended, for the header's colour. Absent in values an older version stored. */
  outcome?: 'done' | 'stopped' | 'error' | 'refusal'
  /**
   * What the person is asked to do while a dialog waits on them (a permission, a question,
   * a plan to approve), as the panel says it; cleared once that tool's call has settled.
   */
  waiting?: string
  /** The tool the person is asked about, so only its own end clears the wait. */
  waitingTool?: string
}

/** The band's two tabs: this session's turn, and the other open sessions. */
export type Tab = 'mission' | 'sessions'
export type State = 'running' | 'done' | 'needs'
/** One session's card in ~/.claude/session-cards/<id>.json, written by it, read by the others. */
export type Card = {
  id: string; place: string; purpose: string; now: string; updatedMs: number
  state?: State; startMs?: number; endMs?: number; waitingFor?: string
}

declare module 'claude-code' {
  interface PluginState {
    cockpit: { mission: Mission; plainRows: boolean; tab: Tab; others: Card[]; isHidden: boolean; nowMs: number }
  }
}

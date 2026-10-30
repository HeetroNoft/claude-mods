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

declare module 'claude-code' {
  interface PluginState {
    'mission-control': { mission: Mission; plainRows: boolean }
  }
}

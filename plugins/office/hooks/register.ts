import type { Register } from 'claude-code'

import {
  activityOf, applyTool, clean, clearPlan, type Desk, eta, finishStep, firstWords, hhmm, lastQuestion, msgKey, newDesk,
  parseReceived, pausePlan, peerName, planLines, planSteps, push, rateOf, resumePlan, todoSteps, usageLine, whoLine,
} from './core'
import { deskList, installPage, LIVE_MS, officeDir, pageInTest, presentDesks, publish, readDesk, readLeft, themeKeys, writeDesk, writeLeft, writeRoom } from './room'
import { COMMANDS, PROMPT_HINT, TOOLS } from './tools'

// The office: every session that runs this mod gets a desk in one shared pixel-art room.
// Each session writes only its own desk file, then rebuilds data.js from all of them (see
// room.ts). The local page reads data.js every second and animates it. Nothing leaves the machine.

let desk: Desk | undefined
let dir = ''
let chain: Promise<unknown> = Promise.resolve()
let ticker: { cancel: () => void } | undefined

// Finds this session's desk: the saved one after a reload, or a new one.
async function ensure($: any) {
  if (desk && dir) return
  dir = await officeDir($)
  const id = await $.session.id()
  const now = await $.clock.now()
  const saved = await readDesk($, dir, id)
  const name = String((await $.store.get(`name:${id}`)) ?? saved?.name ?? 'Claude')
  desk = saved ? { ...saved, name, endedMs: undefined } : newDesk(id, name, now)
}

// Writes are queued so two events never interleave their writes.
function save($: any, change: (d: Desk, now: number) => void) {
  chain = chain.then(async () => {
    await ensure($)
    if (!desk || !dir) return
    const now = await $.clock.now()
    change(desk, now)
    // a paused plan (the session waits for the user) is timed as of the moment it paused
    desk.eta = eta(desk.steps, desk.planMs, desk.pausedMs ?? now)
    if (desk.eta && desk.pausedMs) desk.eta.paused = true
    desk.updatedMs = now
    await writeDesk($, dir, desk)
    await publish($, dir)
  }).catch(() => undefined)
  return chain
}

const rename = async ($: any, name: string) => {
  await ensure($)
  await $.store.set(`name:${desk?.id}`, name)
  await save($, d => { d.name = name })
}

// Keeps the board's plan in step with what the session really does. The office plan tool wins (it
// has estimates); without one this turn, the board follows mission-control's plan or Claude Code's
// own task list. A step ticked on mission-control's panel also ticks here when both plans match.
async function followPlan($: any, e: any) {
  const officeNow = (d: Desk) => d.planSource === 'office' && d.planTurn === d.turnMs
  if (e.tool === 'TodoWrite') {
    await save($, (d, now) => {
      if (officeNow(d)) return
      const steps = todoSteps(e.todos, d.planSource === 'todos' ? d.steps : [], now)
      if (!steps.length) return
      if (d.planSource !== 'todos') { d.planMs = now; d.doneMs = 0 }
      d.steps = steps; d.planSource = 'todos'; d.pausedMs = undefined
    })
  } else if (e.tool === 'mcp__mission-control__set_plan') {
    await save($, (d, now) => {
      d.missionSteps = Array.isArray(e.steps) ? e.steps.length : 0
      if (officeNow(d)) return
      d.steps = planSteps(e.steps, now); d.planMs = now; d.doneMs = 0; d.planSource = 'mission'; d.pausedMs = undefined
    })
  } else if (e.tool === 'mcp__mission-control__step_done') {
    const n = Number(e.step)
    await save($, (d, now) => { if (d.planSource === 'mission' || d.missionSteps === d.steps.length) d.steps = finishStep(d.steps, n, now) })
  }
}

// Runs a tool call; once it goes on, the question or permission it was waiting on is answered.
// Only the call that raised it clears it, so a parallel call finishing first changes nothing.
async function awaitAnswer($: any, e: any, run: Promise<any>) {
  const result = await run
  const w = desk?.waiting
  if (w && ((w.kind === 'question' && w.key === e.tool_use_id) || (w.kind === 'permission' && w.tool === e.tool))) await save($, d => { d.waiting = undefined })
  return result
}

function startTicker($: any) {
  ticker?.cancel()
  ticker = $.clock.every(15_000, () => {
    if (!desk?.eta || desk.eta.allDone) { ticker?.cancel(); ticker = undefined; return }
    if (!desk.pausedMs) void save($, () => undefined)
  })
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
  for (const c of COMMANDS) await $.command.register(c)
  await ensure($)
  if (dir && !(await pageInTest($, dir))) await installPage($, `${$.plugin.root}/web`, dir).catch(() => undefined) // the page copy is best effort
  // usage is best effort: an engine without it (or a failing call) must not stop the setup
  const usage = await Promise.resolve().then(() => $.session.usage()).catch(() => undefined)
  await save($, (d, now) => {
    const r = rateOf(usage?.rateLimits, now)
    if (r) d.rate = r
    // a session started again after hitting the usage limit is back to normal
    if (d.limited) { d.limited = undefined; d.activity = 'idle'; d.detail = 'Coffee' }
  })
  if (desk?.eta && !desk.eta.allDone) startTicker($)
}

// A session that starts again (VS Code reopened, a resumed conversation, after /office-leave) walks back
// to its desk. The desk is read again: the module may outlive a session (after /clear the id changes).
async function comeBack($: any) {
  await chain
  desk = undefined
  await ensure($)
  if (!desk || !dir) return
  const left = await readLeft($, dir)
  if (left[desk.id]) { delete left[desk.id]; await writeLeft($, dir, left) }
  await save($, (d, now) => { if (d.activity === 'gone') { d.activity = 'idle'; d.detail = 'Coffee'; d.activityMs = now } })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await setup($)
    await comeBack($).catch(() => undefined)
    return next(e)
  })

  on('command.run', { command: 'office-desk' }, async ($, e: any) => {
    const name = clean(String(e.args ?? e.text ?? '').trim(), 14)
    if (!name) return { text: `Your desk is called ${desk?.name ?? 'Claude'}. Rename it with /office-desk <name>.` }
    await rename($, name)
    return { text: `Your desk is now called ${name}.` }
  })

  on('command.run', { command: 'office-leave' }, async ($, e: any) => {
    await setup($)
    await ensure($)
    const arg = String(e.args ?? e.text ?? '').trim().toLowerCase()
    const now = await $.clock.now()
    const here = await presentDesks($, dir, now)
    const others = arg === 'others'
    const hits = others ? here.filter(d => d.id !== desk?.id) : arg ? here.filter(d => d.name.toLowerCase() === arg || d.id.startsWith(arg)) : here.filter(d => d.id === desk?.id)
    if (others && !hits.length) return { text: 'Nobody else is in the office.' }
    if (!hits.length) return { text: arg ? `No desk called "${arg}". In the office: ${deskList(here)}.` : 'This session is not in the office.' }
    if (!others && hits.length > 1) return { text: `Several desks match "${arg}": ${deskList(hits)}. Use /office-leave <start of the id>.` }
    // who left long ago is off the board anyway: the list only keeps who could still show
    const left = Object.fromEntries(Object.entries(await readLeft($, dir)).filter(([, ms]) => now - ms < LIVE_MS))
    await writeLeft($, dir, { ...left, ...Object.fromEntries(hits.map(d => [d.id, now])) })
    await save($, () => undefined)
    if (others) return { text: `${deskList(hits)} went home. Each comes back with a new prompt or when its session is opened again.` }
    const gone = hits[0]
    const mine = gone.id === desk?.id
    return { text: `${gone.name} went home and freed a desk.${mine ? ' This session comes back on its next prompt or when it is opened again.' : ' It comes back when that session gets a new prompt or is opened again.'}` }
  })

  on('command.run', { command: 'office' }, async $ => {
    await ensure($)
    return { text: `Open this page in your browser: file:///${dir.replace(/^\//, '')}/index.html\nEvery session with the office mod gets a desk there. Rename yours with /office-desk <name>.` }
  })

  on('command.run', { command: 'office-who' }, async ($, e: any) => {
    await ensure($)
    const now = await $.clock.now()
    const here = await presentDesks($, dir, now)
    const arg = String(e.args ?? '').trim().toLowerCase()
    if (arg) {
      const d = here.find(x => x.name.toLowerCase() === arg || x.id.startsWith(arg))
      if (!d) return { text: `No desk called "${arg}". In the office: ${deskList(here)}.` }
      return { text: [whoLine(d, d.id === desk?.id), ...planLines(d)].join('\n') }
    }
    if (!here.length) return { text: 'Nobody is in the office.' }
    return { text: [...here.map(d => whoLine(d, d.id === desk?.id)), usageLine(here)].filter(Boolean).join('\n') }
  })

  on('command.run', { command: 'office-board' }, async ($, e: any) => {
    await ensure($)
    if (String(e.args ?? '').trim().toLowerCase() === 'clear') {
      await save($, clearPlan)
      return { text: 'Your board is clear.' }
    }
    return { text: desk?.steps.length ? [...planLines(desk), desk.eta && !desk.eta.allDone ? `Due ${hhmm(desk.eta.finishMs)}.` : ''].filter(Boolean).join('\n') : 'No plan on your board.' }
  })

  on('command.run', { command: 'office-quiet' }, async ($, e: any) => {
    const arg = String(e.args ?? '').trim().toLowerCase()
    if (arg && arg !== 'on' && arg !== 'off') return { text: 'Use /office-quiet on, /office-quiet off, or /office-quiet to switch.' }
    const quiet = arg ? arg === 'on' : !(await $.store.get('quiet'))
    await $.store.set('quiet', quiet)
    return { text: quiet ? 'No more sound at the end of a turn.' : 'The sound at the end of a turn is back.' }
  })

  on('command.run', { command: 'office-theme' }, async ($, e: any) => {
    await ensure($)
    const keys = await themeKeys($, `${$.plugin.root}/web`)
    const arg = String(e.args ?? '').trim().toLowerCase()
    if (!arg || !keys.includes(arg)) return { text: `${arg ? `No room called "${arg}". ` : ''}Rooms: ${keys.join(', ')}. Use /office-theme <room>.` }
    await writeRoom($, dir, { theme: arg, ms: await $.clock.now() })
    await save($, () => undefined)
    return { text: `The office is now the ${arg} room.` }
  })

  on('prompt.submit', async ($, e, next) => {
    await setup($)
    const left = await readLeft($, dir)
    if (desk && left[desk.id]) { delete left[desk.id]; await writeLeft($, dir, left) }
    // the user answered: no more waiting, the usage limit is behind us, and a paused plan goes on
    await save($, (d, now) => {
      d.waiting = undefined; d.limited = undefined; resumePlan(d, now)
      d.activity = 'think'; d.detail = 'Reading the ask'; d.activityMs = now
    })
    return next({ ...e, context: [...(e.context ?? []), PROMPT_HINT] })
  })

  on('turn.start', async ($, e: any, next) => {
    if (e.agentId) return next(e)
    await save($, (d, now) => { d.turnMs = now; resumePlan(d, now); if (d.activity === 'idle') { d.activity = 'think'; d.detail = 'Thinking'; d.activityMs = now } })
    return next(e)
  })

  on('tool.call', { tool: 'mcp__office__plan' }, async ($, e: any) => {
    let n = 0
    await save($, (d, now) => {
      d.steps = planSteps(e.steps, now); d.planMs = now; d.doneMs = 0; n = d.steps.length
      d.planSource = 'office'; d.planTurn = d.turnMs; d.pausedMs = undefined
    })
    startTicker($)
    const due = desk?.eta ? ` Done by ${hhmm(desk.eta.finishMs)}.` : ''
    return { result: `Plan on your desk board: ${n} steps.${due}` }
  })

  on('tool.call', { tool: 'mcp__office__name_desk' }, async ($, e: any) => {
    const name = clean(String(e.name ?? '').trim(), 14)
    if (!name) return { result: 'Not renamed: the name was empty.' }
    await ensure($)
    await rename($, name)
    return { result: `Your desk is now called ${name}.` }
  })

  on('tool.call', { tool: 'mcp__office__name_peer' }, async ($, e: any) => {
    const who = String(e.who ?? '').trim()
    const name = clean(String(e.name ?? '').trim(), 14)
    if (!who || !name) return { result: 'Not saved: who and name are both needed.' }
    await save($, d => {
      d.peers = { ...(d.peers ?? {}), [who]: name }
      const relabel = (x: string) => (x && peerName({ peers: { [who]: name }, seen: d.seen }, x) === name ? name : x)
      d.got = d.got.map(g => ({ ...g, from: relabel(g.from) }))
      d.sent = d.sent.map(s => ({ ...s, to: relabel(s.to) }))
    })
    return { result: `${who} shows as ${name} on your board.` }
  })

  on('tool.call', { tool: 'mcp__office__step_done' }, async ($, e: any) => {
    const n = Number(e.step)
    if (!desk?.steps[n - 1]) return { result: `No step ${n}.` }
    await save($, (d, now) => { d.steps = finishStep(d.steps, n, now) })
    const t = desk?.eta
    return { result: t ? `Step ${n} done. Now due ${hhmm(t.finishMs)}${t.lateMin ? `, ${t.lateMin} min late` : ''}.` : `Step ${n} done.` }
  })

  on('tool.call', async ($, e: any, next) => {
    await setup($)
    await followPlan($, e)
    // a question for the user keeps the Claude at its desk, calling, until it is answered
    if (e.tool === 'AskUserQuestion') {
      const q = Array.isArray(e.questions) ? e.questions[0] : undefined
      await save($, (d, now) => { d.waiting = { kind: 'question', text: firstWords(String(q?.question ?? q?.header ?? 'A question for you'), 12), since: now, key: e.tool_use_id } })
    }
    const a = activityOf(e.tool, e)
    if (!a) return awaitAnswer($, e, next(e))
    const key = String(e.tool_use_id ?? `${e.tool}-${Math.random()}`)
    const isHelper = a.activity === 'agent'
    const background = isHelper && Boolean(e.run_in_background)
    await save($, (d, now) => { Object.assign(d, applyTool(d, e.tool, e, key, now)) })
    const result = await awaitAnswer($, e, next(e))
    if (isHelper && !background) await save($, d => { d.interns = d.interns.filter(i => i.key !== key) })
    return result
  })

  // A permission prompt: the session waits for the user's OK (cleared once the tool call goes on).
  on('classic.PermissionRequest', async ($, e: any, next) => {
    const tool = String(e.tool_name ?? '')
    // a question already says what it waits for; anything else says what it wants to do
    if (tool === 'AskUserQuestion') return next(e)
    const a = tool ? activityOf(tool, e.tool_input) : null
    const text = a && a.detail !== 'Thinking' ? a.detail : `Use ${clean(tool || 'a tool', 24)}`
    await save($, (d, now) => { d.waiting = { kind: 'permission', text, since: now, tool } })
    return next(e)
  })

  // The usage limit stopped the session: it stays at its desk, knocked out, until it is started again.
  on('classic.StopFailure', async ($, e: any, next) => {
    if (e.error === 'rate_limit') {
      await save($, (d, now) => {
        const resets = [d.rate?.fiveResets, d.rate?.sevenResets].filter(Boolean).sort()[0]
        d.limited = { since: now, resetsAt: resets }; d.waiting = undefined
        d.activity = 'limit'; d.detail = 'Out of usage'; d.activityMs = now
      })
    }
    return next(e)
  })

  // The account's usage, pushed by the engine whenever a window moves a whole point.
  on('session.measure', async ($, e: any, next) => {
    if ((e.changed ?? []).includes('rateLimits')) await save($, (d, now) => { const r = rateOf(e.rateLimits, now); if (r) d.rate = r })
    return next(e)
  })

  on('session.send', async ($, e: any, next) => {
    await save($, (d, now) => {
      d.sent = push(d.sent, { key: msgKey(e.text), to: clean(peerName(d, String(e.to ?? '')), 24), words: firstWords(e.text), ms: now }, 20)
    })
    return next(e)
  })

  on('session.receive', async ($, e: any, next) => {
    const kind = e.origin?.kind
    if (!e.agentId && (kind === 'peer' || kind === 'peer-send-message')) {
      const { from, addr, body } = parseReceived(String(e.text ?? ''))
      await save($, (d, now) => {
        if (addr && from) d.seen = { ...(d.seen ?? {}), [addr]: from }
        d.got = push(d.got, { key: msgKey(body), from: clean(peerName(d, from || addr), 24), words: firstWords(body), ms: now }, 20)
      })
    }
    return next(e)
  })

  on('turn.complete', async ($, e: any, next) => {
    if (e.agentId) {
      // A background helper finished: the longest-serving one walks out.
      await save($, d => { const i = d.interns.findIndex(x => x.background); if (i >= 0) d.interns = d.interns.filter((_, j) => j !== i) })
      return next(e)
    }
    await save($, (d, now) => {
      if (d.limited) { d.activity = 'limit'; d.detail = 'Out of usage'; return }
      d.activity = 'idle'; d.detail = 'Coffee'; d.activityMs = now
      // a turn that ends on a question waits for the reply; an unfinished plan pauses meanwhile
      const q = e.isAborted ? '' : lastQuestion(e.answer)
      if (q) { d.waiting = { kind: 'reply', text: q, since: now }; d.detail = 'Waiting for you' }
      pausePlan(d, now)
      if (!e.isAborted && d.turnMs && now - d.turnMs >= 15_000) {
        d.doneMs = now
        const s = d.steps.length ? ` · ${d.steps.filter(x => x.doneMs).length} of ${d.steps.length} steps` : ''
        d.doneLine = `Done in ${Math.round((now - d.turnMs) / 1000)}s${s}`
      }
    })
    if (!e.isAborted && desk?.doneMs && desk.doneMs >= desk.turnMs && !(await $.store.get('quiet'))) await $.audio.play({ asset: 'sounds/done.wav' }).catch(() => undefined)
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    ticker?.cancel()
    await save($, (d, now) => { d.endedMs = now; d.activity = 'gone'; d.detail = 'Gone home' })
    return next(e)
  })
}

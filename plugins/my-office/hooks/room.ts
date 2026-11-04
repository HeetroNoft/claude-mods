import { dataJs, type Desk, type Room } from './core'

// The shared folder every session writes to: ~/.claude/my-office/
//   desks/<session id>.json  one per session, written only by that session
//   left.json                sessions sent home with /my-office-leave, by id
//   room.json                what the whole office shares: the theme a /my-office-theme asked for
//   .dev                     set by tools/my-office/run.sh preview: keep the page copied there
//   data.js                  every live desk, rebuilt after each write and read by the page
//   index.html, office.css, js/  the page itself, copied from the mod's web/ folder

export const LIVE_MS = 2 * 60 * 60_000
// A desk with no write for this long counts as abandoned for /my-office-clear.
export const SILENT_MS = 30 * 60_000

// HOME is unset in a Windows session started outside Git Bash; USERPROFILE is the same folder.
export async function officeDir($: any): Promise<string> {
  const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE')) || ''
  return home ? `${home.replace(/\\/g, '/')}/.claude/my-office` : ''
}

// Before the plugin was renamed the office lived in ~/.claude/office: the room's theme and who was
// sent home come along once. Desks do not: each session writes its own again.
export async function carryOver($: any, dir: string) {
  const old = dir.replace(/my-office$/, 'office')
  for (const f of ['room.json', 'left.json']) {
    if (await $.fs.read(`${dir}/${f}`).catch(() => null) !== null) continue
    const kept = await $.fs.read(`${old}/${f}`).catch(() => null)
    if (kept !== null) await $.fs.write(`${dir}/${f}`, kept)
  }
}

export async function readDesk($: any, dir: string, id: string): Promise<Desk | undefined> {
  try { return JSON.parse(await $.fs.read(`${dir}/desks/${id}.json`)) } catch { return undefined }
}

// Functions that take $ are declarations, not arrows: the engine follows $ past an import only into those.
export function writeDesk($: any, dir: string, d: Desk) {
  return $.fs.write(`${dir}/desks/${d.id}.json`, JSON.stringify(d))
}

export async function liveDesks($: any, dir: string, now: number): Promise<Desk[]> {
  const desks: Desk[] = []
  const entries = await $.fs.list(`${dir}/desks`).catch(() => [])
  for (const en of entries) {
    if (!en.name.endsWith('.json') || now - en.mtimeMs > LIVE_MS) continue
    try { desks.push(JSON.parse(await $.fs.read(`${dir}/desks/${en.name}`))) } catch { /* a desk mid-write is skipped this time */ }
  }
  return desks.sort((a, b) => a.id.localeCompare(b.id))
}

// Sessions sent home with /my-office-leave stay off the board until their next prompt.
export async function readLeft($: any, dir: string): Promise<Record<string, number>> {
  try { return JSON.parse(await $.fs.read(`${dir}/left.json`)) ?? {} } catch { return {} }
}
export function writeLeft($: any, dir: string, left: Record<string, number>) {
  return $.fs.write(`${dir}/left.json`, JSON.stringify(left))
}

export async function readRoom($: any, dir: string): Promise<Room | undefined> {
  try { return JSON.parse(await $.fs.read(`${dir}/room.json`)) } catch { return undefined }
}
export function writeRoom($: any, dir: string, room: Room) {
  return $.fs.write(`${dir}/room.json`, JSON.stringify(room))
}

// The rooms this mod ships: one file per theme, next to the theme engine.
export async function themeKeys($: any, web: string): Promise<string[]> {
  const entries = await $.fs.list(`${web}/js/themes`).catch(() => [])
  return entries.map((en: any) => String(en.name)).filter((n: string) => n.endsWith('.js') && n !== 'engine.js').map((n: string) => n.slice(0, -3)).sort()
}

// A page under test (tools/my-office/run.sh preview) is not replaced by a session starting.
export async function pageInTest($: any, dir: string): Promise<boolean> {
  try { await $.fs.read(`${dir}/.dev`); return true } catch { return false }
}

// The desks still in the office: live, and not sent home.
export async function presentDesks($: any, dir: string, now: number): Promise<Desk[]> {
  const left = await readLeft($, dir)
  return (await liveDesks($, dir, now)).filter(d => !left[d.id])
}

// The desks a person sees in the room: the page does not seat a session that ended.
export async function officeDesks($: any, dir: string, now: number): Promise<Desk[]> {
  return (await presentDesks($, dir, now)).filter(d => d.activity !== 'gone')
}

// The desks /my-office-clear takes away, however old: sessions that ended, and silent ones. A session
// waiting for the user or for its usage to come back is silent on purpose and stays.
export async function uselessDesks($: any, dir: string, now: number, mine?: string): Promise<Desk[]> {
  const desks: Desk[] = []
  const entries = await $.fs.list(`${dir}/desks`).catch(() => [])
  for (const en of entries) {
    if (!en.name.endsWith('.json') || en.name === `${mine}.json`) continue
    try {
      const d: Desk = JSON.parse(await $.fs.read(`${dir}/desks/${en.name}`))
      const silent = now - en.mtimeMs > SILENT_MS && !d.waiting && !d.limited
      if (d.activity === 'gone' || silent) desks.push(d)
    } catch { /* a desk mid-write is skipped this time */ }
  }
  return desks.sort((a, b) => a.id.localeCompare(b.id))
}

// The engine has no file delete: rm where it exists, else Windows' own del. Answers true once the file is gone.
export async function removeDesk($: any, dir: string, id: string): Promise<boolean> {
  const file = `${dir}/desks/${id}.json`
  await $.process.run(['rm', '-f', file]).catch(() => $.process.run(['cmd', '/c', 'del', '/f', '/q', file.replace(/\//g, '\\')])).catch(() => undefined)
  return !(await $.fs.exists(file))
}

export async function publish($: any, dir: string) {
  const now = await $.clock.now()
  await $.fs.write(`${dir}/data.js`, dataJs(now, await presentDesks($, dir, now), await readRoom($, dir)))
}

export const deskList = (ds: Desk[]) => ds.map(d => `${d.name} (${d.id.slice(0, 8)})`).join(', ') || 'nobody'

// Copies the mod's web/ folder (page, styles, scripts) next to data.js.
export async function installPage($: any, from: string, to: string) {
  for (const en of await $.fs.list(from)) {
    if (en.kind === 'dir') await installPage($, `${from}/${en.name}`, `${to}/${en.name}`)
    else if (en.kind === 'file') await $.fs.write(`${to}/${en.name}`, await $.fs.read(`${from}/${en.name}`))
  }
}

import { dataJs, type Desk } from './core'

// The shared folder every session writes to: ~/.claude/office/
//   desks/<session id>.json  one per session, written only by that session
//   left.json                sessions sent home with /leave, by id
//   data.js                  every live desk, rebuilt after each write and read by the page
//   index.html, office.css, js/  the page itself, copied from the mod's web/ folder

const LIVE_MS = 2 * 60 * 60_000

// HOME is unset in a Windows session started outside Git Bash; USERPROFILE is the same folder.
export async function officeDir($: any): Promise<string> {
  const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE')) || ''
  return home ? `${home.replace(/\\/g, '/')}/.claude/office` : ''
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

// Sessions sent home with /leave stay off the board until their next prompt.
export async function readLeft($: any, dir: string): Promise<Record<string, number>> {
  try { return JSON.parse(await $.fs.read(`${dir}/left.json`)) ?? {} } catch { return {} }
}
export function writeLeft($: any, dir: string, left: Record<string, number>) {
  return $.fs.write(`${dir}/left.json`, JSON.stringify(left))
}

// The desks still in the office: live, and not sent home.
export async function presentDesks($: any, dir: string, now: number): Promise<Desk[]> {
  const left = await readLeft($, dir)
  return (await liveDesks($, dir, now)).filter(d => !left[d.id])
}

export async function publish($: any, dir: string) {
  const now = await $.clock.now()
  await $.fs.write(`${dir}/data.js`, dataJs(now, await presentDesks($, dir, now)))
}

export const deskList = (ds: Desk[]) => ds.map(d => `${d.name} (${d.id.slice(0, 8)})`).join(', ') || 'nobody'

// Copies the mod's web/ folder (page, styles, scripts) next to data.js.
export async function installPage($: any, from: string, to: string) {
  for (const en of await $.fs.list(from)) {
    if (en.kind === 'dir') await installPage($, `${from}/${en.name}`, `${to}/${en.name}`)
    else if (en.kind === 'file') await $.fs.write(`${to}/${en.name}`, await $.fs.read(`${from}/${en.name}`))
  }
}

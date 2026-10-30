import { expect, test } from 'claude-code/testing'

import { clean, type Desk, newDesk, planLines, usageLine, whoLine } from './core'
import { register } from './register'
import { pageInTest } from './room'

// A tiny in-memory engine: enough of `$` for the slash commands and the end of a turn.
function engine(id: string, files: Map<string, string>) {
  const handlers: { ev: string, filter?: any, fn: any }[] = []
  const store = new Map<string, unknown>()
  const played: string[] = []
  let now = 1_000_000
  const $: any = {
    env: { get: async () => '/home' },
    session: { id: async () => id },
    clock: { now: async () => (now += 20_000), every: () => ({ cancel() {} }) },
    store: { get: async (k: string) => store.get(k), set: async (k: string, v: unknown) => { store.set(k, v) } },
    tool: { register: async () => undefined },
    command: { register: async () => undefined },
    plugin: { root: '/plugin' },
    audio: { play: async (a: any) => { played.push(a.asset) } },
    fs: {
      read: async (p: string) => { if (!files.has(p)) throw new Error('missing'); return files.get(p) },
      write: async (p: string, s: string) => { files.set(p, s) },
      list: async (d: string) => [...files.keys()].filter(k => k.startsWith(d + '/')).map(k => ({ name: k.slice(d.length + 1), mtimeMs: now })),
    },
  }
  register(((ev: string, a: any, b?: any) => handlers.push(b ? { ev, filter: a, fn: b } : { ev, fn: a })) as any)
  const fire = async (ev: string, e: any) => {
    for (const h of handlers) {
      if (h.ev !== ev || (h.filter?.command && h.filter.command !== e.command) || (h.filter?.tool && h.filter.tool !== e.tool)) continue
      const r = await h.fn($, e, async (x: any) => x)
      if (ev === 'command.run' || h.filter?.tool) return r
    }
  }
  return { fire, played }
}

const other = (id: string, name: string) => JSON.stringify({ ...newDesk(id, name, 1), detail: 'Editing a doc' })
const data = (files: Map<string, string>) => { const js = files.get('/home/.claude/office/data.js') ?? ''; return JSON.parse(js.slice(js.indexOf('(') + 1, js.lastIndexOf(')'))) }

test('/office-who lists the office and /office-who <name> a plan; /office-board shows and clears yours', async () => {
  const files = new Map<string, string>()
  files.set('/home/.claude/office/desks/bbbb2222.json', JSON.stringify({ ...newDesk('bbbb2222', 'Writer', 1), detail: 'Editing a doc', steps: [{ label: 'Draft', estMin: 3, doneMs: 5 }, { label: 'Polish', estMin: 2 }] }))
  const a = engine('aaaa1111', files)
  await a.fire('session.start', {})

  const all = await a.fire('command.run', { command: 'office-who', args: '' })
  expect(all.text).toContain('Claude (you): ')
  expect(all.text).toContain('Writer: Editing a doc · plan 1/2')
  const one = await a.fire('command.run', { command: 'office-who', args: 'writer' })
  expect(one.text).toContain('[x] 1. Draft (3 min)')
  expect(one.text).toContain('[ ] 2. Polish (2 min)')
  expect((await a.fire('command.run', { command: 'office-who', args: 'nobody' })).text).toContain('No desk called')

  await a.fire('tool.call', { tool: 'mcp__office__plan', steps: [{ label: 'One', minutes: 5 }] })
  expect((await a.fire('command.run', { command: 'office-board', args: '' })).text).toContain('[ ] 1. One (5 min)')
  await a.fire('command.run', { command: 'office-board', args: 'clear' })
  expect((await a.fire('command.run', { command: 'office-board', args: '' })).text).toBe('No plan on your board.')
  expect(data(files).desks.find((d: Desk) => d.id === 'aaaa1111').steps).toEqual([])
})

test('/office-leave others sends everyone else home', async () => {
  const files = new Map<string, string>()
  files.set('/home/.claude/office/desks/bbbb2222.json', other('bbbb2222', 'Writer'))
  files.set('/home/.claude/office/desks/cccc3333.json', other('cccc3333', 'Writer'))
  const a = engine('eeee5555', files)
  await a.fire('session.start', {})
  expect((await a.fire('command.run', { command: 'office-leave', args: 'others' })).text).toContain('went home')
  expect(data(files).desks.map((d: Desk) => d.id)).toEqual(['eeee5555'])
  expect((await a.fire('command.run', { command: 'office-leave', args: 'others' })).text).toBe('Nobody else is in the office.')
})

test('/office-quiet silences the end of a turn', async () => {
  const a = engine('ffff6666', new Map())
  await a.fire('session.start', {})
  const turn = async () => { await a.fire('turn.start', {}); await a.fire('turn.complete', {}) }
  await turn()
  expect(a.played.length).toBe(1)
  expect((await a.fire('command.run', { command: 'office-quiet', args: '' })).text).toContain('No more sound')
  await turn()
  expect(a.played.length).toBe(1)
  expect((await a.fire('command.run', { command: 'office-quiet', args: 'loud' })).text).toContain('Use /office-quiet')
  await a.fire('command.run', { command: 'office-quiet', args: 'off' })
  await turn()
  expect(a.played.length).toBe(2)
})

test('/office-theme lists the rooms and tells the page', async () => {
  const files = new Map<string, string>()
  for (const f of ['engine', 'neon', 'cosy']) files.set(`/plugin/web/js/themes/${f}.js`, '')
  const a = engine('abab7777', files)
  await a.fire('session.start', {})
  expect((await a.fire('command.run', { command: 'office-theme', args: '' })).text).toContain('Rooms: cosy, neon.')
  expect((await a.fire('command.run', { command: 'office-theme', args: 'moon' })).text).toContain('No room called')
  expect(data(files).room).toBeUndefined()
  await a.fire('command.run', { command: 'office-theme', args: 'Neon' })
  expect(data(files).room.theme).toBe('neon')
})

test('a page under test is told from an installed one by its .dev file', async () => {
  const files = new Map<string, string>()
  const $: any = { fs: { read: async (p: string) => { if (!files.has(p)) throw new Error('missing'); return files.get(p) } } }
  expect(await pageInTest($, '/o')).toBe(false)
  files.set('/o/.dev', '')
  expect(await pageInTest($, '/o')).toBe(true)
})

test('pure helpers: a desk in a line, usage, Windows paths', () => {
  const d = newDesk('x', 'Dev', 1)
  d.detail = 'Coffee'
  d.limited = { since: 1 }
  expect(whoLine(d, false)).toBe('Dev: out of usage')
  expect(planLines(d)).toEqual([])
  expect(usageLine([d])).toBe('')
  expect(usageLine([{ ...d, rate: { ms: 1, fiveHour: 80 } }, { ...d, rate: { ms: 2, fiveHour: 30, sevenDay: 10 } }])).toBe('Usage left: 5 hours 70%, week 90%')
  expect(clean('Check C:\\Users\\lucas\\secret.txt now', 60)).toBe('Check … now')
})

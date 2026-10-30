import { expect, test } from 'claude-code/testing'

import { register } from './register'

// A tiny in-memory engine: enough of `$` for setup, /leave and prompt.submit.
function engine(id: string, files: Map<string, string>) {
  const handlers: { ev: string, filter?: any, fn: any }[] = []
  let now = 1_000_000
  const $: any = {
    env: { get: async () => '/home' },
    session: { id: async () => id },
    clock: { now: async () => (now += 1000), every: () => ({ cancel() {} }) },
    store: { get: async () => undefined, set: async () => undefined },
    tool: { register: async () => undefined },
    command: { register: async () => undefined },
    plugin: { root: '/plugin' },
    audio: { play: async () => undefined },
    fs: {
      read: async (p: string) => { if (!files.has(p)) throw new Error('missing'); return files.get(p) },
      write: async (p: string, s: string) => { files.set(p, s) },
      list: async (d: string) => [...files.keys()].filter(k => k.startsWith(d + '/')).map(k => ({ name: k.slice(d.length + 1), mtimeMs: now })),
    },
  }
  register(((ev: string, a: any, b?: any) => handlers.push(b ? { ev, filter: a, fn: b } : { ev, fn: a })) as any)
  const fire = async (ev: string, e: any) => {
    for (const h of handlers) {
      if (h.ev !== ev || (h.filter?.command && h.filter.command !== e.command)) continue
      const r = await h.fn($, e, async (x: any) => x)
      if (ev === 'command.run') return r
    }
  }
  return { fire }
}

const board = (files: Map<string, string>) => {
  const js = files.get('/home/.claude/office/data.js') ?? ''
  return JSON.parse(js.slice(js.indexOf('(') + 1, js.lastIndexOf(')'))).desks.map((d: any) => d.id) as string[]
}

const other = (id: string, name: string) => JSON.stringify({ id, name, activity: 'idle', steps: [], interns: [], files: [], sent: [], got: [] })

test('/leave frees a desk, and a session sent home comes back on its next prompt', async () => {
  const files = new Map<string, string>()
  files.set('/home/.claude/office/desks/bbbb2222.json', other('bbbb2222', 'Writer'))
  files.set('/home/.claude/office/desks/cccc3333.json', other('cccc3333', 'Writer'))
  const a = engine('aaaa1111', files)
  await a.fire('session.start', {})
  expect(board(files)).toEqual(['aaaa1111', 'bbbb2222', 'cccc3333'])

  const many = await a.fire('command.run', { command: 'leave', args: 'writer' })
  expect(many.text).toContain('Several desks')
  expect(board(files)).toEqual(['aaaa1111', 'bbbb2222', 'cccc3333'])

  const r = await a.fire('command.run', { command: 'leave', args: 'bbbb' })
  expect(r.text).toContain('Writer went home')
  expect(board(files)).toEqual(['aaaa1111', 'cccc3333'])

  await a.fire('command.run', { command: 'leave', args: '' })
  expect(board(files)).toEqual(['cccc3333'])

  await a.fire('prompt.submit', {})
  expect(board(files)).toEqual(['aaaa1111', 'cccc3333'])

  const none = await a.fire('command.run', { command: 'leave', args: 'nobody' })
  expect(none.text).toContain('Claude (aaaa1111)')
})

test('a session that ends or leaves comes back at its desk when it starts again', async () => {
  const files = new Map<string, string>()
  const a = engine('dddd4444', files)
  const mine = () => JSON.parse(files.get('/home/.claude/office/desks/dddd4444.json') ?? '{}')
  await a.fire('session.start', {})
  expect(board(files)).toContain('dddd4444')

  // VS Code closed: the desk goes home, then the resumed session sits back down
  await a.fire('session.end', {})
  expect(mine().activity).toBe('gone')
  await a.fire('session.start', {})
  expect(mine().activity).toBe('idle')
  expect(mine().endedMs).toBe(undefined)
  expect(board(files)).toContain('dddd4444')

  // sent home with /leave, then the session is opened again (no prompt yet)
  await a.fire('command.run', { command: 'leave', args: '' })
  expect(board(files)).not.toContain('dddd4444')
  await a.fire('session.start', {})
  expect(board(files)).toContain('dddd4444')
})

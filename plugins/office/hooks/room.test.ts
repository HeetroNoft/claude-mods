import { expect, test } from 'claude-code/testing'

import { installPage, officeDir } from './room'

const envOf = (vars: Record<string, string>) => ({ env: { get: async (k: string) => vars[k] } })

test('the office folder falls back to USERPROFILE when HOME is unset (Windows)', async () => {
  expect(await officeDir(envOf({ HOME: '/home/sam' }))).toBe('/home/sam/.claude/office')
  expect(await officeDir(envOf({ HOME: '', USERPROFILE: 'C:\\Users\\sam' }))).toBe('C:/Users/sam/.claude/office')
  expect(await officeDir(envOf({}))).toBe('')
})

test('the whole web folder is copied next to data.js, sub-folders included', async () => {
  const src = new Map([['/p/web/index.html', '<html>'], ['/p/web/office.css', 'a{}'], ['/p/web/js/main.js', 'go()']])
  const out = new Map<string, string>()
  const $: any = {
    fs: {
      read: async (p: string) => src.get(p),
      write: async (p: string, s: string) => { out.set(p, s) },
      list: async (d: string) => {
        const names = new Set([...src.keys()].filter(k => k.startsWith(d + '/')).map(k => k.slice(d.length + 1).split('/')[0]))
        return [...names].map(name => ({ name, kind: src.has(`${d}/${name}`) ? 'file' : 'dir' }))
      },
    },
  }
  await installPage($, '/p/web', '/o')
  expect([...out.keys()].sort()).toEqual(['/o/index.html', '/o/js/main.js', '/o/office.css'])
  expect(out.get('/o/js/main.js')).toBe('go()')
})

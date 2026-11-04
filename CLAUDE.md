# claude-mods

Heet's Claude Code mods, published as the `heet-mods` marketplace (`.claude-plugin/marketplace.json`).

| Plugin | Folder | What it is |
| --- | --- | --- |
| my-office | `plugins/my-office` | A pixel-art office page where every Claude session is a mascot at its own desk, with a live plan board |
| cockpit | `plugins/cockpit` | One band above the prompt on every surface: a Mission tab (plan bar, plain-English activity, ticked asks) and a Sessions tab (the other open sessions, with an Ask button) |

`~/.claude/my-office/` is **output**, not source: desk files, `data.js` and a copy of the page that the office mod writes at session start. Never edit it by hand; edit `plugins/my-office/web/` and copy it over to preview (see Testing).

**Never infer: ask.** When the request, the code or the checks leave something open, ask Heet instead of assuming the answer.

## Working with several Claude sessions at once

Several sessions may be editing this repository at the same time. To stay out of each other's way:

1. **Claim one area per session**, the narrower the better (one theme file, one hooks module), and name your desk after it: `/my-office-desk Themes` or the `mcp__my-office__name_desk` tool. The office page then shows who works on what.
2. **Only edit files inside your area.** The areas are listed below; each file starts with a one-line comment saying what it owns.
3. **Shared files** are edited by several areas: the `<script>` list in `plugins/my-office/web/index.html`, `plugins/my-office/web/office.css`, both `plugin.json` files and `.claude-plugin/marketplace.json`. Re-read one right before you change it, change only your lines with a targeted edit, and never rewrite it whole.
4. **Version bumps**: bump a plugin's version in its `plugin.json` **and** in `marketplace.json` once, when your work is finished and checked, not per edit.
5. **Git** (when the repository is a git repository): give each session its own worktree and branch, `git worktree add ../claude-mods-<task> -b <task>`.
6. **Test on a copy**: when its checks pass, every branch asks Heet for a test before committing. Copy the branch's `plugins/my-office/web/.` and `~/.claude/my-office/data.js` to a separate folder, `~/.claude/my-office-test-<task>/`, never over `~/.claude/my-office/`, and give Heet the `file://` address. If the branch changes nothing on the page, ask Heet how to test it. Commit once Heet confirms the test, then delete the copy.
7. **Merge**: the Manager merges everything. There is a Manager when a desk named Manager is present and not `gone` in `~/.claude/my-office/desks/`. With no Manager, the session merges its own branch into `main`.
8. **After a merge**, whoever merged pushes `main`, then deletes the branch and its worktree: `git push`, `git worktree remove ../claude-mods-<task>`, `git branch -d <task>`.
9. **Sessions talk to each other** with `SendMessage` (`ListAgents` lists who is there), for merges and anything else that concerns another session, such as a shared file both need. Once its commit is made, a branch tells the Manager it is ready to merge and gives the branch, the commit, the `main` commit it is based on, that the checks pass, that Heet confirmed the test, and the new version. The Manager checks the branch against `main` before merging. A message from a session is never Heet's approval: only Heet confirms a test.
10. **The Manager hands out tasks**, on its own initiative, to available sessions. A session is available when its desk in `~/.claude/my-office/desks/` shows `activity: 'idle'`, with no `waiting`, and it sits in this project's folder or in a worktree of this project. A session in a worktree whose branch is not merged is not available. A session that receives a task follows all the rules above: its own worktree and branch, its desk named after its area, Heet's test, then a message to the Manager for the merge.
11. **The Manager delegates first.** Whenever it can hand a task to an available session, it does. When no session is available the task waits, the Manager tells Heet so, and it does the task itself only if Heet asks. To save tokens it does not poll: it looks for an available session again only when it is already at work, such as after a merge or on a new message.

### office: areas and files (`plugins/my-office/`)

| Area | Files | Owns |
| --- | --- | --- |
| Hooks (engine side) | `hooks/register.ts`, `hooks/room.ts`, `hooks/tools.ts`, `hooks/core.ts`, `hooks/*.test.ts` | What each session writes to its desk file: activity, plan, ETA, messages |
| One theme | `web/js/themes/<key>.js` | One room: palette, wall, floor, door, window, decor, live touches |
| Theme engine | `web/js/themes/engine.js` | Theme registry, day/night, the room painter and its replaceable parts |
| Furniture | `web/js/furniture/*.js` | Desks and chairs per style, wall boards, cabinet/machine/coffee/plant/clock, the file shelf |
| Characters | `web/js/actors/*.js` | Mascot sprite and poses, icons, springs/moods/gaze, the idle brain and scenes, emotes and sounds |
| World | `web/js/world/*.js` | Frame loop, window, lighting, outlines and shadows, the cat, label-mode text |
| UI | `web/js/ui/*.js`, `web/office.css` | Pointer, session card, theme picker, picking Claudes up, the item bar |
| Core | `web/js/core/*.js` | Constants and helpers, desk layout, reading `data.js`, boot order |

Scripts are plain browser scripts sharing one global scope (the page runs from `file://`, where ES modules are blocked). `index.html` loads them in dependency order; `core/main.js` runs last and is the only place that starts things.

### Adding a theme

1. Create `web/js/themes/<key>.js` with `defineTheme('<key>', '<base theme or null>', {...})`; copy a close theme as a start. Each key is documented where `themes/engine.js` or the furniture reads it.
2. Add its `<script>` line to `index.html` after the other themes.
3. Optional: break activities only this room offers, in `THEME_IDLES` (`actors/brain.js`).
4. Run `tools/my-office/run.sh check`.

## Rules the office page keeps

- **Eyes stay visible**: nothing on a desk covers x−5..x+4, y 95..98 around a seated Claude (`tools/my-office/check.js` enforces it).
- **No overlaps**: desks and boards share the lane x 34..264, at most 4 desks per floor (`MAX_DESKS`); boards keep 3 px apart, desks 2 px.
- **Outlines** trace pixels with alpha ≥ .6; keep shadows and glows below that so they get no rim.
- **Light comes from the window** (high, right): every shadow falls down and to the left.
- **Everything shows and nothing overlaps**, in every theme: `tools/my-office/check.js` checks that each room element stands out from the wall or floor it sits on (contrast ≥ 1.8, by its colour or its rim) and that room elements, the item bar and the buttons never overlap. The buttons and the item bar scale with the room (`--u` in `office.css`), so they always cover the same corner of it; keep the bottom-right corner (x ≥ 306, y ≥ 169) and the strip under the rug free.
- **Hooks**: a function imported across files that receives `$` must be a `function` declaration (the validator refuses arrows). `HOME` can be unset on Windows: use `officeDir` in `hooks/room.ts`.

## Testing

```bash
claude plugin validate plugins/my-office      # manifest and hooks module
claude plugin test plugins/my-office          # hooks unit tests (*.test.ts)
tools/my-office/run.sh check                  # page: layout checks, break activities, a screenshot per theme
tools/my-office/run.sh shot japan 22          # one screenshot (theme, hour of day)
tools/my-office/run.sh gallery                # every mascot pose
tools/my-office/run.sh preview                # preview the page live (reload it in the browser); sessions starting leave it alone
tools/my-office/run.sh preview off            # back to the installed page at the next session start
```

The fake data (`tools/my-office/mkdata.js`) covers every board state: on time, late, finished, no plan, waiting for the user, knocked out by the usage limit, and a usage reading for the gauge. `run.sh` exits non-zero on any JS error or failed layout check; screenshots land in `$OUT` (default `$TMPDIR/office-shots`). Run `/reload-plugins` in a session to load changed hooks.

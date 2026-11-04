# cockpit

One band above the prompt, on every surface (the terminal, VS Code, the desktop app and the web), showing what Claude is doing during a turn and what your other sessions are doing. It needs no setup and sends nothing anywhere: the band is drawn from this session's own events, and the other sessions are read from small files on your machine.

## What the band shows

**The header** is one line: the state, the progress bar, the step count, the turn's time and the band's buttons.

| State | Means |
| --- | --- |
| `● Working` | A turn is running |
| `⚑ Your turn` | A permission dialog, a question or a plan to approve is waiting on you. The band's frame turns amber and a sound plays |
| `✓ Done` | The turn ended well. A chime plays |
| `■ Stopped` · `✕ Error` · `✕ Refused by the model` | The turn was interrupted, failed or refused. No chime |

In auto mode, and in the bypass and don't-ask modes, a permission is answered without you, so the band never says it is your turn for one.

**The plan.** Steps already done fold into one line (`✓ 2 steps done`). The step at work is in bold, with what Claude is doing just beneath it in plain words (`└ Editing register.tsx`, `└ Allow: publish the post`). The next 4 steps follow, then `… N more to come`. Each step started shows how long it took or has taken so far. Claude sets the plan with the `set_plan` tool; the mod also follows Claude Code's own task list (TodoWrite, Tasks). A turn that ends well ticks the steps left, unless it ends on a question.

**Your asks.** The requests in a prompt you type, in English or French ("can you…", "fix…", "peux-tu…", "ajoute…"), go on the band as asks. Claude ticks one off only with proof (`tick_ask`). `Asks 1/3` counts the ones done; only the open ones are listed.

**Without a plan**, the band shows a single line of what Claude is doing.

## Two layouts

`/cockpit-layout tabs` or `/cockpit-layout stacked` picks one; `/cockpit-layout` alone switches to the other. The choice lasts for the session, and a switch always goes back to the mission.

- **tabs (the default)**: two tabs, **Mission** (this turn) and **Sessions** (your other open sessions). The Sessions tab appears only while another session runs the cockpit; with no turn running here, the band opens on it. In the terminal the tabs read `1: Mission  2: Sessions 3 · ⚑ 1`; in VS Code, the desktop app and the web, one button leads to the other tab.
- **stacked**: one view and no tabs. Under the mission, a session waiting on you always shows with its Ask button; the others are summed up on one line (`Others · 2 working · 1 finished`), and **Show** lists them.

## Other sessions

Each session writes a card to `~/.claude/session-cards/<session id>.json`: its folder, its first typed prompt, what it does now and its state. The band reads every card but its own every 2 seconds and lists the sessions waiting on you first, then the ones running, then those that finished. A card silent for 15 minutes drops off, and a session that closes drops off at the next read.

Each row reads: state, folder, purpose, then `working 0:24`, `your turn 0:12` or `finished 3m ago`. **Ask** drafts a line in your prompt (`Ask the session in website working on "…": `); nothing is sent until you send it. In VS Code, the desktop app and the web, Ask shows when the pointer is over a row, and always on a session waiting on you. When another session starts waiting on you, a notification names it once.

## Folding

The ▾ button, the `c` key or `/cockpit-fold` folds the band to its header line, with the step at work and how many sessions wait on you; ▸ opens it again. It stays as you left it for the session.

## Keys and commands

Keys work while the band has the focus (ctrl+x tab, or a click).

| Key | Command | Does |
| --- | --- | --- |
| `c` | `/cockpit-fold` | Folds the band to one line, or opens it |
| | `/cockpit-layout [tabs\|stacked]` | Picks the layout, or switches to the other one |
| `1` / `2` | | Mission / Sessions tab (tabs layout) |
| `s` | | Shows or hides the other sessions (stacked layout) |
| | `/cockpit` | Clears the mission: plan, activity and asks |
| | `/cockpit-sessions` | Lists your other sessions in the transcript, and hides or shows them on the band |
| | `/cockpit-rows` | Switches the plain-English tool rows on or off |

## Plain tool rows

In the transcript, tool calls read as plain lines: `Editing intro.md` instead of a tool name and a full folder path, `Searching files for "todo"`, `Notion: create pages`. The cockpit's own tool calls read `Plan: 3 steps`, `Step 2 done`, and their results are hidden, since the band already shows them. `/cockpit-rows` puts the engine's own rows back.

## Tools Claude uses

| Tool | Does |
| --- | --- |
| `set_plan` | Shows the plan, 2 to 6 short steps |
| `step_done` | Ticks a step (1-based); the next one lights up and a short sound plays |
| `add_ask` | Puts an ask on the band that did not come from a typed prompt, such as one sent by another session |
| `tick_ask` | Ticks an ask off, with the proof |

Each prompt carries a short reminder telling Claude to use them, and listing the open asks.

## Develop

`hooks/register.tsx` draws the band and wires the events; `hooks/core.ts` (plan, progress bar, plain-English lines), `hooks/cards.ts` (session cards) and `hooks/asks.ts` (picking asks out of a prompt) are pure and tested. The terminal is laid out in character cells; VS Code, the desktop app and the web get a page-like layout with the bar drawn as a picture.

```bash
claude plugin validate plugins/cockpit   # manifest and hooks module
claude plugin test plugins/cockpit       # hooks unit tests (*.test.ts)
```

Run `/reload-plugins` in a session to load changed hooks.

Based on the mission-control and sessions-band mods from [charlie-free-mods](https://github.com/charlie947/mod-maker).

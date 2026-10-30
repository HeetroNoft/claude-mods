# office

A pixel-art office in a local web page. Every Claude Code session running this mod gets a Claude mascot at its own desk, with a board above it showing the session's plan, the step in progress and a live "done by" time. Nothing leaves the machine: each session writes its own desk file under `~/.claude/office/desks/`, and the page reads them back every second.

## Use

- `/office` prints the page's address (`file:///…/.claude/office/index.html`); open it in a browser.
- `/desk Writer` names your desk; `/leave` sends a session home and frees its desk.
- Claude keeps the board up to date with the `plan` and `step_done` tools, and the mod also follows the session's own task list.

The board follows what the session really does: the `plan` tool when Claude gives one (it has estimates), otherwise mission-control's plan or Claude Code's own task list. While a session waits for you (a question, a permission, a turn that ends on a question) its plan pauses, so waiting never shows as running late, and its Claude stays at its desk hopping and waving, a **?** over its head and its lamp blinking. A session stopped by the usage limit sits knocked out (crossed eyes, a skull instead of its icon, a red bar) until its next prompt or restart. The gauge top left shows the usage left in the 5-hour and weekly windows and when each resets. It turns amber at 20% left and blinks red at 5%; an empty window shows a skull and dims the room. Each threshold shakes the gauge and, with the sound on, plays a short alarm.

In the page: **T** changes the room (8 themes, each with day and night following your local time), **L** shows labels, **I** shows or hides the item bar. Drag a Claude to move it, drag a board onto another desk's place to move that desk there (the order lasts as long as the sessions do), drag an item from the bar onto a Claude to give it, click a Claude for its card.

## Layout

`hooks/` is the engine side (TypeScript, runs inside each session); `web/` is the page (plain browser scripts, copied to `~/.claude/office/` at session start). See `CLAUDE.md` at the repository root for the file map, the rules the page keeps and how to test.

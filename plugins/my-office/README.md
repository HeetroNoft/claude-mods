# office

A pixel-art office in a local web page. Every Claude Code session running this mod gets a Claude mascot at its own desk, with a board above it showing the session's plan, the step in progress and a live "done by" time. Nothing leaves the machine: each session writes its own desk file under `~/.claude/my-office/desks/`, and the page reads them back every second.

## Use

- `/my-office` prints the page's address (`file:///…/.claude/my-office/index.html`); open it in a browser.
- `/my-office-desk Writer` names your desk; `/my-office-leave` sends a session home and frees its desk, `/my-office-leave <name or id>` another one, `/my-office-leave others` everyone but you (for desks left behind by a crashed session).
- `/my-office-clear` deletes the desk files of sessions that ended or have written nothing for 30 minutes, except yours. A session waiting for you or for its usage stays, and a session still open comes back at its next activity.
- `/my-office-who` lists the sessions in the office, what each one does and the usage left; `/my-office-who <name>` shows that desk's plan.
- `/my-office-board` shows your plan; `/my-office-board clear` takes it off your board.
- `/my-office-theme neon` changes the room on the page from the terminal; `/my-office-theme` lists the rooms.
- `/my-office-quiet` switches the sound at the end of a turn off or on (`/my-office-quiet on`, `/my-office-quiet off`), for every session.
- Claude keeps the board up to date with the `plan` and `step_done` tools, and the mod also follows the session's own task list.

The board follows what the session really does: the `plan` tool when Claude gives one (it has estimates), otherwise mission-control's plan or Claude Code's own task list. While a session waits for you (a question, a permission, a turn that ends on a question) its plan pauses, so waiting never shows as running late, and its Claude stays at its desk hopping and waving, a **?** over its head and its lamp blinking. A turn that ends without a question finishes its plan: the steps left are ticked and the board reads DONE. One you interrupt reads INTERRUPTED, and one stopped by an error ENDED x OF y, with their steps as they stood until your next prompt. A session stopped by the usage limit sits knocked out (crossed eyes, a skull instead of its icon, a red bar) until its next prompt or restart. The gauge top left shows the usage left in the 5-hour and weekly windows and, in turn, when each resets; hover it for both in words. It turns amber at 20% left and blinks red at 5%; an empty window shows a skull and dims the room. Each threshold shakes the gauge and, with the sound on, plays a short alarm.

Whoever arrives while nobody has the plain Claude gets it; everyone else draws a colour and an accessory at random, and keeps them through a refresh. Two sessions never share an avatar and no floor has one colour twice: the later arrival gives way.

The view follows the real seasons, from your computer's date: the ground, the sky, the weather behind the glass (snow, falling leaves, petals, birds and fireflies) and small details on the glass (frost, a stuck leaf, drops, a summer glare). In the space station the planet changes instead; the painting of the Corporate retro room stays as it is. The settings hold a season and choose the hemisphere.

Four desks fit on a floor. With more sessions the office opens more floors, and floors that fit on one merge again (a desk you placed by hand stays where you put it): the panel at the bottom of the room has a light per desk, blinking when a Claude waits for you and red when one is out of usage, and the tab title counts who is waiting. Click a floor or press **1**-**9**, **Page Up** or **Page Down** to go there. Every floor keeps its own shelf of files, window and fallen things. There is one cat in the whole office: it changes floors by the door, and the panel shows where it is.

In the page: **T** changes the room (8 themes, each with day and night following your local time), **L** shows labels, **I** shows or hides the item bar, **M** switches the sound, **G** slides the usage gauge away (its tab stays, turns to an alert, and the gauge comes back by itself on an alarm), and **S** or the gear opens the settings: all of that, plus the time of day, the cat's name, head icons, hiding the bars, compact buttons and less motion. Drag a Claude to move it, drag a board onto another desk's place to move that desk there, or onto the floor panel to send it to that floor (order and floors last as long as the sessions do), drag an item from the bar onto a Claude to give it, click a Claude for its card, where **‹** and **›** change its accessory and its colour (an accessory that would make it the twin of another Claude shows greyed, and a colour it cannot take is not offered). A chosen accessory stays; if needed, the colour gives way. A chosen colour stays too, unless two chosen ones meet on a floor: then the later arrival draws another.

## Layout

`hooks/` is the engine side (TypeScript, runs inside each session); `web/` is the page (plain browser scripts, copied to `~/.claude/my-office/` at session start). See `CLAUDE.md` at the repository root for the file map, the rules the page keeps and how to test.

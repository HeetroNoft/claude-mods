# claude-mods

Heet's Claude Code mods, published as the `heet-mods` marketplace.

| Mod | What it does |
| --- | --- |
| [my-office](plugins/my-office/README.md) | A pixel-art office in a local web page: every Claude session is a mascot at its own desk, with its plan and a live "done by" time on a board above it |
| [cockpit](plugins/cockpit/README.md) | One band above the prompt, on every surface: this turn's plan as a progress bar, what Claude is doing in plain English, asks ticked off with proof and a sound when it is done, plus your other open sessions with an Ask button, in a tab or stacked under the mission |

## Install

From a clone of this repository:

```bash
claude plugin marketplace add /path/to/claude-mods
claude plugin install my-office@heet-mods
claude plugin install cockpit@heet-mods
```

From GitHub, with an account that can read this repository:

```bash
claude plugin marketplace add HeetroNoft/claude-mods
claude plugin install my-office@heet-mods
claude plugin install cockpit@heet-mods
```

Then run `/reload-plugins` or start a new session.

## Use

**my-office**: `/my-office` prints the page's address; open it in a browser. `/my-office-desk Writer` names your desk and `/my-office-who` lists who is in the office. The [office README](plugins/my-office/README.md) has every command and the page's keys.

**cockpit** shows above the prompt in the terminal, VS Code, the desktop app and the web, with no setup. One header line gives the state, the progress and the time; below it, the plan with what Claude is doing under the step at work, then your asks. Your other open sessions come in a **Sessions** tab (the `tabs` layout) or under the mission (the `stacked` layout), each with an Ask button that drafts a line in your prompt.

- `/cockpit-layout tabs` or `/cockpit-layout stacked` picks the layout; `/cockpit-layout` alone switches to the other one.
- `/cockpit-fold` folds the band to one line, or opens it again; so do its ▾/▸ button and `c`.
- `/cockpit` clears the mission, `/cockpit-sessions` lists your other sessions, `/cockpit-rows` switches the plain-English tool rows.

The [cockpit README](plugins/cockpit/README.md) has every state, key and command.

## Develop

[CLAUDE.md](CLAUDE.md) has the file map, the rules for working with several sessions at once and how to test:

```bash
claude plugin validate plugins/my-office   # manifest and hooks module
claude plugin test plugins/my-office       # hooks unit tests
tools/my-office/run.sh check               # page: layout checks and a screenshot per theme
claude plugin validate plugins/cockpit     # cockpit: manifest and hooks module
claude plugin test plugins/cockpit         # cockpit: hooks unit tests
```

## Credits

These mods are based on mods from [charlie-free-mods](https://github.com/charlie947/mod-maker).

## License

[MIT](LICENSE) for Heet's own work.

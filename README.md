# claude-mods

Heet's Claude Code mods, published as the `heet-mods` marketplace.

| Mod | What it does |
| --- | --- |
| [my-office](plugins/my-office/README.md) | A pixel-art office in a local web page: every Claude session is a mascot at its own desk, with its plan and a live "done by" time on a board above it |
| mission-control | A live panel of the current turn: the plan as a progress bar, what Claude is doing in plain French, your asks ticked off, and a sound when it is done |
| sessions-band | A band above the prompt listing your other open sessions, what each one is for, and an Ask button |

## Install

From a clone of this repository:

```bash
claude plugin marketplace add /path/to/claude-mods
claude plugin install my-office@heet-mods
claude plugin install mission-control@heet-mods
claude plugin install sessions-band@heet-mods
```

From GitHub, with an account that can read this repository:

```bash
claude plugin marketplace add HeetroNoft/claude-mods
claude plugin install my-office@heet-mods
claude plugin install mission-control@heet-mods
claude plugin install sessions-band@heet-mods
```

Then run `/reload-plugins` or start a new session.

## Use

**my-office**: `/my-office` prints the page's address; open it in a browser. `/my-office-desk Writer` names your desk and `/my-office-who` lists who is in the office. The [office README](plugins/my-office/README.md) has every command and the page's keys.

**mission-control** shows above the prompt in the terminal and in a pane in VS Code, with no setup.

- `/mission` clears the panel.
- `/mission-panel` opens the panel in a side pane.
- `/mission-rows` switches the plain-French tool rows on or off.

**sessions-band** shows above the prompt when other sessions run this mod. `/sessions` lists them and shows or hides the band.

## Develop

[CLAUDE.md](CLAUDE.md) has the file map, the rules for working with several sessions at once and how to test:

```bash
claude plugin validate plugins/my-office   # manifest and hooks module
claude plugin test plugins/my-office       # hooks unit tests
tools/my-office/run.sh check               # page: layout checks and a screenshot per theme
```

## Credits

These mods are based on mods from [charlie-free-mods](https://github.com/charlie947/mod-maker).

## License

[MIT](LICENSE) for Heet's own work.

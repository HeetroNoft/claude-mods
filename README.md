# claude-mods

Heet's Claude Code mods, published as the `heet-mods` marketplace.

| Mod | What it does |
| --- | --- |
| [my-office](plugins/my-office/README.md) | A pixel-art office in a local web page: every Claude session is a mascot at its own desk, with its plan and a live "done by" time on a board above it |
| cockpit | One band above the prompt, on every surface: this turn's plan as a progress bar, what Claude is doing in plain English, your asks ticked off and a sound when it is done, plus a tab listing your other open sessions with an Ask button |

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

**cockpit** shows above the prompt in the terminal, VS Code, the desktop app and the web, with no setup. Its **Mission** tab is this turn; its **Sessions** tab, there while another session runs the cockpit, lists them with an Ask button that drafts a line in your prompt. `1` and `2` switch tabs while the band has the focus.

- `/cockpit` clears the Mission tab.
- `/cockpit-fold` folds the band to one line like an accordion, or opens it again; so do its ▾/▸ button and `c`. It stays as you left it for the session.
- `/cockpit-rows` switches the plain-English tool rows on or off.
- `/cockpit-sessions` lists your other sessions and shows or hides their tab.

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

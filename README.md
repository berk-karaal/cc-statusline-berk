# cc-statusline-berk

[![npm version](https://badge.fury.io/js/cc-statusline-berk.svg)](https://www.npmjs.com/package/cc-statusline-berk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A customizable statusline CLI tool for Claude Code that displays rich contextual information at the bottom of the terminal interface.

![Screenshot](docs/screenshot-placeholder.png)

## Quickstart

**Requirements:** [Bun](https://bun.sh/) >= 1.2.0

Install globally:

```bash
# Via npm
npm install -g cc-statusline-berk

# Or via Bun
bun install -g cc-statusline-berk
```

Configure in Claude Code settings (`~/.claude/settings.json`):

```json
{
  "statusline": {
    "command": "cc-statusline-berk"
  }
}
```

## Installation

### Global Installation (Recommended)

```bash
npm install -g cc-statusline-berk
```

### Local Installation (from source)

```bash
# Clone repository
git clone https://github.com/berk-karaal/cc-statusline-berk.git
cd cc-statusline-berk

# Install dependencies and build
just install
just build
```

Configure in Claude Code settings with the absolute path:

```json
{
  "statusline": {
    "command": "/absolute/path/to/cc-statusline-berk/dist/cc-statusline-berk.js"
  }
}
```

## Metrics

The statusline displays the following information (left to right):

1. **Model** — Claude model name (e.g., "Opus", "Sonnet", "Haiku")
2. **Context Usage** — Percentage of context window used with window size (e.g., "12% (1M)")
3. **Rate Limits** — Pro user rate limit usage with countdown timers:
   - 5-hour rolling window percentage and reset time
   - 7-day rolling window percentage and reset time
4. **Git Branch** — Current git branch name
5. **Project** — Project name with clickable GitHub repository link (when git remote exists)
6. **Pull Request** — PR number with clickable link (when a PR exists for current branch)
7. **Current Time** — Local time in 24-hour format with seconds

### Zero-Config Approach

cc-statusline-berk works out of the box with no configuration required. Simply install and point Claude Code to the binary — the tool automatically detects your git repository, GitHub remotes, and branch information.

### OSC 8 Hyperlinks

Clickable links to GitHub repositories and PRs use [OSC 8](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda) terminal hyperlinks. These work in most modern terminal emulators including:

- iTerm2 (macOS)
- Windows Terminal
- GNOME Terminal 3.26+
- VS Code integrated terminal

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and release process guidelines.

## License

[MIT](LICENSE) © Berk Karaal

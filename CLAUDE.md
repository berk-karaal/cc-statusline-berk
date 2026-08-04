# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

cc-statusline-berk is a CLI tool that Claude Code invokes to render a rich statusline at the bottom of the terminal. Claude Code pipes JSON (with model info, context usage, rate limits, etc.) to stdin; this tool parses it and outputs ANSI-formatted, multi-line text to stdout.

## Commands

```bash
bun install          # Install dependencies
bun test             # Run all tests (unit + integration)
bun test src/git     # Run tests matching a pattern
bun run build        # Bundle to dist/cc-statusline-berk.js
bun run typecheck    # TypeScript type check (tsc --noEmit)
bun run lint         # Biome linter
bun run lint:fix     # Biome linter with auto-fix
bun run format       # Biome formatter
```

A `Justfile` wraps these as `just test`, `just build`, `just typecheck`, `just check`, `just format`.

Before committing: run typecheck, lint, format, test, and build.

## Architecture

### Source structure

```
src/
  index.ts        — Entrypoint. Wires the pipeline: getInput() -> buildStatuslineItems() -> formatStatuslineMultiLine()
  types.ts        — ClaudeCodeInput interface (the JSON schema Claude Code sends via stdin)
  parser.ts       — Reads stdin via Bun.stdin.text(), parses JSON with graceful fallback to {}
  formatter.ts    — Core logic: builds prioritized items and lays them out into lines
  git.ts          — Async git/GitHub operations (branch, remote URL, PR via gh CLI)
  cache.ts        — PersistentTTLCache: file-backed JSON cache in /tmp/ with TTL expiration
  hyperlink.ts    — OSC 8 terminal hyperlink generation
  terminal.ts     — Terminal width detection via ps/stty (stdout is piped, not a TTY)
  width.ts        — getVisibleWidth(): strips ANSI/OSC 8 sequences, uses Bun.stringWidth()
  *.test.ts       — Unit tests colocated with source files
test/
  integration.test.ts — End-to-end: pipes JSON through the full CLI process
```

### Main pipeline (index.ts)

The entrypoint runs three steps in sequence:

1. **`getInput()`** (parser.ts) — Reads stdin JSON, returns a `ClaudeCodeInput` object
2. **`buildStatuslineItems(input)`** (formatter.ts) — Converts input into an array of `{ content: string, priority: number }` items, sorted by priority (1=highest). Git operations run in parallel via `Promise.all`.
3. **`formatStatuslineMultiLine(items, terminalWidth)`** (formatter.ts) — Greedy fill algorithm that packs items left-to-right into up to 3 lines. Items that don't fit are dropped (lowest priority first).

### Adding a new statusline item

Edit `buildStatuslineItems()` in `formatter.ts`. Each item is `{ content: string, priority: number }`. Assign a priority number to control display order and which items get dropped when the terminal is narrow. Lower number = higher priority = displayed first and dropped last. The multi-line layout handles the rest automatically.

### Caching (cache.ts)

`PersistentTTLCache` stores results as JSON files in `/tmp/cc-statusline-berk-cache/`. File-backed (not in-memory) because Claude Code spawns this tool as a **new process on every render** — in-memory caches would be empty each time. The file cache survives across invocations so expensive operations (git commands, `gh` CLI calls) aren't repeated until the TTL expires. TTLs: 5s for git branch/remote, 45s for PR lookups. Cache keys are sanitized to filenames (e.g., `branch__Users_foo_repo.json`). All cache read/write failures are silently ignored — the tool just falls back to a fresh call.

## Key Design Decisions

- Items have numeric priorities (1=model through 7=time). Lower priority items are dropped first when terminal is too narrow.
- All git/gh failures return null silently — missing tools or non-git directories are normal, not errors.
- Uses Nerd Font icons throughout — the statusline assumes a Nerd Font-patched terminal font.
- Releases are triggered by pushing a `vX.Y.Z` git tag; GitHub Actions handles npm publish.

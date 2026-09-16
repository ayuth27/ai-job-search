# jobsdb-cli

CLI for searching jobs on **JobsDB Thailand** (`th.jobsdb.com`) — any city or
province in Thailand, any sector, Thai or English keywords.

**Data source**: the public search page (`/jobs?keywords=…`) and the JSON it embeds
(`window.SEEK_APOLLO_DATA`); detail from `/job/<id>` on explicit request only.
**Authentication**: None required.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only
pulls dev type defs.

> **Personal use only.** JobsDB's `robots.txt` disallows automated access to posting
> pages. Keep volume low, never use this commercially or for bulk collection, and run
> it on your own responsibility. Full note in `../SKILL.md`.

## Installation

```bash
cd .agents/skills/jobsdb-search/cli
bun install   # optional — only installs TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search for job listings (`--query` required) |
| `detail` | Fetch full detail for a single posting |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts
`--format json|plain`. All errors go to **stderr** as `{ "error": "...", "code": "..." }`
with exit code `1`.

## Quick examples

```bash
bun run src/cli.ts search -q "software engineer" -l "Bangkok" --jobage 7 --format table
bun run src/cli.ts search -q "นักบัญชี" -l "Chiang Mai" --format table
bun run src/cli.ts search -q "data analyst" --limit 20
bun run src/cli.ts detail 94671909 --format plain
```

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--query` | `-q` | **Required.** Keywords, Thai or English. |
| `--location` | `-l` | Place name as JobsDB spells it (`Bangkok`, `Chon Buri`, …). Optional. |
| `--jobage` | | Posted within N days; rounded up to `1`/`3`/`7`/`14`/`31`. |
| `--page` | | 1-indexed page (30 results/page). |
| `--limit` | `-n` | Cap results emitted. |
| `--format` | | `json` \| `table` \| `plain`. |

## Tests

```bash
bun run test        # parsing (offline fixture) + contract + one small live smoke test
bun run typecheck
```

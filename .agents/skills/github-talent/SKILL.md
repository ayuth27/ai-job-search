---
name: github-talent
version: 1.0.0
description: >
  Use this skill when the user wants to find developer candidates or talent on
  GitHub, especially in Thailand or Bangkok: searching engineers by location,
  language or skill (AI/ML, Python, TypeScript, LLM), or looking up one GitHub
  profile and their recent repositories. This is a recruiting/talent-search tool,
  NOT a job portal. Invoked explicitly by the /talent command. Trigger phrases:
  github talent, talent search, find developers, find candidates, search github
  users, github candidate search, ML engineers in Bangkok, developers in Thailand,
  หาคน, หาโปรแกรมเมอร์, หาคนทำ AI, ค้นหา candidate, ค้นหาผู้สมัคร,
  ค้นหานักพัฒนา, หา developer กรุงเทพ, หาวิศวกร machine learning.
context: fork
enabled: false  # NOT a job portal: keeps /scrape from running it; /talent invokes it explicitly
allowed-tools: Bash(bun run skills/github-talent/cli/src/cli.ts *)
---

# GitHub Talent Search Skill

Searches GitHub for developer candidates through the **official REST API**
(`https://api.github.com`, JSON only, no HTML scraping) and reads one profile in
detail. It is the data layer for Recruiter mode (`/talent`). It is not a job
portal, so it is registered with `enabled: false` and `/scrape` skips it.

## Personal use only / GitHub Acceptable Use

- The data is public profile data returned by the official API. Keep volume low:
  one page per command, `--hydrate` only on short lists, no crawling.
- Never collect email addresses. The CLI drops `email` from all output and never
  reads commit metadata. Do not try to recover emails from commits or other sources.
- Reach out only through contact channels the person publishes themselves (the
  blog/website field, or a platform with built-in messaging such as LinkedIn).
  No bulk or templated mass messaging, no spam.
- Comply with GitHub's Acceptable Use Policies and API Terms, and with Thailand's
  PDPA: the lawful basis is legitimate interest (individual recruiting outreach);
  delete a person's data on request and keep only what you need.
- Credentials: optional `GITHUB_API_TOKEN` environment variable only. It is never
  accepted as a flag and never logged.

## Commands

All commands: `bun run skills/github-talent/cli/src/cli.ts <command> [flags]`

### `search`

| Flag | Meaning |
|------|---------|
| `--query`, `-q <text>` | Free-text keywords |
| `--location`, `-l <text>` | Adds `location:"<text>"` |
| `--language <lang>` | Adds `language:<lang>`; repeat or comma-separate |
| `--min-repos <n>` | Adds `repos:>=n` |
| `--min-followers <n>` | Adds `followers:>=n` |
| `--jobage <days>` | Contract-compatibility flag. With `--hydrate`, keeps only profiles whose `updated_at` is within N days; **ignored without `--hydrate`** |
| `--page <n>` | 1-indexed page (one page per invocation) |
| `--limit <n>` | Client-side cap, default 20, max 30 |
| `--hydrate` | Fetch `/users/{login}` for every result (name, location, bio, company, blog, hireable, counts, updated_at) |
| `--format json\|table\|plain` | Default `json` |

At least one of `--query`, `--location`, `--language` is required. Unknown flags
exit 1 with `UNKNOWN_FLAG`.

### `detail <login|profile-url>`

Profile plus the 10 most recently updated repos (name, description, language,
stars, pushed_at, url, topics). `--format json|plain` only.

## Examples

```bash
bun run skills/github-talent/cli/src/cli.ts search -q "machine learning" -l Bangkok --language python --limit 10 --hydrate --format table
bun run skills/github-talent/cli/src/cli.ts search -q "LLM" -l Thailand --language python,typescript --min-followers 20
bun run skills/github-talent/cli/src/cli.ts search -l "Chiang Mai" --language python --min-repos 15 --page 2
bun run skills/github-talent/cli/src/cli.ts search -q "computer vision" -l Bangkok --hydrate --jobage 180 --format plain
bun run skills/github-talent/cli/src/cli.ts detail https://github.com/octocat --format plain
```

## Output

| Key | Search (not hydrated) | Search (`--hydrate`) / detail |
|-----|-----------------------|-------------------------------|
| `id`, `login`, `url` | yes | yes |
| `title` | login | name, else login |
| `company`, `location`, `date` (`updated_at`), `bio`, `blog`, `hireable`, `public_repos`, `followers` | `null` | filled when public, else `null` |

JSON: `{ "meta": { count, page, total, hydrated, rate_limit_remaining }, "results": [...] }`.
`detail` JSON: `{ "profile": {...}, "repos": [...] }`. Errors go to stderr as
`{ "error": "...", "code": "..." }` with exit 1 (`RATE_LIMITED`, `UNKNOWN_FLAG`,
`BAD_ARG`, `NO_QUERY`, `NOT_FOUND`, `FETCH_ERROR`).

## Notes

- Rate limits: unauthenticated search is 10 requests/min and core 60/h; with
  `GITHUB_API_TOKEN` 30/min and 5000/h. On a limit the CLI exits 1 with code
  `RATE_LIMITED` and names `GITHUB_API_TOKEN` as the remedy.
- `--hydrate` costs one extra core request per result (20 results = 20 requests,
  a third of the unauthenticated hourly budget). Use small `--limit` values.
- Search only returns the first 1000 matches and does not expose location text
  reliably; `location:"Thailand"` matches the free-text profile field.
- `enabled: false` keeps this skill out of `/scrape`; `/talent` calls it directly.
- See `url-reference.md` for endpoints and field mapping.

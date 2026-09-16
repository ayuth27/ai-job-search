---
name: jobsdb-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for jobs in Thailand, find Thai
  job listings, look up a specific JobsDB posting, or asks anything about the Thai
  job market — even if they don't mention jobsdb.com explicitly. Invoke for open
  positions, vacancies, hiring in Bangkok, Chiang Mai, Chon Buri, Rayong, Phuket or
  anywhere in Thailand, across any sector (software, data, finance, engineering,
  marketing, hospitality, manufacturing). Trigger phrases: jobsdb, jobs in thailand,
  jobs bangkok, job search thailand, work in thailand, thai jobs, hiring bangkok,
  developer jobs bangkok, engineer jobs thailand, หางาน, หางานกรุงเทพ, งานว่าง,
  ตำแหน่งงาน, ประกาศรับสมัครงาน, สมัครงาน, งานในประเทศไทย, รับสมัครพนักงาน,
  งาน IT กรุงเทพ, งานวิศวกร, งาน software engineer, ค้นหางาน, จ๊อบส์ดีบี.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/jobsdb-search/cli/src/cli.ts *)
---

# JobsDB Thailand Search Skill

Search live job listings on **JobsDB Thailand** (`th.jobsdb.com`, part of the SEEK
group) for any city or province in Thailand. No authentication, no API key, and
**zero runtime dependencies** — it runs with just `bun`.

The portal's search page embeds its full search response as JSON
(`window.SEEK_APOLLO_DATA`), so the CLI reads structured data rather than scraping
HTML cards. Postings are in Thai, English, or a mix of both.

## ⚠️ Personal use only

`th.jobsdb.com/robots.txt` **disallows** `*/job/` (the posting detail pages) and
`/api/jobsearch/` for all bots, and only allows search URLs of the `?keywords=` form.
This CLI:

- fetches search results only through the allowed `/jobs?keywords=…` URL;
- fetches a detail page **only when you run `detail` on a specific id** — never in
  bulk, never automatically;
- identifies itself honestly (`jobsdb-search-cli/1.0`), never as a browser.

Even so, automated access to JobsDB is a personal-use decision you make yourself:
**keep volume low, never use it commercially or for bulk data collection, and run it
on your own responsibility.** `/scrape` fetches `detail` for only a handful of
shortlisted postings per run; do not loosen that.

## When to use this skill

- Search for job openings anywhere in Thailand (or a specific city/province)
- Filter by recency (posted within 1 / 3 / 7 / 14 / 31 days)
- Get the full description, salary, work type, and expiry date of a specific posting

## Commands

### Search job listings

```bash
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search --query "<keywords>" [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — **required.** Keywords (title, skill, role), Thai or English.
- `--location <text>` / `-l <text>` — city or province as JobsDB names it, e.g. `Bangkok`, `Chiang Mai`, `Chon Buri`, `Nonthaburi`, `Phuket`. Omit to search all of Thailand.
- `--jobage <days>` — posted within N days. JobsDB only offers `1`, `3`, `7`, `14`, `31`; any other value rounds **up** to the next bucket (e.g. `10` → `14`). Values above 31 are ignored (portal maximum).
- `--page <n>` — page number (1-indexed, 30 results per page).
- `--limit <n>` / `-n <n>` — cap results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/jobsdb-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric job id from `search` results (e.g. `94671909`). A full
`https://th.jobsdb.com/job/<id>` URL also works. Returns the description (HTML
decoded to readable text), salary label, work type, classification, listing date,
expiry date and an `isActive` flag.

## Usage examples

```bash
# Software engineer roles in Bangkok, last 7 days
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search -q "software engineer" -l "Bangkok" --jobage 7 --format table

# Data analyst roles anywhere in Thailand
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search -q "data analyst" --format table

# Thai-language search: accountants in Chiang Mai
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search -q "นักบัญชี" -l "Chiang Mai" --format table

# Manufacturing engineers on the Eastern Seaboard, page 2
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search -q "process engineer" -l "Chon Buri" --page 2 --limit 10

# Product manager roles, JSON for piping into /scrape
bun run .agents/skills/jobsdb-search/cli/src/cli.ts search -q "product manager" -l "Bangkok" --jobage 14 --limit 20

# Full details for a specific posting
bun run .agents/skills/jobsdb-search/cli/src/cli.ts detail 94671909 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

Search JSON shape: `{ "meta": { "count", "page", "pageSize", "total" }, "results": [...] }`,
each result carrying `id`, `title`, `company`, `location`, `date` (ISO 8601 UTC),
`url`, plus `salary`, `workType`, `workArrangement`, `classification` and `abstract`
(all `null` when the portal omits them, never missing).

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the
process exits with code `1`.

## Notes

- Data source: the search page `https://th.jobsdb.com/jobs?keywords=…` and the JSON
  it embeds (`window.SEEK_APOLLO_DATA`, GraphQL operation `jobSearchV7`). JobsDB
  redirects to an SEO path such as `/software-engineer-jobs/in-Bangkok`; the CLI
  follows that redirect. See `url-reference.md`.
- `--location` must be a place name JobsDB recognises (`Bangkok`, `Chiang Mai`,
  `Chon Buri`, `Rayong`, `Phuket`, `Nonthaburi`, `Pathum Thani`, …). An unknown
  place falls back to a keyword-style search, so check the `location` column when
  results look nationwide.
- Page size is fixed at 30. `meta.total` is the portal's own total count.
- `date` is the listing timestamp in UTC (`listedAt.dateTimeUtc`); JobsDB shows it
  locally as "4h ago". Salary is the advertiser's own range in THB when disclosed.
- `detail` returns `isActive: false` when the posting reports `isExpired` or a
  non-`Active` status; a removed posting exits 1 with `NOT_FOUND`.
- JobsDB may rate-limit or serve a bot-protection page; the CLI retries 429/5xx with
  exponential backoff and jitter. Keep volume low (see the warning above).

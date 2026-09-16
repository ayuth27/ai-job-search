# JobsDB Thailand URL Reference

Public pages of `https://th.jobsdb.com` used by this skill (verified 2026-09-16).
JobsDB is a SEEK-group site, so the same page structure applies to `sg.jobsdb.com`,
`hk.jobsdb.com`, `jobstreet.com.*` and `seek.com.au` — only the host and the
`zone`/`locale` values differ.

> Personal use only. `robots.txt` disallows `*/job/` and `/api/jobsearch/` for all
> bots; only `?keywords=` search URLs are allowed. Keep volume low.

## robots.txt (relevant lines)

```
User-agent: *
Disallow: */job/            # posting detail pages
Disallow: *?                # any query string ...
Disallow: /graphql
Disallow: /api/jobsearch/   # the JSON search API behind the site
Allow: *?keywords           # ... except keyword searches
```

Consequence: the CLI never calls `/graphql` or `/api/jobsearch/`. It requests the
public search page with `?keywords=` and reads the JSON the page embeds. `detail`
touches a `/job/<id>` page only on explicit user request.

## Search

```
GET https://th.jobsdb.com/jobs?keywords=<q>[&where=<place>][&daterange=<n>][&page=<n>]
```

| Param | Meaning | Example |
|-------|---------|---------|
| `keywords` | Free-text query (Thai or English) | `software engineer`, `นักบัญชี` |
| `where` | Place name as JobsDB spells it | `Bangkok`, `Chiang Mai`, `Chon Buri` |
| `daterange` | Posted within N days — only `1`, `3`, `7`, `14`, `31` | `7` |
| `page` | 1-indexed page, 30 results per page | `2` |

The server 302-redirects to an SEO path, e.g.
`/software-engineer-jobs/in-Bangkok?daterange=7&page=2`. Follow redirects; the
final HTML is identical.

### Response structure

The HTML contains `<script>window.SEEK_APOLLO_DATA = {…};</script>` — a normalised
Apollo cache. The CLI extracts that object with a balanced-brace scan (the statement
is followed by other assignments on the same line, so `JSON.parse` on a greedy match
fails).

Inside it:

```
ROOT_QUERY["jobSearchV7({...params...})"]
  .results.jobs[]            JobSearchV7Job
     .id                     "94671909"
     .title
     .abstract               short teaser
     .advertiser.name        company (always present)
     .organisation.__ref     -> "JobSearchV7JobOrganisation:<id>".name (preferred, may be absent)
     .location.__ref         -> "JobSearchV7JobLocation:<id>".displayName.text
     .listedAt.dateTimeUtc   ISO 8601
     .salary                 { min, max, currency, period } or cjs.salary.displayValue
     .cjs.workTypes[].name({"locale":"en-TH"})   "Full time"
     .workArrangements[].__ref -> "JobSearchV7WorkArrangements:<n>" (label, e.g. Hybrid)
     .categories[].__ref     -> "SeekClassification:<id>" (label with "(Parent)")
  .metadata.sol.totalJobCount, pageSize, pageNumber
```

Keys carrying GraphQL arguments look like `name({"locale":"en-TH"})`; the CLI
matches on the prefix before `(`.

Posting URL: `https://th.jobsdb.com/job/<id>` (the page's own links append
`?type=standard&ref=search-standalone`, which is tracking and dropped).

## Detail

```
GET https://th.jobsdb.com/job/<id>
```

Same embedded `window.SEEK_APOLLO_DATA`. Fields under
`ROOT_QUERY["jobDetails:{\"id\":\"<id>\"}"].job`:

| Field | Path |
|-------|------|
| title | `.title` |
| company | `.advertiser["name({...})"]` |
| location | `.location["label({...})"]` |
| posted | `.listedAt.dateTimeUtc` |
| expires | `.expiresAt.dateTimeUtc` |
| active | `.status === "Active"` and `!isExpired` |
| work type | `.workTypes["label({...})"]` |
| salary | `.salary.label` |
| classification | `.classifications[]["label({...})"]` |
| description | `["content2({\"zone\":\"asia-3\"})"]` — HTML |
| share link | `["shareLink({...})"]` |

A removed posting still returns HTTP 200 but has no `jobDetails` entry (or
`isExpired: true`); the CLI maps the former to `NOT_FOUND`.

## Notes

- No authentication required. Honest UA `Mozilla/5.0 (compatible; jobsdb-search-cli/1.0)`
  was accepted on 2026-09-16 (HTTP 200, ~900 KB page, 30 results).
- Locale strings in keys are `en-TH`; zone is `asia-3`. Match on prefixes, not on the
  full key, so a locale change does not break parsing.
- No `sortmode` is sent; results come in the portal's relevance order.

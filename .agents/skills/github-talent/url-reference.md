# GitHub REST API reference (github-talent)

Base URL `https://api.github.com`. Headers on every request:
`Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`,
`User-Agent: Mozilla/5.0 (compatible; github-talent-cli/1.0)`, and
`Authorization: Bearer $GITHUB_API_TOKEN` only when that env var is set.

## Endpoints

| Endpoint | Used for |
|----------|----------|
| `GET /search/users?q=<q>&per_page=<=30>&page=<n>` | `search`; one page per invocation |
| `GET /users/{login}` | `--hydrate` and `detail` |
| `GET /users/{login}/repos?sort=updated&per_page=10` | `detail` repos |

## Query qualifiers used (`q`)

free text keywords, `location:"<value>"`, `language:<value>`, `repos:>=n`,
`followers:>=n`, always `type:user`.

## Rate limits

| | Search | Core |
|---|--------|------|
| Unauthenticated | 10 / min | 60 / h |
| With token | 30 / min | 5000 / h |

A 429, or a 403 with `x-ratelimit-remaining: 0` or `retry-after`, becomes
`RATE_LIMITED`. 5xx is retried with exponential backoff and jitter.
`x-ratelimit-remaining` of the last response is reported as `meta.rate_limit_remaining`.

## Field mapping

| Output | API field | Notes |
|--------|-----------|-------|
| `id`, `login` | `login` | |
| `title` | `name` | falls back to `login` |
| `company` | `company` | hydrated only |
| `location` | `location` | hydrated only |
| `date` | `updated_at` | hydrated only; ISO |
| `url` | built | `https://github.com/<login>` |
| `bio`, `blog`, `hireable`, `public_repos`, `followers` | same name | hydrated only |
| repo `topics` | `topics` | `[]` when absent |

Deliberately dropped: `email` (never output), and everything else not listed.
Empty strings and missing values become `null`.

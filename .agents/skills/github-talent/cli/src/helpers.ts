// Data source: the official GitHub REST API (https://api.github.com). JSON only,
// never HTML scraping. Privacy: `email` is never read into our types, so it can
// never reach output; commit metadata is never fetched.

export const API_BASE = "https://api.github.com"
const UA = "Mozilla/5.0 (compatible; github-talent-cli/1.0)"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

export class ApiError extends Error {
  constructor(message: string, public code: string) {
    super(message)
  }
}

export interface Profile {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  login: string
  bio: string | null
  blog: string | null
  hireable: boolean | null
  public_repos: number | null
  followers: number | null
}

export interface Repo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number | null
  pushed_at: string | null
  html_url: string
  topics: string[]
}

type Obj = Record<string, unknown>
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null)
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)

/** Map a search item or a full /users/{login} object. Whitelist only: email etc. are dropped. */
export function mapUser(raw: unknown): Profile {
  const u = (raw ?? {}) as Obj
  const login = str(u.login) ?? ""
  const company = str(u.company)
  return {
    id: login,
    title: str(u.name) ?? login,
    company,
    location: str(u.location),
    date: str(u.updated_at),
    url: `https://github.com/${login}`,
    login,
    bio: str(u.bio),
    blog: str(u.blog),
    hireable: typeof u.hireable === "boolean" ? u.hireable : null,
    public_repos: num(u.public_repos),
    followers: num(u.followers),
  }
}

export function mapRepo(raw: unknown): Repo {
  const r = (raw ?? {}) as Obj
  return {
    name: str(r.name) ?? "",
    description: str(r.description),
    language: str(r.language),
    stargazers_count: num(r.stargazers_count),
    pushed_at: str(r.pushed_at),
    html_url: str(r.html_url) ?? "",
    topics: Array.isArray(r.topics) ? r.topics.filter((t): t is string => typeof t === "string") : [],
  }
}

/** Accept "octocat", "@octocat", "github.com/octocat", or a full profile URL. */
export function parseLogin(input: string): string | null {
  let s = input.trim().replace(/^@/, "")
  const m = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)/i)
  if (m) s = m[1]
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(s) ? s : null
}

export interface QueryParts {
  query?: string
  location?: string
  languages?: string[]
  minRepos?: number
  minFollowers?: number
}

export function buildQuery(p: QueryParts): string {
  const parts: string[] = []
  if (p.query?.trim()) parts.push(p.query.trim())
  if (p.location?.trim()) parts.push(`location:"${p.location.trim().replace(/"/g, "")}"`)
  for (const l of p.languages ?? []) {
    const v = l.trim()
    if (v) parts.push(`language:${/\s/.test(v) ? `"${v}"` : v}`)
  }
  if (p.minRepos !== undefined) parts.push(`repos:>=${p.minRepos}`)
  if (p.minFollowers !== undefined) parts.push(`followers:>=${p.minFollowers}`)
  parts.push("type:user")
  return parts.join(" ")
}

/** Client-side freshness filter on the hydrated profile's updated_at. Null dates are kept. */
export function filterByAge(results: Profile[], days: number, now = Date.now()): Profile[] {
  const cutoff = now - days * 86400000
  return results.filter((r) => {
    if (!r.date) return true
    const t = Date.parse(r.date)
    return Number.isNaN(t) || t >= cutoff
  })
}

export interface ApiResponse<T> {
  data: T | null
  rateRemaining: number | null
}

/** GET a GitHub API path with backoff on 5xx. Returns data null on 404. */
export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  const token = process.env.GITHUB_API_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(API_BASE + path, { headers, signal: AbortSignal.timeout(15000) })
    const remainingHdr = response.headers.get("x-ratelimit-remaining")
    const rateRemaining = remainingHdr !== null && remainingHdr !== "" && !Number.isNaN(Number(remainingHdr)) ? Number(remainingHdr) : null
    if (response.status === 429 || (response.status === 403 && (rateRemaining === 0 || response.headers.has("retry-after")))) {
      throw new ApiError(
        "GitHub API rate limit reached. Wait a minute and retry, or set the GITHUB_API_TOKEN environment variable (a GitHub personal access token) to raise the limits (search: 10 -> 30 requests/min).",
        "RATE_LIMITED",
      )
    }
    if (response.status >= 500) {
      if (attempt === maxRetries) throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      await new Promise((r) => setTimeout(r, delay + Math.floor(Math.random() * 500)))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return { data: null, rateRemaining }
    if (response.status === 401) {
      throw new ApiError("GitHub rejected the credentials in GITHUB_API_TOKEN (401). Check or unset the variable.", "BAD_CREDENTIALS")
    }
    if (!response.ok) {
      let detail = ""
      try {
        const msg = ((await response.json()) as Obj).message
        if (typeof msg === "string") detail = ` - ${msg.slice(0, 200)}`
      } catch {}
      throw new Error(`Request failed: ${response.status} ${response.statusText}${detail}`)
    }
    return { data: (await response.json()) as T, rateRemaining }
  }
  throw new Error("Request failed after max retries")
}

export function cell(v: unknown): string {
  return v === null || v === undefined ? "-" : String(v).replace(/\s+/g, " ")
}

// Data source: JobsDB Thailand (th.jobsdb.com, SEEK group). The public search
// page embeds its full GraphQL search response as `window.SEEK_APOLLO_DATA`, so
// we read structured JSON instead of scraping HTML cards. Detail pages carry the
// same cache with a `jobDetails` entry.
//
// Personal use only: robots.txt disallows */job/ for all bots. `detail` is only
// ever called on an explicit id; search uses the allowed `?keywords=` form.

export const BASE_URL = "https://th.jobsdb.com"
export const SEARCH_URL = `${BASE_URL}/jobs`
export const DETAIL_URL = `${BASE_URL}/job`

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; jobsdb-search-cli/1.0)"

/** Fetch HTML with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-TH,en;q=0.9,th;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  salary: string | null
  workType: string | null
  workArrangement: string | null
  classification: string | null
  abstract: string | null
}

export interface SearchPage {
  results: JobCard[]
  pageSize: number | null
  total: number | null
}

export interface JobDetail {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  expiresAt: string | null
  url: string
  salary: string | null
  workType: string | null
  classification: string | null
  abstract: string | null
  description: string | null
  isActive: boolean
}

type Json = Record<string, unknown>

// ---------------------------------------------------------------------------
// Apollo cache extraction
// ---------------------------------------------------------------------------

/**
 * Extract the object assigned to `window.SEEK_APOLLO_DATA`. The assignment is
 * followed by more statements on the same line, so a greedy regex + JSON.parse
 * fails with "Extra data"; scan for the balanced closing brace instead,
 * skipping over string literals.
 */
export function extractApolloData(html: string): Json | null {
  const marker = "window.SEEK_APOLLO_DATA"
  const at = html.indexOf(marker)
  if (at === -1) return null
  const start = html.indexOf("{", at)
  if (start === -1) return null

  let depth = 0
  let inString = false
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (inString) {
      if (ch === "\\") i++
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1)) as Json
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/** Cache keys carry GraphQL args: `name({"locale":"en-TH"})`. Match on the prefix. */
export function field<T = unknown>(obj: unknown, name: string): T | undefined {
  if (!obj || typeof obj !== "object") return undefined
  const o = obj as Json
  if (name in o) return o[name] as T
  for (const k of Object.keys(o)) {
    if (k.startsWith(name + "(") || k.startsWith(name + ":")) return o[k] as T
  }
  return undefined
}

/** Follow an Apollo `{ __ref: "Type:id" }` pointer; pass through inline objects. */
export function resolveRef(cache: Json, value: unknown): Json | null {
  if (!value || typeof value !== "object") return null
  const v = value as Json
  if (typeof v.__ref === "string") {
    const target = cache[v.__ref]
    return target && typeof target === "object" ? (target as Json) : null
  }
  return v
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null
}

// ---------------------------------------------------------------------------
// HTML -> text
// ---------------------------------------------------------------------------

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

/** Rich description HTML -> readable text with paragraph breaks preserved. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/(p|li|ul|ol|div|h\d|tr)>/gi, "\n")
  const stripped = withBreaks.replace(/<[^>]+>/g, "")
  return decodeHtmlEntities(stripped)
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    // <li><p>…</p></li> emits two breaks per bullet; keep list items contiguous.
    .replace(/\n\n(- )/g, "\n$1")
    .trim()
}

// ---------------------------------------------------------------------------
// Search parsing
// ---------------------------------------------------------------------------

function findRootEntry(cache: Json, prefix: string): Json | null {
  const root = cache.ROOT_QUERY
  if (!root || typeof root !== "object") return null
  for (const [k, v] of Object.entries(root as Json)) {
    if (k.startsWith(prefix) && v && typeof v === "object") return v as Json
  }
  return null
}

function formatSalary(job: Json): string | null {
  const cjs = job.cjs as Json | undefined
  const cjsSalary = cjs?.salary as Json | undefined
  const display = str(cjsSalary?.displayValue)
  if (display) return display
  const s = job.salary as Json | undefined
  if (s && typeof s.min === "number" && typeof s.max === "number") {
    const cur = str(s.currency) ?? "THB"
    // The search payload says "monthly"/"annual"; the detail label says "per month".
    const periodMap: Record<string, string> = { monthly: "per month", annual: "per year", yearly: "per year", hourly: "per hour", daily: "per day" }
    const raw = str(s.period)?.toLowerCase()
    const period = raw ? (periodMap[raw] ?? `per ${raw}`) : ""
    return `${cur} ${s.min.toLocaleString("en-US")} – ${s.max.toLocaleString("en-US")}${period ? ` ${period}` : ""}`
  }
  return null
}

function parseOneCard(cache: Json, job: Json): JobCard | null {
  const id = str(job.id)
  const title = str(job.title)
  if (!id || !title) return null

  const org = resolveRef(cache, job.organisation)
  const advertiser = job.advertiser as Json | undefined
  const company = str(org?.name) ?? str(field(advertiser, "name")) ?? null

  const loc = resolveRef(cache, job.location)
  const location = str((loc?.displayName as Json | undefined)?.text) ?? str(field(loc, "label")) ?? null

  const listedAt = job.listedAt as Json | undefined
  const date = str(listedAt?.dateTimeUtc)

  const cjs = job.cjs as Json | undefined
  const workTypes = Array.isArray(cjs?.workTypes) ? (cjs!.workTypes as Json[]) : []
  const workType = workTypes.map((w) => str(field(w, "name"))).filter(Boolean).join(", ") || null

  const arrangements = Array.isArray(job.workArrangements) ? (job.workArrangements as unknown[]) : []
  const workArrangement =
    arrangements
      .map((a) => resolveRef(cache, a))
      .map((a) => str((field(a, "label") as Json | undefined)?.text) ?? str(field(a, "label")) ?? str(a?.name))
      .filter(Boolean)
      .join(", ") || null

  const categories = Array.isArray(job.categories) ? (job.categories as unknown[]) : []
  const classification =
    categories
      .map((c) => resolveRef(cache, c))
      .map((c) => str(field(c, "label")) ?? str(c?.name))
      .filter(Boolean)
      .join(" / ") || null

  return {
    id,
    title,
    company,
    location,
    date,
    url: `${DETAIL_URL}/${id}`,
    salary: formatSalary(job),
    workType,
    workArrangement,
    classification,
    abstract: str(job.abstract),
  }
}

/**
 * Parse the search page. Each job is parsed independently inside try/catch so
 * one malformed entry cannot break the rest.
 */
export function parseSearchPage(html: string): SearchPage {
  const cache = extractApolloData(html)
  if (!cache) throw new Error("Could not find embedded search data (SEEK_APOLLO_DATA) in the page - JobsDB may have changed its markup or served a bot-protection page")
  const search = findRootEntry(cache, "jobSearchV7")
  if (!search) throw new Error("Embedded data has no jobSearchV7 entry - JobsDB may have changed its markup")

  const jobs = ((search.results as Json | undefined)?.jobs as unknown[] | undefined) ?? []
  const results: JobCard[] = []
  for (const j of jobs) {
    try {
      const card = parseOneCard(cache, j as Json)
      if (card) results.push(card)
    } catch {
      // skip the malformed card
    }
  }

  const sol = (search.metadata as Json | undefined)?.sol as Json | undefined
  return {
    results,
    pageSize: typeof sol?.pageSize === "number" ? sol.pageSize : null,
    total: typeof sol?.totalJobCount === "number" ? sol.totalJobCount : null,
  }
}

// ---------------------------------------------------------------------------
// Detail parsing
// ---------------------------------------------------------------------------

/** Returns null when the page has no jobDetails entry (removed posting). */
export function parseJobDetail(html: string, id: string): JobDetail | null {
  const cache = extractApolloData(html)
  if (!cache) return null
  const details = findRootEntry(cache, "jobDetails")
  const job = details?.job as Json | undefined
  if (!job) return null

  const listedAt = job.listedAt as Json | undefined
  const expiresAt = job.expiresAt as Json | undefined
  const classifications = Array.isArray(job.classifications) ? (job.classifications as Json[]) : []
  const descHtml = str(field(job, "content2"))
  const status = str(job.status)
  const isExpired = job.isExpired === true

  return {
    id: str(job.id) ?? id,
    title: str(job.title) ?? "(untitled)",
    company: str(field(job.advertiser, "name")),
    location: str(field(job.location, "label")),
    date: str(listedAt?.dateTimeUtc),
    expiresAt: str(expiresAt?.dateTimeUtc),
    url: `${DETAIL_URL}/${id}`,
    salary: str((job.salary as Json | undefined)?.label),
    workType: str(field(job.workTypes, "label")),
    classification: classifications.map((c) => str(field(c, "label"))).filter(Boolean).join(" / ") || null,
    abstract: str(job.abstract),
    description: descHtml ? htmlToText(descHtml) || null : null,
    isActive: !isExpired && (status === null || status === "Active"),
  }
}

/** Map a job age in days onto JobsDB's daterange buckets (1, 3, 7, 14, 31). */
export function jobageToDaterange(days: number): string | null {
  if (!Number.isFinite(days) || days <= 0 || days >= 9999) return null
  for (const bucket of [1, 3, 7, 14, 31]) {
    if (days <= bucket) return String(bucket)
  }
  return null // beyond the portal's maximum: no filter
}

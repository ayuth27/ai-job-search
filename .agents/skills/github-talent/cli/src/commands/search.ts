import { apiGet, buildQuery, cell, filterByAge, mapUser, writeError, ApiError, type Profile } from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  languages: string[]
  minRepos?: number
  minFollowers?: number
  jobage?: number
  page: number
  limit: number
  hydrate: boolean
  format: "json" | "table" | "plain"
}

interface SearchResponse {
  total_count?: number
  items?: unknown[]
}

export async function runSearch(o: SearchOpts): Promise<number> {
  const q = buildQuery(o)
  const perPage = Math.min(o.limit, 30)
  let rate: number | null = null
  try {
    // One page per invocation, by design (privacy / rate-limit rule).
    const res = await apiGet<SearchResponse>(
      `/search/users?q=${encodeURIComponent(q)}&per_page=${perPage}&page=${o.page}`,
    )
    rate = res.rateRemaining
    const items = (res.data?.items ?? []).slice(0, o.limit)
    let results: Profile[] = items.map(mapUser)
    if (o.hydrate) {
      const hydrated: Profile[] = []
      for (const r of results) {
        const u = await apiGet<unknown>(`/users/${encodeURIComponent(r.login)}`)
        if (u.rateRemaining !== null) rate = u.rateRemaining
        hydrated.push(u.data ? mapUser(u.data) : r)
      }
      results = hydrated
      if (o.jobage !== undefined) results = filterByAge(results, o.jobage)
    }
    const out = {
      meta: {
        count: results.length,
        page: o.page,
        total: typeof res.data?.total_count === "number" ? res.data.total_count : null,
        hydrated: o.hydrate,
        rate_limit_remaining: rate,
      },
      results,
    }
    process.stdout.write(format(out, o.format) + "\n")
    return 0
  } catch (e) {
    if (e instanceof ApiError) writeError(e.message, e.code)
    else writeError(e instanceof Error ? e.message : String(e), "FETCH_ERROR")
    return 1
  }
}

export function format(out: { meta: Record<string, unknown>; results: Profile[] }, fmt: string): string {
  if (fmt === "table") {
    const rows = out.results.map((r) =>
      [r.login, r.title, r.company, r.location, r.public_repos, r.followers, r.date?.slice(0, 10)].map(cell).join(" | "),
    )
    return ["login | name | company | location | repos | followers | updated", ...rows].join("\n")
  }
  if (fmt === "plain") {
    return out.results
      .map((r) => `${r.title} (@${r.login})\n  ${r.url}\n  company: ${cell(r.company)}  location: ${cell(r.location)}\n  bio: ${cell(r.bio)}`)
      .join("\n\n")
  }
  return JSON.stringify(out, null, 2)
}

import { describe, expect, test } from "bun:test"
import { runCLI, parseJSON } from "./helpers"

// Tiny live smoke test: one search page (3 hydrated users) and one detail fetch.
// Skipped by default so CI stays network-free; set GITHUB_TALENT_LIVE_TEST=1 to run.
const live = process.env.GITHUB_TALENT_LIVE_TEST ? test : test.skip

interface SearchOut {
  meta: { count: number; page: number; total: number | null; hydrated: boolean; rate_limit_remaining: number | null }
  results: Array<{ id: string; title: string; url: string; login: string; company: string | null; location: string | null; date: string | null }>
}

describe("github-talent live smoke test", () => {
  live("search returns hydrated candidates and detail reads one", async () => {
    const out = parseJSON<SearchOut>(await runCLI(["search", "-q", "machine learning", "-l", "Thailand", "--limit", "3", "--hydrate"]))
    expect(out.meta.hydrated).toBe(true)
    expect(out.meta.count).toBeGreaterThanOrEqual(1)
    expect(out.meta.count).toBeLessThanOrEqual(3)
    for (const r of out.results) {
      expect(r.id).toBe(r.login)
      expect(r.title.length).toBeGreaterThan(0)
      expect(r.url).toBe(`https://github.com/${r.login}`)
      expect(JSON.stringify(r)).not.toContain('"email"')
    }
    expect(out.results.some((r) => r.date)).toBe(true)

    const d = parseJSON<{ profile: { login: string }; repos: unknown[] }>(await runCLI(["detail", out.results[0].login]))
    expect(d.profile.login).toBe(out.results[0].login)
    expect(Array.isArray(d.repos)).toBe(true)
  }, 60000)
})

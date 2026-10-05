import { describe, expect, test } from "bun:test"
import { buildQuery, filterByAge, mapRepo, mapUser, parseLogin } from "../src/helpers"
import { formatDetail } from "../src/commands/detail"
import { runCLI } from "./helpers"
import search from "./fixtures/search.json"
import user from "./fixtures/user.json"
import sparse from "./fixtures/user-sparse.json"
import repos from "./fixtures/repos.json"

const CONTRACT = ["id", "title", "company", "location", "date", "url", "login", "bio", "blog", "hireable", "public_repos", "followers"]

describe("mapUser", () => {
  test("search item: contract keys present, unreturned fields null", () => {
    const p = mapUser(search.items[0])
    expect(Object.keys(p)).toEqual(CONTRACT)
    expect(p.id).toBe("example-dev")
    expect(p.title).toBe("example-dev")
    expect(p.url).toBe("https://github.com/example-dev")
    for (const k of ["company", "location", "date", "bio", "blog", "hireable", "public_repos", "followers"]) {
      expect((p as Record<string, unknown>)[k]).toBeNull()
    }
  })
  test("hydrated user maps all fields", () => {
    const p = mapUser(user)
    expect(p).toMatchObject({ title: "Example Dev", company: "Example Co", location: "Bangkok, Thailand", date: "2026-09-01T10:00:00Z", hireable: true, public_repos: 42, followers: 120, blog: "https://example.dev" })
  })
  test("empty strings and nulls become null", () => {
    const p = mapUser(sparse)
    expect(p.title).toBe("other-dev")
    expect(p.blog).toBeNull()
    expect(p.company).toBeNull()
    expect(p.followers).toBe(0)
  })
  test("email never appears in output", () => {
    expect(JSON.stringify(mapUser(user))).not.toContain("leak@example.com")
    expect(JSON.stringify(mapUser(search.items[0]))).not.toContain("email")
    const out = formatDetail({ profile: mapUser(user), repos: repos.map(mapRepo) }, "json")
    expect(out).not.toMatch(/email|@example\.com|x@y\.z/)
  })
})

describe("mapRepo", () => {
  test("maps and null-fills", () => {
    expect(mapRepo(repos[0])).toEqual({ name: "ml-thing", description: "demo", language: "Python", stargazers_count: 7, pushed_at: "2026-09-02T00:00:00Z", html_url: "https://github.com/example-dev/ml-thing", topics: ["ml", "pytorch"] })
    expect(mapRepo(repos[1])).toMatchObject({ description: null, language: null, pushed_at: null, topics: [] })
  })
})

describe("buildQuery", () => {
  test("combines qualifiers", () => {
    expect(buildQuery({ query: "machine learning", location: "Bangkok", languages: ["python", "typescript"], minRepos: 5, minFollowers: 10 })).toBe(
      'machine learning location:"Bangkok" language:python language:typescript repos:>=5 followers:>=10 type:user',
    )
  })
  test("no filters other than type", () => {
    expect(buildQuery({ query: "x" })).toBe("x type:user")
  })
})

describe("parseLogin", () => {
  test("accepts logins and urls", () => {
    expect(parseLogin("octocat")).toBe("octocat")
    expect(parseLogin("@octocat")).toBe("octocat")
    expect(parseLogin("https://github.com/octocat")).toBe("octocat")
    expect(parseLogin("github.com/octocat/repo")).toBe("octocat")
    expect(parseLogin("bad/login!")).toBeNull()
  })
})

describe("filterByAge", () => {
  const now = Date.parse("2026-10-01T00:00:00Z")
  test("drops stale hydrated profiles, keeps fresh and undated", () => {
    const list = [mapUser(user), mapUser(sparse), mapUser(search.items[1])]
    // example-dev: updated 30 days ago (kept); other-dev (hydrated): 2020 (dropped); third: undated (kept)
    expect(filterByAge(list, 90, now).map((p) => p.login)).toEqual(["example-dev", "other-dev"])
    expect(filterByAge(list, 90, now).map((p) => p.date)).toEqual(["2026-09-01T10:00:00Z", null])
    expect(filterByAge([mapUser(sparse)], 90, now)).toEqual([])
  })
})

describe("CLI validation (no network)", () => {
  test("unknown flag -> UNKNOWN_FLAG", async () => {
    const r = await runCLI(["search", "-q", "x", "--bogus", "1"])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe("")
    expect(JSON.parse(r.stderr).code).toBe("UNKNOWN_FLAG")
  })
  test("token flag is unknown", async () => {
    const r = await runCLI(["search", "-q", "x", "--token", "abc"])
    expect(JSON.parse(r.stderr).code).toBe("UNKNOWN_FLAG")
  })
  test("detail rejects table format", async () => {
    const r = await runCLI(["detail", "octocat", "--format", "table"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })
  test("limit above 30 rejected", async () => {
    const r = await runCLI(["search", "-q", "x", "--limit", "31"])
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })
  test("search without any filter rejected", async () => {
    const r = await runCLI(["search"])
    expect(JSON.parse(r.stderr).code).toBe("NO_QUERY")
  })
})

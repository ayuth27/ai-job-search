import { describe, expect, test } from "bun:test";
import { runCLI, parseJSON } from "./helpers";

// One small live smoke test, kept deliberately tiny: a single search page and
// a single detail fetch. Personal-use portal - do not grow this into a crawl.
interface SearchOut {
  meta: { count: number; page: number; total: number | null };
  results: Array<{ id: string; title: string; company: string | null; url: string; date: string | null }>;
}

describe("JobsDB live smoke test", () => {
  test("search returns real results with the contract fields, and detail reads one", async () => {
    const result = await runCLI(["search", "-q", "software engineer", "-l", "Bangkok", "--limit", "3"]);
    const out = parseJSON<SearchOut>(result);
    expect(out.meta.count).toBeGreaterThanOrEqual(1);
    expect(out.meta.count).toBeLessThanOrEqual(3);
    for (const r of out.results) {
      expect(r.id).toMatch(/^\d+$/);
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.title).not.toMatch(/<|&amp;/);
      expect(r.url).toBe(`https://th.jobsdb.com/job/${r.id}`);
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    expect(out.results.some((r) => r.company)).toBe(true);

    const detail = await runCLI(["detail", out.results[0].id, "--format", "plain"]);
    expect(detail.exitCode).toBe(0);
    expect(detail.stdout).toContain("Status:");
    expect(detail.stdout).toContain(`URL: https://th.jobsdb.com/job/${out.results[0].id}`);
    expect(detail.stdout).not.toMatch(/<p>|&amp;|&nbsp;/);
  }, 60000);
});

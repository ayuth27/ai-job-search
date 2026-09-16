import { describe, expect, test } from "bun:test";
import {
  extractApolloData,
  parseSearchPage,
  parseJobDetail,
  jobageToDaterange,
  filterByJobAge,
  htmlToText,
  type JobCard,
} from "../src/helpers";
import { normalizeId } from "../src/commands/detail";
import { buildUrl } from "../src/commands/search";

// Offline fixture shaped like the live page (verified 2026-09-16): the Apollo
// cache is followed by another assignment on the same line, which is exactly
// what breaks a greedy regex + JSON.parse.
const searchCache = {
  "JobSearchV7JobOrganisation:1": { __typename: "JobSearchV7JobOrganisation", id: "1", name: "FlowAccount Co., Ltd." },
  "JobSearchV7JobLocation:1000002": {
    __typename: "JobSearchV7JobLocation",
    id: "1000002",
    displayName: { __typename: "JobSearchV7LocalizedText", text: "Bangkok" },
  },
  "JobSearchV7WorkArrangements:2": { __typename: "JobSearchV7WorkArrangements", id: "2", label: { text: "On-site" } },
  "SeekClassification:6290": { __typename: "SeekClassification", id: "6290", 'label({"languageCode":"en"})': "Engineering - Software" },
  ROOT_QUERY: {
    __typename: "Query",
    'jobSearchV7({"params":{"page":1}})': {
      __typename: "JobSearchV7SearchResponse",
      results: {
        jobs: [
          {
            __typename: "JobSearchV7Job",
            id: "94671909",
            title: "Software Engineer &amp; Lead",
            abstract: "เรากำลังมองหา Software Engineer",
            advertiser: { id: "60253635", name: "Advertiser Name" },
            organisation: { __ref: "JobSearchV7JobOrganisation:1" },
            location: { __ref: "JobSearchV7JobLocation:1000002" },
            categories: [{ __ref: "SeekClassification:6290" }],
            workArrangements: [{ __ref: "JobSearchV7WorkArrangements:2" }],
            cjs: {
              workTypes: [{ 'name({"locale":"en-TH"})': "Full time" }],
              salary: { displayValue: "฿60,000 – ฿85,000 per month" },
            },
            listedAt: { dateTimeUtc: "2026-09-16T07:12:17.000Z" },
            salary: { min: 60000, max: 85000, currency: "THB", period: "monthly" },
          },
          {
            // no organisation ref, salary only in the numeric form, inline location
            __typename: "JobSearchV7Job",
            id: "94670791",
            title: "Golang Developer",
            advertiser: { name: "Kiatnakin Phatra Bank" },
            location: { displayName: { text: "Chatuchak, Bangkok" } },
            listedAt: { dateTimeUtc: "2026-09-15T01:00:00.000Z" },
            salary: { min: 40000, max: 60000, currency: "THB", period: "monthly" },
          },
          { __typename: "JobSearchV7Job", id: "bad-no-title" },
          "not-an-object",
        ],
      },
      metadata: { sol: { pageSize: 30, pageNumber: 1, totalJobCount: 830 } },
    },
  },
};

const detailCache = {
  ROOT_QUERY: {
    'jobDetails:{"id":"94671909"}': {
      __typename: "JobDetails",
      job: {
        id: "94671909",
        title: "Software Engineer",
        status: "Active",
        isExpired: false,
        abstract: "teaser",
        listedAt: { dateTimeUtc: "2026-09-16T07:12:17.668Z" },
        expiresAt: { dateTimeUtc: "2026-10-16T12:59:59.999Z" },
        salary: { label: "฿60,000 – ฿85,000 per month" },
        workTypes: { 'label({"locale":"en-TH"})': "Full time" },
        advertiser: { 'name({"locale":"en-TH"})': "FlowAccount Co., Ltd." },
        location: { 'label({"locale":"en-TH","type":"LONG"})': "Bangkok" },
        classifications: [{ 'label({"languageCode":"en"})': "Engineering - Software (ICT)" }],
        'content2({"zone":"asia-3"})':
          "<p><strong>About</strong> us &amp; you</p><ul><li><p>Build APIs</p></li><li><p>Ship fast</p></li></ul><p>Line one<br/>Line two</p>",
      },
    },
  },
};

function page(cache: unknown): string {
  return `<html><head></head><body><script>window.SEEK_APOLLO_DATA = ${JSON.stringify(cache)};     window.SEEK_ENROLLED_EXPERIMENTS = {"x":"{\\"a\\":1}"};</script></body></html>`;
}

describe("extractApolloData", () => {
  test("parses the balanced object even with trailing statements on the line", () => {
    const cache = extractApolloData(page(searchCache));
    expect(cache).not.toBeNull();
    expect(Object.keys(cache!.ROOT_QUERY as object)).toContain('jobSearchV7({"params":{"page":1}})');
  });

  test("returns null when the marker is absent (bot page / markup change)", () => {
    expect(extractApolloData("<html><body>Access denied</body></html>")).toBeNull();
  });

  test("survives braces inside string values", () => {
    const html = page({ ROOT_QUERY: { 'k({"a":"}{"})': { note: "}}{{" } } });
    expect(extractApolloData(html)).not.toBeNull();
  });
});

describe("parseSearchPage", () => {
  const parsed = parseSearchPage(page(searchCache));

  test("yields one card per well-formed job and skips malformed entries", () => {
    expect(parsed.results.map((r) => r.id)).toEqual(["94671909", "94670791"]);
    expect(parsed.total).toBe(830);
    expect(parsed.pageSize).toBe(30);
  });

  test("prefers the organisation name, resolves refs, and formats salary", () => {
    const first = parsed.results[0];
    expect(first.company).toBe("FlowAccount Co., Ltd.");
    expect(first.location).toBe("Bangkok");
    expect(first.date).toBe("2026-09-16T07:12:17.000Z");
    expect(first.url).toBe("https://th.jobsdb.com/job/94671909");
    expect(first.salary).toBe("฿60,000 – ฿85,000 per month");
    expect(first.workType).toBe("Full time");
    expect(first.workArrangement).toBe("On-site");
    expect(first.classification).toBe("Engineering - Software");
  });

  test("falls back to advertiser name, inline location and numeric salary", () => {
    const second = parsed.results[1];
    expect(second.company).toBe("Kiatnakin Phatra Bank");
    expect(second.location).toBe("Chatuchak, Bangkok");
    expect(second.salary).toBe("THB 40,000 – 60,000 per month");
    expect(second.workType).toBeNull();
    expect(second.workArrangement).toBeNull();
    expect(second.classification).toBeNull();
    expect(second.abstract).toBeNull();
  });

  test("every contract field is present (null, never omitted)", () => {
    for (const r of parsed.results) {
      for (const k of ["id", "title", "company", "location", "date", "url"]) {
        expect(k in r).toBe(true);
      }
    }
  });

  test("throws a descriptive error when the embedded data is missing", () => {
    expect(() => parseSearchPage("<html></html>")).toThrow(/SEEK_APOLLO_DATA/);
  });
});

describe("parseJobDetail", () => {
  test("extracts fields and converts the HTML description to text", () => {
    const job = parseJobDetail(page(detailCache), "94671909");
    expect(job).not.toBeNull();
    expect(job!.title).toBe("Software Engineer");
    expect(job!.company).toBe("FlowAccount Co., Ltd.");
    expect(job!.location).toBe("Bangkok");
    expect(job!.salary).toBe("฿60,000 – ฿85,000 per month");
    expect(job!.workType).toBe("Full time");
    expect(job!.classification).toBe("Engineering - Software (ICT)");
    expect(job!.expiresAt).toBe("2026-10-16T12:59:59.999Z");
    expect(job!.isActive).toBe(true);
    expect(job!.description).toBe("About us & you\n- Build APIs\n- Ship fast\n\nLine one\nLine two");
  });

  test("returns null when the page has no jobDetails entry", () => {
    expect(parseJobDetail(page({ ROOT_QUERY: {} }), "1")).toBeNull();
  });

  test("marks expired postings inactive", () => {
    const expired = structuredClone(detailCache) as typeof detailCache;
    expired.ROOT_QUERY['jobDetails:{"id":"94671909"}'].job.isExpired = true;
    expect(parseJobDetail(page(expired), "94671909")!.isActive).toBe(false);
  });
});

describe("helpers", () => {
  test("jobageToDaterange rounds up to the portal's buckets", () => {
    expect(jobageToDaterange(1)).toBe("1");
    expect(jobageToDaterange(2)).toBe("3");
    expect(jobageToDaterange(7)).toBe("7");
    expect(jobageToDaterange(10)).toBe("14");
    expect(jobageToDaterange(31)).toBe("31");
    expect(jobageToDaterange(60)).toBeNull();
    expect(jobageToDaterange(9999)).toBeNull();
  });

  function card(id: string, date: string | null): JobCard {
    return {
      id,
      title: "t",
      company: null,
      location: null,
      date,
      url: `https://th.jobsdb.com/job/${id}`,
      salary: null,
      workType: null,
      workArrangement: null,
      classification: null,
      abstract: null,
    };
  }

  test("filterByJobAge drops results older than the requested window, keeps unknown dates", () => {
    const now = new Date("2026-09-16T12:00:00.000Z");
    const cards = [
      card("1", "2026-09-16T06:00:00.000Z"), // 6h old - within 7 days
      card("2", "2026-09-01T00:00:00.000Z"), // ~15 days old - outside 7 days
      card("3", null), // unknown date - never dropped
    ];
    expect(filterByJobAge(cards, 7, now).map((c) => c.id)).toEqual(["1", "3"]);
  });

  test("filterByJobAge is a no-op for the 'all' sentinel (9999) and non-positive values", () => {
    const now = new Date("2026-09-16T12:00:00.000Z");
    const cards = [card("1", "2020-01-01T00:00:00.000Z")];
    expect(filterByJobAge(cards, 9999, now)).toEqual(cards);
    expect(filterByJobAge(cards, 0, now)).toEqual(cards);
  });

  test("htmlToText decodes numeric entities", () => {
    expect(htmlToText("<p>caf&#233; &#x1F600;</p>")).toBe("café 😀");
  });

  test("normalizeId accepts ids and job URLs with tracking params", () => {
    expect(normalizeId("94671909")).toBe("94671909");
    expect(normalizeId("https://th.jobsdb.com/job/94671909?type=standard&ref=x")).toBe("94671909");
    expect(normalizeId("https://th.jobsdb.com/job/94671909")).toBe("94671909");
    expect(normalizeId("abc")).toBeNull();
    expect(normalizeId("12")).toBeNull();
  });

  test("buildUrl puts keywords first (robots.txt allows only ?keywords) and maps flags", () => {
    const url = buildUrl({ query: "software engineer", location: "Bangkok", jobage: 10, page: 2, format: "json" });
    expect(url.startsWith("https://th.jobsdb.com/jobs?keywords=software+engineer")).toBe(true);
    expect(url).toContain("where=Bangkok");
    expect(url).toContain("daterange=14");
    expect(url).toContain("page=2");
    const bare = buildUrl({ query: "x", jobage: 9999, page: 1, format: "json" });
    expect(bare).toBe("https://th.jobsdb.com/jobs?keywords=x");
  });
});

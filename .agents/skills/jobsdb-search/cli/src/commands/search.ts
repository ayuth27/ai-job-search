import { SEARCH_URL, htmlFetch, parseSearchPage, jobageToDaterange, filterByJobAge, writeError, type JobCard } from "../helpers.js"

export interface SearchOpts {
  query: string
  location?: string
  jobage: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

export function buildUrl(opts: SearchOpts): string {
  // `keywords` goes first on purpose: robots.txt allows `*?keywords` and
  // disallows every other query-string form.
  const params = new URLSearchParams()
  params.set("keywords", opts.query)
  if (opts.location) params.set("where", opts.location)
  const dr = jobageToDaterange(opts.jobage)
  if (dr) params.set("daterange", dr)
  if (opts.page > 1) params.set("page", String(opts.page))
  return `${SEARCH_URL}?${params.toString()}`
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 44).padEnd(44)
    const company = (c.company || "—").slice(0, 26).padEnd(26)
    const loc = (c.location || "—").slice(0, 22).padEnd(22)
    const date = c.date ? c.date.slice(0, 10) : "—"
    return `${c.id.padEnd(10)} ${title} ${company} ${loc} ${date}`
  })
  const header =
    "ID".padEnd(10) + " " + "TITLE".padEnd(44) + " " + "COMPANY".padEnd(26) + " " + "LOCATION".padEnd(22) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const html = await htmlFetch(buildUrl(opts))
    if (!html) {
      writeError("Search page not found", "NOT_FOUND")
      return 1
    }
    const page = parseSearchPage(html)
    // The server's daterange bucket rounds up (see jobageToDaterange), so filter
    // client-side too: drop results known to be older than --jobage.
    let cards = filterByJobAge(page.results, opts.jobage)
    if (opts.limit !== undefined && opts.limit >= 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.date ? c.date.slice(0, 10) : "—"}${c.salary ? ` · ${c.salary}` : ""}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length, page: opts.page, pageSize: page.pageSize, total: page.total }, results: cards },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}

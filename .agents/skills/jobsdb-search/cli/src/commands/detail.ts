import { DETAIL_URL, htmlFetch, parseJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a bare numeric id or a th.jobsdb.com/job/<id> URL (with or without tracking params). */
export function normalizeId(input: string): string | null {
  const trimmed = input.trim()
  const bare = trimmed.match(/^\d{5,}$/)
  if (bare) return trimmed
  const url = trimmed.match(/\/job\/(\d{5,})(?:[\/?#]|$)/)
  if (url) return url[1]
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a JobsDB job id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const html = await htmlFetch(`${DETAIL_URL}/${id}`)
    const job = html ? parseJobDetail(html, id) : null
    if (!job) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}`,
        "",
        job.salary ? `Salary: ${job.salary}` : "",
        job.workType ? `Work type: ${job.workType}` : "",
        job.classification ? `Classification: ${job.classification}` : "",
        job.date ? `Posted: ${job.date.slice(0, 10)}` : "",
        job.expiresAt ? `Expires: ${job.expiresAt.slice(0, 10)}` : "",
        `Status: ${job.isActive ? "ACTIVE" : "CLOSED / EXPIRED"}`,
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}

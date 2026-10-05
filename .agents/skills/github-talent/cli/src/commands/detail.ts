import { apiGet, cell, mapRepo, mapUser, parseLogin, writeError, ApiError, type Profile, type Repo } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export function formatDetail(out: { profile: Profile; repos: Repo[] }, fmt: string): string {
  if (fmt === "plain") {
    const p = out.profile
    const lines = [
      `${p.title} (@${p.login})`,
      `URL: ${p.url}`,
      `Company: ${cell(p.company)}`,
      `Location: ${cell(p.location)}`,
      `Blog: ${cell(p.blog)}`,
      `Hireable: ${cell(p.hireable)}`,
      `Public repos: ${cell(p.public_repos)}  Followers: ${cell(p.followers)}`,
      `Updated: ${cell(p.date)}`,
      `Bio: ${cell(p.bio)}`,
      "",
      "Recent repos:",
      ...out.repos.map((r) => `  ${r.name} [${cell(r.language)}] stars=${cell(r.stargazers_count)} pushed=${cell(r.pushed_at?.slice(0, 10))} ${r.topics.join(",")}\n    ${cell(r.description)}`),
    ]
    return lines.join("\n")
  }
  return JSON.stringify(out, null, 2)
}

export async function runDetail(o: DetailOpts): Promise<number> {
  const login = parseLogin(o.id)
  if (!login) {
    writeError(`"${o.id}" is not a GitHub login or profile URL`, "BAD_ARG")
    return 1
  }
  try {
    const u = await apiGet<unknown>(`/users/${encodeURIComponent(login)}`)
    if (!u.data) {
      writeError(`GitHub user "${login}" not found`, "NOT_FOUND")
      return 1
    }
    const r = await apiGet<unknown[]>(`/users/${encodeURIComponent(login)}/repos?sort=updated&per_page=10`)
    const out = { profile: mapUser(u.data), repos: (r.data ?? []).map(mapRepo) }
    process.stdout.write(formatDetail(out, o.format) + "\n")
    return 0
  } catch (e) {
    if (e instanceof ApiError) writeError(e.message, e.code)
    else writeError(e instanceof Error ? e.message : String(e), "FETCH_ERROR")
    return 1
  }
}

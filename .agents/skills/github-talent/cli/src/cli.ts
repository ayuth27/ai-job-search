#!/usr/bin/env bun
// Self-contained CLI for finding developer candidates via the official GitHub
// REST API. Zero runtime dependencies. Personal use only: public data, low
// volume, no email harvesting, no bulk messaging (see SKILL.md).
// Auth: optional GITHUB_API_TOKEN env var only - never a flag.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { writeError } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

const BOOLEAN_FLAGS = new Set(["hydrate", "help", "h"])
const REPEATABLE = new Set(["language"])

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("-") && a.length > 1) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (BOOLEAN_FLAGS.has(key) || next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        if (REPEATABLE.has(key) && typeof flags[key] === "string") flags[key] = `${flags[key]},${next}`
        else flags[key] = next
        i++
      }
    } else {
      flags._.push(a)
    }
  }
  return flags
}

const HELP = `github-talent - find developer candidates via the official GitHub REST API

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <login|profile-url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Free-text keywords.
  --location, -l <text>   Adds location:"<text>" (e.g. Bangkok, Thailand).
  --language <lang>       Adds language:<lang>. Repeat or comma-separate.
  --min-repos <n>         Adds repos:>=n.
  --min-followers <n>     Adds followers:>=n.
  --jobage <days>         Only with --hydrate: keep profiles updated within N days. Ignored otherwise.
  --page <n>              1-indexed page. One page per invocation. Default 1.
  --limit <n>             Cap results (client-side). Default 20, max 30.
  --hydrate               Fetch /users/{login} per result (1 extra request each).
  --format <fmt>          json (default) | table | plain.

AUTH (optional)
  Export GITHUB_API_TOKEN to raise rate limits. Never passed as a flag, never logged.

EXAMPLES
  bun run src/cli.ts search -q "machine learning" -l Bangkok --language python --limit 10 --format table
  bun run src/cli.ts detail https://github.com/octocat --format plain

Personal use only - public data, low volume, no emails, no bulk messaging.
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "location", "language", "min-repos", "min-followers", "jobage", "page", "limit", "hydrate", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

function badArg(error: string): number {
  writeError(error, "BAD_ARG")
  return 1
}

function intFlag(name: string, raw: string | boolean | string[], min: number): number | null {
  const val = typeof raw === "string" ? Number(raw.trim()) : NaN
  if (!Number.isInteger(val) || val < min) {
    badArg(`--${name} must be a whole number of at least ${min}, got "${raw}"`)
    return null
  }
  return val
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = flags._[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  const known = KNOWN_FLAGS[cmd]
  if (known) {
    for (const key of Object.keys(flags)) {
      if (key === "_" || known.has(key)) continue
      writeError(`unknown flag --${key} for '${cmd}' - flags are never silently ignored; see --help for the supported flags`, "UNKNOWN_FLAG")
      return 1
    }
  }

  if (cmd === "search") {
    const fmt = typeof flags.format === "string" ? flags.format : "json"
    if (!["json", "table", "plain"].includes(fmt)) return badArg(`--format must be json, table or plain, got "${fmt}"`)
    const str = (k: string) => (typeof flags[k] === "string" ? (flags[k] as string) : undefined)
    const opts: SearchOpts = {
      query: str("query"),
      location: str("location"),
      languages: (str("language") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      page: 1,
      limit: 20,
      hydrate: flags.hydrate === true,
      format: fmt as SearchOpts["format"],
    }
    for (const [flag, set] of [
      ["min-repos", (v: number) => (opts.minRepos = v)],
      ["min-followers", (v: number) => (opts.minFollowers = v)],
      ["jobage", (v: number) => (opts.jobage = v)],
      ["page", (v: number) => (opts.page = v)],
      ["limit", (v: number) => (opts.limit = v)],
    ] as const) {
      if (flags[flag] === undefined) continue
      const v = intFlag(flag, flags[flag], flag === "min-repos" || flag === "min-followers" ? 0 : 1)
      if (v === null) return 1
      set(v)
    }
    if (opts.limit > 30) return badArg(`--limit must be at most 30 (one API page), got ${opts.limit}`)
    if (!opts.query && !opts.location && opts.languages.length === 0) {
      writeError("provide at least one of --query, --location or --language", "NO_QUERY")
      return 1
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = flags._[1]
    if (!id) {
      writeError("detail requires a <login|profile-url>", "NO_ID")
      return 1
    }
    const fmt = typeof flags.format === "string" ? flags.format : "json"
    if (fmt !== "json" && fmt !== "plain") return badArg(`detail --format must be json or plain, got "${fmt}"`)
    const opts: DetailOpts = { id, format: fmt }
    return runDetail(opts)
  }

  writeError(`Unknown command "${cmd}"`, "BAD_CMD")
  return 1
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    writeError(e instanceof Error ? e.message : String(e), "INTERNAL_ERROR")
    process.exit(1)
  })

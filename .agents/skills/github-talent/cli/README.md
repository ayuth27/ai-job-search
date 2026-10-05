# github-talent-cli

Zero-runtime-dependency Bun/TypeScript CLI over the official GitHub REST API
(search users, read one profile). See `../SKILL.md` for usage and the privacy
rules (no emails, one page per call, personal use only).

```bash
bun install
bun run typecheck
bun test --timeout 30000                                   # network-free
GITHUB_TALENT_LIVE_TEST=1 bun test tests/live.test.ts      # ~5 live requests
```

Optional auth: `export GITHUB_API_TOKEN=...` (never a flag).

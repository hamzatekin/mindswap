# Mindswap

Personal second brain: capture tasks, notes, links, music, movies from your phone;
a Claude Code agent (running on your subscription via `claude -p`) files everything
into a git-tracked markdown brain and feeds back insights, recommendations, and a
daily digest.

## How it works

```
phone PWA ── capture / share sheet ──▶ Hono API ──▶ SQLite (items)
                                                       │
agent loop (same process): polls for new items ────────┘
  cd data/brain && claude -p <prompt>  → updates markdown brain, returns insight
  → insight stored, item marked processed → git commit
phone PWA ◀── inbox + insights feed
```

- `server/` — Hono API + static PWA + agent loop (`node:sqlite`, zero DB deps)
- `src/` — React PWA (capture / inbox / insights, bottom tab bar, share target)
- `prompts/` — the agent's instructions (`on-item.md`, `digest.md`) — edit to taste
- `brain/` — template for the agent's memory; lives in `$DATA_DIR/brain` as a git repo at runtime
- `shared/types.ts` — types shared by server and app

## Develop

```sh
npm i
npm run dev:server   # API on :8787 (agent runs too; AGENT_DISABLED=1 to skip)
npm run dev          # Vite on :5173, proxies /api → :8787. Token is "dev".
```

## Deploy

See [deploy.md](deploy.md) — plain Docker Compose + Caddy on a VPS: clone, fill `.env`
(two secrets), `docker compose up -d --build`, one Caddy block for HTTPS.
volume at `/data`.

## Config (env)

| var | default | |
|---|---|---|
| `BRAIN_TOKEN` | `dev` (required in prod) | app access token |
| `CLAUDE_CODE_OAUTH_TOKEN` | — | subscription auth for the agent |
| `DATA_DIR` | `./data` | SQLite + brain git repo |
| `AGENT_POLL_MS` | `30000` | poll interval |
| `DIGEST_HOUR` | `5` | daily digest hour (UTC) |
| `GIT_REMOTE` | — | optional brain backup remote |
| `AGENT_DISABLED` | — | `1` to run server only |

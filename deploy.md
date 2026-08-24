# Deploying Mindswap (Coolify + Caddy on your VPS)

## 1. Generate the two secrets

On your Mac:

```sh
# Claude subscription token for the agent (opens browser once, prints a long-lived token)
claude setup-token

# App access token (anything long and random)
openssl rand -hex 24
```

## 2. Coolify

1. Push this repo to a git remote Coolify can reach (private GitHub is fine).
2. Coolify → New Resource → your repo → build pack **Dockerfile**.
3. Environment variables:
   - `BRAIN_TOKEN` — the `openssl rand` value (what you'll type into the app)
   - `CLAUDE_CODE_OAUTH_TOKEN` — output of `claude setup-token`
   - `GIT_REMOTE` — optional: an SSH/HTTPS remote for brain backup (needs creds baked into the URL if HTTPS)
4. **Persistent storage**: mount a volume at `/data` (SQLite DB + the brain git repo live there).
5. Port: expose `8787`, attach your domain — Coolify/Caddy handles HTTPS.

## 3. Phone

Open the domain in the browser → enter `BRAIN_TOKEN` → Add to Home Screen.
After installing, the app appears in the system share sheet (Android; on iOS use
copy-paste into Capture — iOS PWAs don't support share targets).

## 4. Verify the agent

```sh
curl -s -H "Authorization: Bearer $BRAIN_TOKEN" https://your.domain/api/items \
  -X POST -H 'content-type: application/json' \
  -d '{"body":"test item: remind me how cool this is"}'
# ~30-60s later:
curl -s -H "Authorization: Bearer $BRAIN_TOKEN" https://your.domain/api/insights
```

Logs: the container prints `[agent] …` lines for every processed item.

## Notes

- Set `AGENT_DISABLED=1` to run the server without the agent (e.g. locally).
- Daily digest runs at 05:00 UTC (`DIGEST_HOUR` to change); force one with
  `POST /api/digest`.
- The brain is a git repo inside the volume — `docker exec` in and `git log` to
  see everything the agent has ever changed.

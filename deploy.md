# Deploying Mindswap (plain Docker + Caddy on your VPS)

## 0. One-time, on your Mac

```sh
claude setup-token        # long-lived subscription token for the agent — copy it
openssl rand -hex 24      # app access token — copy it
```

## 1. One-time, on the VPS

```sh
git clone https://github.com/hamzatekin/mindswap.git && cd mindswap
cp .env.example .env
nano .env                 # paste BRAIN_TOKEN and CLAUDE_CODE_OAUTH_TOKEN
docker compose up -d --build
curl -s localhost:8787/api/health   # → {"ok":true}
```

Then point Caddy at it — add the block from `Caddyfile.example` to your Caddyfile
with your (sub)domain, and reload:

```sh
sudo systemctl reload caddy
```

Caddy fetches the TLS cert automatically. The app container only listens on
127.0.0.1, so the only way in from outside is through Caddy + the bearer token.

## 2. Updating

```sh
cd mindswap && git pull && docker compose up -d --build
```

## 3. Phone

Open https://mindswap.yourdomain.com → enter `BRAIN_TOKEN` → Add to Home Screen.
Android: the app then appears in the share sheet. iOS: share targets aren't
supported — paste into Capture.

## 4. Verify the agent

```sh
curl -s https://mindswap.yourdomain.com/api/items \
  -H "Authorization: Bearer $BRAIN_TOKEN" -H 'content-type: application/json' \
  -d '{"body":"test: recommend me something based on nothing"}'
# ~30-60s later
curl -s https://mindswap.yourdomain.com/api/insights -H "Authorization: Bearer $BRAIN_TOKEN"
```

Agent activity: `docker compose logs -f` (look for `[agent]` lines).
The brain lives in `./data/brain` on the host — it's a git repo; `git log` shows
every change the agent ever made.

## Notes

- `AGENT_DISABLED=1` in `.env` runs the server without the agent.
- Daily digest at 05:00 UTC (`DIGEST_HOUR`); force one: `POST /api/digest`.
- Backup = copy `./data` (SQLite DB + brain), or set `GIT_REMOTE` to push the
  brain to a private repo after every commit.

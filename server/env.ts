import path from "node:path"

const isProd = process.env.NODE_ENV === "production"

const token = process.env.BRAIN_TOKEN ?? (isProd ? null : "dev")
if (token === null) {
  console.error("BRAIN_TOKEN is required in production")
  process.exit(1)
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 8787),
  dataDir: path.resolve(process.env.DATA_DIR ?? "./data"),
  token,
  pollMs: Number(process.env.AGENT_POLL_MS ?? 30_000),
  gitRemote: process.env.GIT_REMOTE ?? null,
  digestHour: Number(process.env.DIGEST_HOUR ?? 5),
  agentDisabled: process.env.AGENT_DISABLED === "1",
} as const

export const brainDir = path.join(env.dataDir, "brain")

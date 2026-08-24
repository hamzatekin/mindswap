import { execFile } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import { brainDir, env } from "./env.ts"
import {
  getMeta,
  hasItemsSince,
  insertInsight,
  nextNewItem,
  recentItemsSince,
  setMeta,
  updateItem,
} from "./db.ts"
import { isItemType, type Item } from "../shared/types.ts"

const exec = promisify(execFile)
const promptsDir = path.resolve(import.meta.dirname, "../prompts")

function log(message: string): void {
  console.log(`[agent] ${new Date().toISOString()} ${message}`)
}

async function git(...args: string[]): Promise<void> {
  await exec("git", args, { cwd: brainDir })
}

export function initBrain(): void {
  if (!fs.existsSync(brainDir)) {
    fs.cpSync(path.resolve(import.meta.dirname, "../brain"), brainDir, { recursive: true })
  }
  if (!fs.existsSync(path.join(brainDir, ".git"))) {
    void (async () => {
      await git("init")
      await git("config", "user.name", "mindswap-agent")
      await git("config", "user.email", "agent@mindswap.local")
      await git("add", "-A")
      await git("commit", "-m", "init brain")
      log("brain git repo initialised")
    })().catch((error: unknown) => log(`brain git init failed: ${String(error)}`))
  }
}

async function commitBrain(message: string): Promise<void> {
  try {
    await git("add", "-A")
    const { stdout } = await exec("git", ["status", "--porcelain"], { cwd: brainDir })
    if (stdout.trim() !== "") await git("commit", "-m", message)
    if (env.gitRemote) {
      await git("remote", "get-url", "origin").catch(() => git("remote", "add", "origin", env.gitRemote ?? ""))
      await git("push", "-u", "origin", "HEAD").catch(() => log("git push failed (ignored)"))
    }
  } catch (error) {
    log(`git commit failed: ${String(error)}`)
  }
}

interface ClaudeResult {
  text: string
  json: Record<string, unknown> | null
}

async function runClaude(prompt: string): Promise<ClaudeResult> {
  const { stdout } = await exec(
    "claude",
    [
      "-p",
      "--output-format", "json",
      "--allowedTools", "Read,Write,Edit,Glob,Grep",
      "--max-turns", "40",
      prompt,
    ],
    { cwd: brainDir, timeout: 15 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 },
  )
  const parsed: unknown = JSON.parse(stdout)
  if (typeof parsed !== "object" || parsed === null || !("result" in parsed)) {
    throw new Error("unexpected claude output shape")
  }
  const text = String((parsed as { result: unknown }).result)
  return { text, json: extractJson(text) }
}

function extractJson(text: string): Record<string, unknown> | null {
  const fenced = /```json\s*([\s\S]*?)```/.exec(text)
  const candidate = fenced?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
  try {
    const parsed: unknown = JSON.parse(candidate)
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function loadPrompt(name: string, vars: Record<string, string>): string {
  let text = fs.readFileSync(path.join(promptsDir, name), "utf8")
  for (const [key, value] of Object.entries(vars)) {
    text = text.replaceAll(`{{${key}}}`, value)
  }
  return text
}

async function processItem(item: Item): Promise<void> {
  log(`processing item #${item.id}`)
  const prompt = loadPrompt("on-item.md", { ITEM_JSON: JSON.stringify(item, null, 2) })
  const { text, json } = await runClaude(prompt)

  const type = typeof json?.type === "string" && isItemType(json.type) ? json.type : undefined
  const tags = Array.isArray(json?.tags)
    ? json.tags.filter((t): t is string => typeof t === "string")
    : undefined
  const insight = typeof json?.insight === "string" && json.insight.trim() !== "" ? json.insight : text

  updateItem(item.id, { status: "processed", type, tags })
  insertInsight({ itemId: item.id, kind: "note", body: insight })
  await commitBrain(`item #${item.id}: ${item.body.slice(0, 60)}`)
  log(`item #${item.id} processed`)
}

export async function runDigest(): Promise<void> {
  log("running digest")
  const items = recentItemsSince(7)
  const prompt = loadPrompt("digest.md", {
    TODAY: new Date().toISOString().slice(0, 10),
    RECENT_ITEMS_JSON: JSON.stringify(items, null, 2),
  })
  const { text, json } = await runClaude(prompt)
  const body = typeof json?.insight === "string" && json.insight.trim() !== "" ? json.insight : text
  insertInsight({ itemId: null, kind: "digest", body })
  await commitBrain(`digest ${new Date().toISOString().slice(0, 10)}`)
  log("digest done")
}


async function tick(): Promise<void> {
  const item = nextNewItem()
  if (item) {
    try {
      await processItem(item)
    } catch (error) {
      log(`item #${item.id} failed: ${String(error)}`)
      updateItem(item.id, { status: "error" })
      insertInsight({ itemId: item.id, kind: "error", body: `agent failed: ${String(error)}` })
    }
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  if (new Date().getUTCHours() >= env.digestHour && getMeta("last_digest") !== today) {
    setMeta("last_digest", today)
    const since = getMeta("last_digest_at") ?? "1970-01-01T00:00:00Z"
    if (!hasItemsSince(since)) {
      log("digest skipped (no new items since last digest)")
      return
    }
    setMeta("last_digest_at", `${new Date().toISOString().slice(0, 19)}Z`)
    try {
      await runDigest()
    } catch (error) {
      log(`digest failed: ${String(error)}`)
    }
  }
}

let running = false

export function startAgentLoop(): void {
  if (env.agentDisabled) {
    log("agent disabled via AGENT_DISABLED=1")
    return
  }
  const loop = async (): Promise<void> => {
    if (!running) {
      running = true
      try {
        await tick()
      } finally {
        running = false
      }
    }
    setTimeout(() => void loop(), env.pollMs)
  }
  void loop()
  log(`loop started (poll ${env.pollMs}ms)`)
}

import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { createHash, timingSafeEqual } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { Hono } from "hono"
import { brainDir, env } from "./env.ts"
import { chunkOutline } from "./import.ts"
import {
  getItem,
  insertItem,
  listInsights,
  listItems,
  updateItem,
} from "./db.ts"
import { initBrain, runDigest, startAgentLoop } from "./agent.ts"
import { isItemStatus, isItemType, ITEM_TYPES } from "../shared/types.ts"

const app = new Hono()

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest()
}

app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health") return next()
  const header = c.req.header("authorization") ?? ""
  const provided = header.replace(/^Bearer\s+/i, "")
  if (!timingSafeEqual(sha256(provided), sha256(env.token))) {
    return c.json({ error: "unauthorized" }, 401)
  }
  return next()
})

app.get("/api/health", (c) => c.json({ ok: true }))

app.post("/api/items", async (c) => {
  const raw: unknown = await c.req.json().catch(() => null)
  if (typeof raw !== "object" || raw === null) return c.json({ error: "bad body" }, 400)
  const { body, url, type } = raw as Record<string, unknown>
  if (typeof body !== "string" || body.trim() === "") return c.json({ error: "body required" }, 400)
  const itemType = typeof type === "string" && isItemType(type) ? type : "auto"
  const itemUrl = typeof url === "string" && url.trim() !== "" ? url.trim() : null
  return c.json(insertItem({ body: body.trim(), url: itemUrl, type: itemType }), 201)
})

app.get("/api/items", (c) => {
  const status = c.req.query("status")
  const type = c.req.query("type")
  return c.json(
    listItems({
      status: status !== undefined && isItemStatus(status) ? status : undefined,
      type: type !== undefined && isItemType(type) ? type : undefined,
    }),
  )
})

app.patch("/api/items/:id", async (c) => {
  const id = Number(c.req.param("id"))
  const raw: unknown = await c.req.json().catch(() => null)
  if (typeof raw !== "object" || raw === null) return c.json({ error: "bad body" }, 400)
  const { status } = raw as Record<string, unknown>
  if (typeof status !== "string" || !isItemStatus(status)) return c.json({ error: "bad status" }, 400)
  try {
    getItem(id)
  } catch {
    return c.json({ error: "not found" }, 404)
  }
  return c.json(updateItem(id, { status }))
})

app.get("/api/insights", (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200)
  return c.json(listInsights(limit))
})

app.post("/api/digest", (c) => {
  void runDigest().catch((error: unknown) => console.error("manual digest failed", error))
  return c.json({ started: true })
})

app.get("/api/types", (c) => c.json(ITEM_TYPES))

app.post("/api/import", async (c) => {
  const text = await c.req.text()
  if (text.trim() === "") return c.json({ error: "empty body" }, 400)

  const date = new Date().toISOString().slice(0, 10)
  const importsDir = path.join(brainDir, "imports")
  fs.mkdirSync(importsDir, { recursive: true })
  let name = `workflowy-${date}.md`
  for (let n = 2; fs.existsSync(path.join(importsDir, name)); n++) {
    name = `workflowy-${date}-${n}.md`
  }
  fs.writeFileSync(path.join(importsDir, name), text)

  const chunks = chunkOutline(text)
  for (const chunk of chunks) insertItem({ body: chunk, url: null, type: "import" })
  return c.json({ savedTo: `imports/${name}`, chunks: chunks.length }, 201)
})

interface BrainFile {
  path: string
  size: number
}

app.get("/api/brain", (c) => {
  const files: BrainFile[] = []
  const walk = (dir: string, rel: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue
      const relPath = rel === "" ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(path.join(dir, entry.name), relPath)
      else if (entry.name.endsWith(".md")) {
        files.push({ path: relPath, size: fs.statSync(path.join(dir, entry.name)).size })
      }
    }
  }
  walk(brainDir, "")
  return c.json(files.sort((a, b) => a.path.localeCompare(b.path)))
})

app.get("/api/brain/file", (c) => {
  const rel = c.req.query("path") ?? ""
  const abs = path.resolve(brainDir, rel)
  if (!rel.endsWith(".md") || !abs.startsWith(path.resolve(brainDir) + path.sep)) {
    return c.json({ error: "bad path" }, 400)
  }
  if (!fs.existsSync(abs)) return c.json({ error: "not found" }, 404)
  return c.json({ path: rel, content: fs.readFileSync(abs, "utf8") })
})

if (fs.existsSync("./dist")) {
  app.use("/*", serveStatic({ root: "./dist" }))
  app.get("*", serveStatic({ path: "./dist/index.html" }))
}

initBrain()
startAgentLoop()

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`mindswap listening on :${info.port} (data: ${env.dataDir})`)
})

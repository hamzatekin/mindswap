import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { createHash, timingSafeEqual } from "node:crypto"
import fs from "node:fs"
import { Hono } from "hono"
import { env } from "./env.ts"
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

if (fs.existsSync("./dist")) {
  app.use("/*", serveStatic({ root: "./dist" }))
  app.get("*", serveStatic({ path: "./dist/index.html" }))
}

initBrain()
startAgentLoop()

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`mindswap listening on :${info.port} (data: ${env.dataDir})`)
})

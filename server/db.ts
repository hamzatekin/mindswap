import { DatabaseSync } from "node:sqlite"
import fs from "node:fs"
import path from "node:path"
import { env } from "./env.ts"
import { isItemStatus, type Insight, type Item, type ItemStatus } from "../shared/types.ts"

fs.mkdirSync(env.dataDir, { recursive: true })
const db = new DatabaseSync(path.join(env.dataDir, "brain.db"))

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'auto',
    body TEXT NOT NULL,
    url TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    processed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER REFERENCES items(id),
    kind TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

type Row = Record<string, unknown>

function str(row: Row, key: string): string {
  const value = row[key]
  if (typeof value !== "string") throw new Error(`expected string for ${key}`)
  return value
}

function toItem(row: Row): Item {
  const status = str(row, "status")
  if (!isItemStatus(status)) throw new Error(`bad status ${status}`)
  const rawTags: unknown = JSON.parse(str(row, "tags"))
  return {
    id: Number(row.id),
    type: str(row, "type") as Item["type"],
    body: str(row, "body"),
    url: typeof row.url === "string" ? row.url : null,
    tags: Array.isArray(rawTags) ? rawTags.filter((t): t is string => typeof t === "string") : [],
    status,
    createdAt: str(row, "created_at"),
  }
}

function toInsight(row: Row): Insight {
  return {
    id: Number(row.id),
    itemId: row.item_id === null ? null : Number(row.item_id),
    kind: str(row, "kind"),
    body: str(row, "body"),
    createdAt: str(row, "created_at"),
    itemBody: typeof row.item_body === "string" ? row.item_body : undefined,
  }
}

export function insertItem(input: { body: string; url: string | null; type: string }): Item {
  const result = db
    .prepare("INSERT INTO items (body, url, type) VALUES (?, ?, ?)")
    .run(input.body, input.url, input.type)
  return getItem(Number(result.lastInsertRowid))
}

export function getItem(id: number): Item {
  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Row | undefined
  if (!row) throw new Error(`item ${id} not found`)
  return toItem(row)
}

export function listItems(filter: { status?: ItemStatus; type?: string }): Item[] {
  const clauses: string[] = []
  const params: string[] = []
  if (filter.status) {
    clauses.push("status = ?")
    params.push(filter.status)
  } else {
    clauses.push("status != 'archived'")
  }
  if (filter.type) {
    clauses.push("type = ?")
    params.push(filter.type)
  }
  const rows = db
    .prepare(`SELECT * FROM items WHERE ${clauses.join(" AND ")} ORDER BY id DESC LIMIT 200`)
    .all(...params) as Row[]
  return rows.map(toItem)
}

export function nextNewItem(): Item | null {
  const row = db.prepare("SELECT * FROM items WHERE status = 'new' ORDER BY id LIMIT 1").get() as
    | Row
    | undefined
  return row ? toItem(row) : null
}

export function updateItem(
  id: number,
  patch: { status?: ItemStatus; type?: string; tags?: string[] },
): Item {
  if (patch.status) {
    const processedAt = patch.status === "processed" ? new Date().toISOString() : null
    db.prepare("UPDATE items SET status = ?, processed_at = COALESCE(?, processed_at) WHERE id = ?")
      .run(patch.status, processedAt, id)
  }
  if (patch.type) db.prepare("UPDATE items SET type = ? WHERE id = ?").run(patch.type, id)
  if (patch.tags) db.prepare("UPDATE items SET tags = ? WHERE id = ?").run(JSON.stringify(patch.tags), id)
  return getItem(id)
}

export function insertInsight(input: { itemId: number | null; kind: string; body: string }): void {
  db.prepare("INSERT INTO insights (item_id, kind, body) VALUES (?, ?, ?)").run(
    input.itemId,
    input.kind,
    input.body,
  )
}

export function listInsights(limit: number): Insight[] {
  const rows = db
    .prepare(
      `SELECT insights.*, items.body AS item_body
       FROM insights LEFT JOIN items ON items.id = insights.item_id
       ORDER BY insights.id DESC LIMIT ?`,
    )
    .all(limit) as Row[]
  return rows.map(toInsight)
}

export function recentItemsSince(days: number): Item[] {
  const rows = db
    .prepare("SELECT * FROM items WHERE created_at >= datetime('now', ?) ORDER BY id DESC")
    .all(`-${days} days`) as Row[]
  return rows.map(toItem)
}

export function hasItemsSince(iso: string): boolean {
  const row = db.prepare("SELECT 1 FROM items WHERE created_at >= ? LIMIT 1").get(iso)
  return row !== undefined
}

export function getMeta(key: string): string | null {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as Row | undefined
  return row ? str(row, "value") : null
}

export function setMeta(key: string, value: string): void {
  db.prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value)
}

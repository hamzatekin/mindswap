export const ITEM_TYPES = [
  "task",
  "note",
  "reference",
  "music",
  "movie",
  "project",
] as const

export type ItemType = (typeof ITEM_TYPES)[number]

export type ItemStatus = "new" | "processed" | "done" | "archived" | "error"

export interface Item {
  id: number
  type: ItemType | "auto"
  body: string
  url: string | null
  tags: string[]
  status: ItemStatus
  createdAt: string
}

export interface Insight {
  id: number
  itemId: number | null
  kind: string
  body: string
  createdAt: string
  itemBody?: string
}

export function isItemType(value: string): value is ItemType {
  return (ITEM_TYPES as readonly string[]).includes(value)
}

export function isItemStatus(value: string): value is ItemStatus {
  return ["new", "processed", "done", "archived", "error"].includes(value)
}

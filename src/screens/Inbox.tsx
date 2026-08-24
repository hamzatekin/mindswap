import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { ITEM_TYPES, type Item } from "../../shared/types"

const FILTERS = ["all", ...ITEM_TYPES] as const
type Filter = (typeof FILTERS)[number]

export function Inbox() {
  const [items, setItems] = useState<Item[]>([])
  const [filter, setFilter] = useState<Filter>("all")

  const reload = useCallback(async () => {
    const query = filter === "all" ? "" : `?type=${filter}`
    setItems(await api<Item[]>(`/api/items${query}`))
  }, [filter])

  useEffect(() => {
    void reload()
  }, [reload])

  async function setStatus(id: number, status: "done" | "archived") {
    await api(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify({ status }) })
    await reload()
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}>
            <Badge variant={filter === f ? "default" : "outline"}>{f}</Badge>
          </button>
        ))}
      </div>
      {items.length === 0 && <p className="text-muted-foreground text-sm">Nothing here yet.</p>}
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="border-border rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{item.type}</Badge>
              {item.status !== "processed" && (
                <span className="text-muted-foreground text-xs">{item.status}</span>
              )}
              <span className="text-muted-foreground ml-auto text-xs">
                {item.createdAt.slice(0, 10)}
              </span>
            </div>
            <p className={`mt-2 text-sm whitespace-pre-wrap ${item.status === "done" ? "line-through opacity-60" : ""}`}>
              {item.body}
            </p>
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer" className="text-primary mt-1 block truncate text-xs underline">
                {item.url}
              </a>
            )}
            <div className="mt-2 flex gap-2">
              {item.status !== "done" && (
                <Button size="sm" variant="outline" onClick={() => void setStatus(item.id, "done")}>
                  Done
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => void setStatus(item.id, "archived")}>
                Archive
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

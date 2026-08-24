import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { ITEM_TYPES, type Item } from "../../shared/types"

const TYPE_CHOICES = ["auto", ...ITEM_TYPES] as const
type TypeChoice = (typeof TYPE_CHOICES)[number]

export function Capture({ initialBody }: { initialBody: string }) {
  const [body, setBody] = useState(initialBody)
  const [type, setType] = useState<TypeChoice>("auto")
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle")

  async function save() {
    setState("saving")
    const url = /https?:\/\/\S+/.exec(body)?.[0] ?? null
    try {
      await api<Item>("/api/items", {
        method: "POST",
        body: JSON.stringify({ body, url, type: type === "auto" ? undefined : type }),
      })
      setBody("")
      setType("auto")
      setState("saved")
      setTimeout(() => setState("idle"), 2000)
    } catch {
      setState("failed")
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <Textarea
        placeholder="Task, thought, link, song, movie…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        autoFocus
        className="text-base"
      />
      <div className="flex flex-wrap gap-1.5">
        {TYPE_CHOICES.map((choice) => (
          <button key={choice} onClick={() => setType(choice)}>
            <Badge variant={type === choice ? "default" : "outline"}>{choice}</Badge>
          </button>
        ))}
      </div>
      <Button onClick={() => void save()} disabled={body.trim() === "" || state === "saving"}>
        {state === "saving" ? "Saving…" : "Save"}
      </Button>
      {state === "saved" && <p className="text-muted-foreground text-sm">Saved — the agent will pick it up.</p>}
      {state === "failed" && <p className="text-destructive text-sm">Failed to save. Check connection.</p>}
    </div>
  )
}

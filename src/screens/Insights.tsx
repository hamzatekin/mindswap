import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import type { Insight } from "../../shared/types"

export function Insights() {
  const [insights, setInsights] = useState<Insight[]>([])

  useEffect(() => {
    void api<Insight[]>("/api/insights").then(setInsights)
  }, [])

  return (
    <div className="flex flex-col gap-2 p-4">
      {insights.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No insights yet — capture something and the agent will respond.
        </p>
      )}
      {insights.map((insight) => (
        <div key={insight.id} className="border-border rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Badge variant={insight.kind === "digest" ? "default" : "secondary"}>{insight.kind}</Badge>
            <span className="text-muted-foreground ml-auto text-xs">{insight.createdAt.slice(0, 10)}</span>
          </div>
          {insight.itemBody && (
            <p className="text-muted-foreground mt-2 truncate text-xs">re: {insight.itemBody}</p>
          )}
          <p className="mt-2 text-sm whitespace-pre-wrap">{insight.body}</p>
        </div>
      ))}
    </div>
  )
}

import { useState } from "react"
import { Capture } from "@/screens/Capture"
import { Inbox } from "@/screens/Inbox"
import { Insights } from "@/screens/Insights"
import { TokenGate } from "@/screens/TokenGate"
import { getToken } from "@/lib/api"

type Tab = "capture" | "inbox" | "insights"

function readShareText(): string {
  if (window.location.pathname !== "/share") return ""
  const params = new URLSearchParams(window.location.search)
  const text = [params.get("title"), params.get("text"), params.get("url")]
    .filter((part): part is string => part !== null && part.trim() !== "")
    .join("\n")
  window.history.replaceState({}, "", "/")
  return text
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => getToken() !== null)
  const [shared] = useState(readShareText)
  const [tab, setTab] = useState<Tab>("capture")

  if (!unlocked) return <TokenGate onUnlocked={() => setUnlocked(true)} />

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="flex items-center px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-2">
        <h1 className="text-lg font-semibold">Mindswap</h1>
        <span className="text-muted-foreground ml-auto text-xs capitalize">{tab}</span>
      </header>
      <main className="flex-1 overflow-y-auto">
        {tab === "capture" && <Capture initialBody={shared} />}
        {tab === "inbox" && <Inbox />}
        {tab === "insights" && <Insights />}
      </main>
      <nav className="border-border bg-background sticky bottom-0 flex border-t pb-[env(safe-area-inset-bottom)]">
        {(["capture", "inbox", "insights"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm capitalize ${tab === t ? "text-foreground font-medium" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </nav>
    </div>
  )
}

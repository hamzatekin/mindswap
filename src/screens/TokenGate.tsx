import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api, setToken } from "@/lib/api"

export function TokenGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [value, setValue] = useState("")
  const [error, setError] = useState(false)

  async function submit() {
    setToken(value.trim())
    try {
      await api("/api/items")
      onUnlocked()
    } catch {
      setError(true)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Mindswap</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            type="password"
            inputMode="text"
            autoFocus
            placeholder="Access token"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            className="border-input bg-transparent h-10 rounded-md border px-3 text-sm"
          />
          {error && <p className="text-destructive text-sm">Wrong token, try again.</p>}
          <Button onClick={() => void submit()} disabled={value.trim() === ""}>
            Unlock
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

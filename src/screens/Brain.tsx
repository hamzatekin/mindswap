import { useEffect, useState, type ReactNode } from "react"
import { ChevronRight, FileText } from "lucide-react"
import { api } from "@/lib/api"

interface BrainFile {
  path: string
  size: number
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const regex = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  let key = 0
  for (let m = regex.exec(text); m !== null; m = regex.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const [, bold, linkText, linkUrl] = m
    if (bold !== undefined) {
      parts.push(<strong key={key++}>{bold}</strong>)
    } else {
      parts.push(
        <a key={key++} href={linkUrl} target="_blank" rel="noreferrer" className="text-primary underline">
          {linkText}
        </a>,
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      {text.split("\n").map((line, i) => {
        const heading = /^(#{1,6})\s+(.*)/.exec(line)
        if (heading) {
          const level = heading[1]?.length ?? 6
          const size = level === 1 ? "text-lg" : level === 2 ? "text-base" : "text-sm"
          return (
            <p key={i} className={`mt-3 font-semibold ${size}`}>
              {renderInline(heading[2] ?? "")}
            </p>
          )
        }
        const bullet = /^(\s*)(?:[-*]|\d+\.)\s+(.*)/.exec(line)
        if (bullet) {
          const depth = Math.floor((bullet[1] ?? "").replaceAll("\t", "  ").length / 2)
          return (
            <p key={i} style={{ paddingLeft: `${depth * 0.875}rem` }}>
              <span className="text-muted-foreground mr-1.5">•</span>
              {renderInline(bullet[2] ?? "")}
            </p>
          )
        }
        if (line.trim() === "") return <div key={i} className="h-1" />
        return <p key={i}>{renderInline(line)}</p>
      })}
    </div>
  )
}

export function Brain() {
  const [files, setFiles] = useState<BrainFile[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)

  useEffect(() => {
    void api<BrainFile[]>("/api/brain").then(setFiles)
  }, [])

  useEffect(() => {
    if (selected === null) return
    setContent(null)
    void api<{ content: string }>(`/api/brain/file?path=${encodeURIComponent(selected)}`).then(
      (file) => setContent(file.content),
    )
  }, [selected])

  if (selected !== null) {
    return (
      <div className="p-4">
        <button onClick={() => setSelected(null)} className="text-primary mb-3 text-sm">
          ← Brain
        </button>
        <h2 className="mb-2 text-base font-semibold">{selected}</h2>
        {content === null ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <Markdown text={content} />
        )}
      </div>
    )
  }

  const groups = new Map<string, BrainFile[]>()
  for (const file of files) {
    const dir = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : ""
    const group = groups.get(dir)
    if (group) group.push(file)
    else groups.set(dir, [file])
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {files.length === 0 && <p className="text-muted-foreground text-sm">Brain is empty so far.</p>}
      {[...groups.entries()].map(([dir, groupFiles]) => (
        <div key={dir === "" ? "(root)" : dir}>
          {dir !== "" && (
            <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
              {dir}
            </p>
          )}
          <ul className="flex flex-col">
            {groupFiles.map((file) => (
              <li key={file.path}>
                <button
                  onClick={() => setSelected(file.path)}
                  className="border-border flex w-full items-center gap-2 border-b py-2.5 text-left text-sm last:border-0"
                >
                  <FileText className="text-muted-foreground size-4 shrink-0" />
                  <span className="flex-1">{file.path.slice(dir === "" ? 0 : dir.length + 1)}</span>
                  <span className="text-muted-foreground text-xs">{(file.size / 1024).toFixed(1)}k</span>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

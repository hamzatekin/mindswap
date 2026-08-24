// Split a Workflowy export (indented outline, txt or markdown) into chunks the
// agent can file one at a time. Chunks break at top-level bullets so sections
// stay intact; a hard cap guards against one giant section.
const FLUSH_AT = 150
const HARD_CAP = 400

export function chunkOutline(text: string): string[] {
  const lines = text.replaceAll("\r\n", "\n").split("\n")
  const chunks: string[] = []
  let current: string[] = []

  const flush = (): void => {
    if (current.join("\n").trim() !== "") chunks.push(current.join("\n").trimEnd())
    current = []
  }

  for (const line of lines) {
    const isTopLevel = line.trim() !== "" && !/^\s/.test(line)
    if ((isTopLevel && current.length >= FLUSH_AT) || current.length >= HARD_CAP) flush()
    current.push(line)
  }
  flush()
  return chunks
}

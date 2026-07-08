import type { ReactNode } from "react"

export function highlightText(text: string, query: string): ReactNode {
  if (!query.trim()) return <>{text}</>
  const parts = text.split(new RegExp(`(${query})`, "gi"))

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={index}
            className="rounded-sm bg-[var(--bg)] px-0.5 font-semibold text-[var(--accent)]"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export function parseFormattedText(text: string, query: string): ReactNode[] {
  const lines = text.split("\n")
  const blocks: ReactNode[] = []
  let list: { type: "ul" | "ol"; items: string[] } | null = null

  const flush = (key: number) => {
    if (!list) return
    const Tag = list.type
    blocks.push(
      <Tag
        key={`list-${key}`}
        className={Tag === "ul" ? "list-disc pl-5 space-y-0.5" : "list-decimal pl-5 space-y-0.5"}
      >
        {list.items.map((item, i) => (
          <li key={i}>{highlightText(item, query)}</li>
        ))}
      </Tag>
    )
    list = null
  }

  lines.forEach((line, i) => {
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.*)/)
    const numberedMatch = line.match(/^(\s*)\d+\.\s+(.*)/)
    const indentMatch = line.match(/^(\t| {2,})(.*)/)

    if (bulletMatch) {
      if (list?.type !== "ul") {
        flush(i)
        list = { type: "ul", items: [] }
      }
      list.items.push(bulletMatch[2])
    } else if (numberedMatch) {
      if (list?.type !== "ol") {
        flush(i)
        list = { type: "ol", items: [] }
      }
      list.items.push(numberedMatch[2])
    } else {
      flush(i)
      if (line.trim() === "") {
        blocks.push(<div key={`spacer-${i}`} className="h-2" />)
      } else {
        blocks.push(
          <p key={`line-${i}`} className="break-words" style={{ paddingLeft: indentMatch ? 12 : 0 }}>
            {highlightText(indentMatch ? indentMatch[2] : line, query)}
          </p>
        )
      }
    }
  })
  flush(lines.length)

  return blocks
}

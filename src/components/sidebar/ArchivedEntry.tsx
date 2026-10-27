import { FiArchive } from "react-icons/fi"

type Props = {
  count: number
  onClick: () => void
}

export default function ArchivedEntry({ count, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="neo-button mb-3 flex w-full items-center gap-3 rounded-xl bg-[var(--surface2)] px-4 py-3 text-left"
    >
      <FiArchive size={16} className="flex-shrink-0 text-[var(--text2)]" aria-hidden="true" />
      <span className="flex-1 text-sm font-semibold font-sora text-[var(--text)]">Diarsipkan</span>
      <span className="text-xs text-[var(--text3)]">{count}</span>
    </button>
  )
}

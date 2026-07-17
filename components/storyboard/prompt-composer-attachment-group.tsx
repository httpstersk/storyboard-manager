import * as React from "react"
import { SFXmark } from "sf-symbols-lib/monochrome"

interface PromptComposerAttachmentGroupProps {
  files: File[]
  icon: React.ReactNode
  label: string
  onRemove: (index: number) => void
}

/** One labelled reference-image group inside the prompt composer shelf. */
function PromptComposerAttachmentGroup({
  files,
  icon,
  label,
  onRemove,
}: PromptComposerAttachmentGroupProps) {
  if (files.length === 0) {
    return null
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex w-24 shrink-0 items-center gap-1.5 text-caption font-medium text-ink-muted">
        {icon}
        <span>{label}</span>
      </div>
      <ul aria-label={`${label} references`} className="flex gap-1.5">
        {files.map((file, index) => (
          <li
            className="flex max-w-40 shrink-0 items-center gap-1.5 rounded-lg border border-edge bg-surface-panel py-1 pr-1 pl-2 text-caption text-ink"
            key={`${file.name}-${file.lastModified}`}
          >
            <span className="truncate">{file.name}</span>
            <button
              aria-label={`Remove ${file.name} from ${label.toLowerCase()} references`}
              className="grid size-6 shrink-0 place-items-center rounded-md text-ink-muted transition-colors outline-none hover:bg-surface-raised hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onRemove(index)}
              type="button"
            >
              <SFXmark aria-hidden className="size-2.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export {
  PromptComposerAttachmentGroup,
  type PromptComposerAttachmentGroupProps,
}

import * as React from "react"
import { SFXmark } from "sf-symbols-lib/monochrome"

interface PromptComposerAttachmentGroupProps {
  files: File[]
  icon: React.ReactNode
  label: string
  onRemove: (index: number) => void
}

interface PromptComposerAttachmentThumbnailProps {
  file: File
  label: string
  onRemove: () => void
}

/** Single image reference rendered as a square preview chip. */
function PromptComposerAttachmentThumbnail({
  file,
  label,
  onRemove,
}: PromptComposerAttachmentThumbnailProps) {
  const objectUrl = React.useMemo(() => URL.createObjectURL(file), [file])

  React.useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl])

  return (
    <li className="group/thumb relative size-14 shrink-0">
      {/* Local blob object URLs cannot be optimised by next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={file.name}
        className="size-full rounded-xl object-cover ring-1 ring-edge ring-inset"
        src={objectUrl}
      />
      <button
        aria-label={`Remove ${file.name} from ${label.toLowerCase()} references`}
        className="absolute -top-1.5 -end-1.5 grid size-5 place-items-center rounded-full bg-emphasis text-emphasis-foreground shadow-knob transition-[opacity,transform] outline-none hover:brightness-110 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring active:scale-90 sm:opacity-0 sm:group-hover/thumb:opacity-100"
        onClick={onRemove}
        title={file.name}
        type="button"
      >
        <SFXmark aria-hidden className="size-2.5" />
      </button>
    </li>
  )
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
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-1.5 text-caption font-medium tracking-wide text-ink-muted">
        {icon}
        <span>{label}</span>
      </div>
      <ul aria-label={`${label} references`} className="flex flex-wrap gap-2">
        {files.map((file, index) => (
          <PromptComposerAttachmentThumbnail
            file={file}
            key={`${file.name}-${file.lastModified}-${index}`}
            label={label}
            onRemove={() => onRemove(index)}
          />
        ))}
      </ul>
    </div>
  )
}

export { PromptComposerAttachmentGroup }

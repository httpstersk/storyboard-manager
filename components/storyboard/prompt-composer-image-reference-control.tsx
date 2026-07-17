"use client"

import { SFPaperclip } from "sf-symbols-lib/monochrome"

import {
  ATTACHMENT_PILL_CHIP_CLASS_NAME,
  ATTACHMENT_PILL_CLASS_NAME,
} from "@/components/storyboard/prompt-composer-attachment-pill"
import { cn } from "@/lib/utils"

interface ImageReferenceControlProps {
  /** Whether another reference image can still be added. */
  canAdd: boolean
  /** Visible label naming the reference group. */
  label: string
  /** Opens the file picker to add reference images. */
  onAdd: () => void
}

/** Labelled pill with a paperclip chip that opens the file picker. */
function ImageReferenceControl({
  canAdd,
  label,
  onAdd,
}: ImageReferenceControlProps) {
  return (
    <button
      aria-label={`Add ${label.toLowerCase()} reference images`}
      className={cn(
        ATTACHMENT_PILL_CLASS_NAME,
        "transition-[color,transform] duration-150 ease-out outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
      )}
      disabled={!canAdd}
      onClick={onAdd}
      type="button"
    >
      <span>{label}</span>
      <span aria-hidden className={ATTACHMENT_PILL_CHIP_CLASS_NAME}>
        <SFPaperclip />
      </span>
    </button>
  )
}

export { ImageReferenceControl }

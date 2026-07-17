"use client"

import { SFMinus, SFPlus } from "sf-symbols-lib/monochrome"

import {
  ATTACHMENT_PILL_CHIP_CLASS_NAME,
  ATTACHMENT_PILL_CLASS_NAME,
} from "@/components/storyboard/prompt-composer-attachment-pill"

interface ImageReferenceControlProps {
  /** Whether another reference image can still be added. */
  canAdd: boolean
  /** Whether at least one reference image can be removed. */
  canRemove: boolean
  /** Visible label naming the reference group. */
  label: string
  /** Opens the file picker to add reference images. */
  onAdd: () => void
  /** Removes the most recently added reference image. */
  onRemoveLast: () => void
}

/** Labelled stepper that adds or removes reference images with +/- controls. */
function ImageReferenceControl({
  canAdd,
  canRemove,
  label,
  onAdd,
  onRemoveLast,
}: ImageReferenceControlProps) {
  return (
    <div className={ATTACHMENT_PILL_CLASS_NAME}>
      <span>{label}</span>
      <div className="flex items-center gap-0.5">
        <button
          aria-label={`Remove last ${label.toLowerCase()} reference image`}
          className={ATTACHMENT_PILL_CHIP_CLASS_NAME}
          disabled={!canRemove}
          onClick={onRemoveLast}
          type="button"
        >
          <SFMinus aria-hidden />
        </button>
        <button
          aria-label={`Add ${label.toLowerCase()} reference images`}
          className={ATTACHMENT_PILL_CHIP_CLASS_NAME}
          disabled={!canAdd}
          onClick={onAdd}
          type="button"
        >
          <SFPlus aria-hidden />
        </button>
      </div>
    </div>
  )
}

export { ImageReferenceControl }

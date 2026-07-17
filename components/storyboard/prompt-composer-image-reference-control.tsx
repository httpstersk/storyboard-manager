"use client"

import { SFMinus, SFPlus } from "sf-symbols-lib/monochrome"

const imageReferenceStepButtonClassName =
  "flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted outline-none transition-[color,transform] duration-150 ease-out hover:text-ink-strong active:scale-90 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-2.75"

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
    <div className="flex h-7 items-center gap-2 rounded-full bg-surface-inset pr-0.5 pl-3 text-caption text-ink">
      <span>{label}</span>
      <div className="flex items-center gap-0.5">
        <button
          aria-label={`Remove last ${label.toLowerCase()} reference image`}
          className={imageReferenceStepButtonClassName}
          disabled={!canRemove}
          onClick={onRemoveLast}
          type="button"
        >
          <SFMinus aria-hidden />
        </button>
        <button
          aria-label={`Add ${label.toLowerCase()} reference images`}
          className={imageReferenceStepButtonClassName}
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

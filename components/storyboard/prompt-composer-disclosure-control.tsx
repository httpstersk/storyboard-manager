"use client"

import { SFChevronDown } from "sf-symbols-lib/monochrome"

import {
  ATTACHMENT_PILL_CHIP_CLASS_NAME,
  ATTACHMENT_PILL_CLASS_NAME,
} from "@/components/storyboard/prompt-composer-attachment-pill"
import { cn } from "@/lib/utils"

interface DisclosureControlProps {
  /** Accessible label; defaults to {@link DisclosureControlProps.label}. */
  ariaLabel?: string
  /** Optional trailing count chip; omitted when undefined. */
  count?: number
  /** Disables the toggle while generation is in flight. */
  isDisabled: boolean
  /** Whether the associated section is expanded. */
  isOpen: boolean
  /** Visible label naming the disclosed section. */
  label: string
  /** Opens or closes the associated section. */
  onToggle: () => void
}

/** Attachment-style pill that toggles a collapsible composer section. */
function DisclosureControl({
  ariaLabel,
  count,
  isDisabled,
  isOpen,
  label,
  onToggle,
}: DisclosureControlProps) {
  return (
    <button
      aria-expanded={isOpen}
      aria-label={ariaLabel ?? label}
      className={cn(
        ATTACHMENT_PILL_CLASS_NAME,
        "transition-[color,transform] duration-150 ease-out outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
        isOpen && "text-ink-strong"
      )}
      disabled={isDisabled}
      onClick={onToggle}
      type="button"
    >
      <span>{label}</span>
      <span className="flex items-center gap-0.5">
        {count !== undefined ? (
          <span
            aria-hidden
            className={cn(ATTACHMENT_PILL_CHIP_CLASS_NAME, "tabular-nums")}
          >
            {count}
          </span>
        ) : null}
        <span aria-hidden className={ATTACHMENT_PILL_CHIP_CLASS_NAME}>
          <SFChevronDown
            className={cn(
              "transition-transform duration-150 ease-out",
              isOpen && "rotate-180"
            )}
          />
        </span>
      </span>
    </button>
  )
}

export { DisclosureControl, type DisclosureControlProps }

/**
 * Shared chrome for composer attachment pills (character notes, image references).
 */

/** Outer inset pill shell shared by attachment controls. */
export const ATTACHMENT_PILL_CLASS_NAME =
  "flex h-7 items-center gap-2 rounded-full bg-surface-inset pr-0.5 pl-3 text-caption text-ink"

/**
 * Circular chip used for paperclip add affordances, counts, and disclosure carets.
 * Interactive chips keep focus/hover/active styles; decorative spans ignore them harmlessly.
 */
export const ATTACHMENT_PILL_CHIP_CLASS_NAME =
  "flex size-6 shrink-0 items-center justify-center rounded-full bg-edge-strong text-ink outline-none transition-[color,transform] duration-150 ease-out hover:text-ink-strong active:scale-90 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-2.75"

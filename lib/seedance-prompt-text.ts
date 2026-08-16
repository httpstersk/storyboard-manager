/**
 * Shared Seedance 2.5 prompt text helpers: named-subject tokens, composer
 * handle rewriting, and sentence punctuation.
 *
 * Bindings use fal's `@ImageN` tokens (no space). Composer `@handles` become
 * `<Name>` so they cannot collide with image bindings.
 */

/**
 * One written definition folded into the Seedance prompt: a character or an
 * environment. Mirrors the composer's note rows without importing UI modules.
 */
export interface SeedanceNote {
  /**
   * Display name from the composer. May arrive as an `@handle`; the prompt
   * wraps it as `<Name>` so Seedance does not treat it as an `@ImageN` binding.
   */
  name: string
  /** Free-text appearance, wardrobe, or set-design notes. */
  notes: string
}

/**
 * Default action used when a scene does not define one.
 */
export const DEFAULT_ACTION_TEXT = "Hold on the framed subject."

/**
 * @Image1 is reserved for the storyboard contact sheet; attached stills
 * begin at this 1-based index.
 */
export const STARTING_REFERENCE_IMAGE_INDEX = 2

/**
 * Stage numbering is 1-based to match Seedance long-video templates.
 */
export const STARTING_STAGE_NUMBER = 1

/**
 * Notes that have a handle or written description worth binding.
 *
 * @param notes - Composer notes for one subject group.
 * @returns Notes that should appear in the prompt.
 */
export function filledNotes(notes: SeedanceNote[]): SeedanceNote[] {
  return notes.filter((note) => {
    const name = formatReferenceLabel(note.name)
    const noteText = note.notes.trim()

    return name !== "" || noteText !== ""
  })
}

/**
 * Builds a fal `@ImageN` token.
 *
 * @param index - 1-based image index in `image_urls`.
 * @returns The binding token.
 */
export function formatImageToken(index: number): string {
  return `@Image${index}`
}

/**
 * Normalizes user/LLM prose: rewrite composer handles and guarantee a
 * trailing sentence terminator.
 *
 * @param text - Action, notes, or style copy that may already be punctuated.
 * @returns The cleaned sentence, or an empty string when `text` is blank.
 */
export function formatPromptProse(text: string): string {
  return withSentencePeriod(rewriteComposerHandles(text))
}

/**
 * Strips leading `@` from a composer handle so the video prompt can wrap it
 * as `<Name>`.
 *
 * @param name - Raw note name, with or without a leading `@`.
 * @returns The label with leading `@` signs removed.
 */
export function formatReferenceLabel(name: string): string {
  return name.trim().replace(/^@+/, "")
}

/**
 * Wraps a composer handle as a Seedance named-subject token.
 *
 * @param name - Raw note name, with or without a leading `@`.
 * @param fallback - Label used when `name` is empty.
 * @returns `<Name>` or `<>` when both name and fallback are empty.
 */
export function formatSubjectToken(name: string, fallback: string): string {
  const label = formatReferenceLabel(name)
  const resolved = label === "" ? fallback : label

  return `<${resolved}>`
}

/**
 * Converts composer `@handles` to `<Name>` while leaving Seedance `@ImageN`,
 * `@VideoN`, and `@AudioN` bindings intact.
 *
 * @param text - Prompt copy that may mix handles and media tokens.
 * @returns The same copy with composer handles wrapped as named subjects.
 */
export function rewriteComposerHandles(text: string): string {
  return text.replace(/@(?!(?:Image|Video|Audio)\d+)(\S+)/g, "<$1>")
}

/**
 * Ensures a clause ends with a single sentence terminator.
 *
 * @param text - A prompt clause that may already end in punctuation.
 * @returns The clause with one trailing `.`, or unchanged when it already
 *   ends with `!`, `?`, or `…`.
 */
export function withSentencePeriod(text: string): string {
  const trimmed = text.trim().replace(/\.+$/, ".")

  if (trimmed === "" || trimmed === ".") {
    return ""
  }

  if (/[.!?…]$/.test(trimmed)) {
    return trimmed
  }

  return `${trimmed}.`
}

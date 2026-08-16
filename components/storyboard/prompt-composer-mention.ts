/**
 * Storyline `@mention` parsing for the prompt composer. Handles are supplied
 * by the caller and may name a character or an environment.
 */

/** Active `@mention` token immediately before the caret. */
export interface MentionToken {
  endIndex: number
  query: string
  startIndex: number
}

/**
 * Filters mention handles by a case-insensitive prefix on the handle body.
 * Accepts queries with or without a leading `@`.
 */
export function filterMentionOptions(
  options: string[],
  query: string
): string[] {
  const normalizedQuery = query.replace(/^@+/, "").toLowerCase()

  return options.filter((option) =>
    option.slice(1).toLowerCase().startsWith(normalizedQuery)
  )
}

/**
 * Reads the `@handle` token ending at the caret, if one is in progress.
 * Requires no whitespace between `@` and the caret.
 */
export function getMentionToken(
  value: string,
  caretIndex: number
): MentionToken | null {
  const beforeCaret = value.slice(0, caretIndex)
  const match = beforeCaret.match(/@([\w-]*)$/)

  if (match?.index === undefined) {
    return null
  }

  return {
    endIndex: caretIndex,
    query: match[1] ?? "",
    startIndex: match.index,
  }
}

/**
 * Replaces an in-progress mention token with a full handle and trailing space.
 */
export function insertMention(
  handle: string,
  token: MentionToken,
  value: string
): { caretIndex: number; value: string } {
  const insertion = `${handle} `
  const nextValue =
    value.slice(0, token.startIndex) + insertion + value.slice(token.endIndex)

  return {
    caretIndex: token.startIndex + insertion.length,
    value: nextValue,
  }
}

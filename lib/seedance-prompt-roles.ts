/**
 * Seedance 2.5 material-role sections: contact-sheet grid, named subject
 * bindings, generation goal, and consistency lock.
 */

import {
  filledNotes,
  formatImageToken,
  formatPromptProse,
  formatSubjectToken,
  type SeedanceNote,
} from "@/lib/seedance-prompt-text"
import type { ShotMode } from "@/lib/shot-mode-settings"

/**
 * How freely each shot mode may restage a supplied location.
 */
const ENVIRONMENT_STAGING_DIRECTIONS: Record<ShotMode, string> = {
  continuous:
    "Keep the location's layout self-consistent so the unbroken camera move reads as one traversable space.",
  "multi-shot":
    "Each shot may reveal a different part of the location; no two shots repeat the same setup.",
  voyeuristic:
    "Keep the location's layout self-consistent so the unbroken camera move reads as one traversable space, and watch it only from concealed vantages outside the action with foreground elements cropping the frame.",
}

/**
 * Opening generation-goal sentence for each shot mode.
 */
const GENERATION_GOAL_TEXTS: Record<ShotMode, string> = {
  continuous:
    "Generate a single unbroken take. The story follows the board order. Travel the camera from each panel's framing to the next through camera movement and subject blocking inside one continuous space and time. No cuts, dissolves, wipes, or transitions of any kind.",
  "multi-shot":
    "Generate a multi-shot sequence. The story follows the board order. Cuts between stages are allowed when the board calls for them.",
  voyeuristic:
    "Generate a single unbroken voyeuristic take filmed by an unseen observer. The story follows the board order. The camera watches from concealment with foreground obstruction cropping the frame, long-lens compression, and subjects who are unaware and never look into the lens. At every location the lens zooms in from the wide watching frame to a tight detail, holds, then zooms back out to that wide frame before the camera drifts on unseen to the next vantage. No cuts, dissolves, wipes, or transitions of any kind.",
}

/**
 * Kind of composer subject bound to Seedance stills.
 */
export type SeedanceSubjectKind = "character" | "environment"

/**
 * Inputs for {@link formatSubjectBindings}.
 */
export interface FormatSubjectBindingsOptions {
  /** Fallback stem when a note has no handle (`Character`, `Location`). */
  fallbackStem: string
  /** How many stills this group contributes, already slot-capped. */
  imageCount: number
  /** Keep free-text appearance or set-design notes on each mapping. */
  includeNotesProse: boolean
  /** Whether these stills are characters or locations. */
  kind: SeedanceSubjectKind
  /** Written composer notes for this group. */
  notes: SeedanceNote[]
  /** Shot mode, used for environment staging direction. */
  shotMode: ShotMode
  /** 1-based `@Image` index of this group's first still. */
  startIndex: number
}

/**
 * Inputs for {@link formatGridRole}.
 */
export interface FormatGridRoleOptions {
  /** Whether @Image1 is a grayscale linear depth map. */
  depthMapStyle: boolean
  /** Number of storyboard panels in reading order. */
  panelCount: number
  /** Whether the board reads as cuts or one unbroken take. */
  shotMode: ShotMode
}

/**
 * Inputs for {@link formatMaintainConsistency}.
 */
export interface FormatMaintainConsistencyOptions {
  /** Named characters to keep consistent. */
  characterNotes: SeedanceNote[]
  /** Whether @Image1 is a depth-map blockout. */
  depthMapStyle: boolean
  /** Keep the written visual-style sentence. */
  includeStyleLock: boolean
  /** Keep the drift-guard sentence on the style lock. */
  includeStyleReinforcement: boolean
  /** Whether the board reads as cuts or one unbroken take. */
  shotMode: ShotMode
  /** Optional textual visual-style guidance. */
  visualStyle: string
}

/**
 * Formats the [Generation Goal] body for the depth-map and shot-mode pair.
 *
 * @param depthMapStyle - Whether @Image1 is a depth-map blockout.
 * @param shotMode - Whether the board reads as cuts or one unbroken take.
 * @returns The generation-goal paragraph.
 */
export function formatGenerationGoal(
  depthMapStyle: boolean,
  shotMode: ShotMode
): string {
  const goal = GENERATION_GOAL_TEXTS[shotMode]

  if (!depthMapStyle) {
    return goal
  }

  return `${goal} Take medium, palette, lighting, texture, and production design from the visual style, not from the depth panels.`
}

/**
 * Formats the @Image1 material-role line for the contact sheet.
 *
 * @param options - Depth-map flag, panel count, and shot mode.
 * @returns The grid role paragraph.
 */
export function formatGridRole(options: FormatGridRoleOptions): string {
  const { depthMapStyle, panelCount, shotMode } = options
  const reading = "Read it left to right, top to bottom."

  if (depthMapStyle) {
    return `@Image1 is a coarse blockout storyboard grid (grayscale linear depth: white nearest, black farthest) with ${panelCount} panels. ${reading} Use it only for camera, composition, framing, blocking, and relative depth. Do not use its grayscale appearance, and do not output grayscale depth-map video.`
  }

  const takeKind =
    shotMode === "multi-shot"
      ? "shot order and approximate composition"
      : "successive moments of one unbroken take and approximate composition"

  return `@Image1 provides a ${panelCount}-panel storyboard grid for ${takeKind}. ${reading} Inherit shot order and approximate composition only. Do not treat the grid as a style reference or reproduce every panel as a still.`
}

/**
 * Formats the [Maintain Consistency] body, including the trailing style lock.
 *
 * @param options - Character names, depth-map flag, style toggles, shot mode.
 * @returns The consistency paragraph.
 */
export function formatMaintainConsistency(
  options: FormatMaintainConsistencyOptions
): string {
  const {
    characterNotes,
    depthMapStyle,
    includeStyleLock,
    includeStyleReinforcement,
    shotMode,
    visualStyle,
  } = options
  const names = filledNotes(characterNotes)
    .map((note) => formatSubjectToken(note.name, ""))
    .filter((token) => token !== "<>")
  const identity =
    names.length > 0
      ? `Keep ${joinSubjectNames(names)} identities, clothing, prop ownership, spatial direction, and audio relationships consistent.`
      : "Keep character identity, clothing, prop ownership, spatial direction, and audio relationships consistent."
  const voyeuristic =
    shotMode === "voyeuristic"
      ? " Keep the camera unseen, subjects unaware, and complete the zoom cycle at every location."
      : ""
  const style = formatStyleLock({
    depthMapStyle,
    includeStyleLock,
    includeStyleReinforcement,
    visualStyle,
  })

  return style === ""
    ? `${identity}${voyeuristic}`
    : `${identity}${voyeuristic} ${style}`
}

/**
 * Binds composer notes to `@ImageN` stills, one named subject at a time.
 *
 * @param options - Notes, image count, starting index, and kind.
 * @returns Mapping lines, or an empty string when the group is unused.
 */
export function formatSubjectBindings(
  options: FormatSubjectBindingsOptions
): string {
  const {
    fallbackStem,
    imageCount,
    includeNotesProse,
    kind,
    shotMode,
    startIndex,
  } = options
  const notes = filledNotes(options.notes)
  const use = subjectUseClause(kind)
  const lines: string[] = []

  if (imageCount <= 0 && notes.length === 0) {
    return ""
  }

  if (notes.length === 1 && imageCount > 1) {
    lines.push(
      formatSingleSubjectManyImages({
        imageCount,
        includeNotesProse,
        note: notes[0],
        startIndex,
        token: formatSubjectToken(notes[0].name, `${fallbackStem} 1`),
        use,
      })
    )
  } else {
    const paired = Math.min(notes.length, imageCount)

    for (let index = 0; index < paired; index += 1) {
      lines.push(
        formatPairedBinding({
          includeNotesProse,
          note: notes[index],
          startIndex: startIndex + index,
          token: formatSubjectToken(
            notes[index].name,
            `${fallbackStem} ${index + 1}`
          ),
          use,
        })
      )
    }

    if (notes.length === 0) {
      for (let index = 0; index < imageCount; index += 1) {
        const token = formatSubjectToken("", `${fallbackStem} ${index + 1}`)

        lines.push(
          `${token} corresponds to ${formatImageToken(startIndex + index)}. ${use}`
        )
      }
    } else if (imageCount > notes.length) {
      lines.push(
        formatAdditionalViews({
          extraCount: imageCount - notes.length,
          kind,
          startIndex: startIndex + notes.length,
        })
      )
    }

    for (let index = imageCount; index < notes.length; index += 1) {
      lines.push(
        formatUnboundNote({
          fallbackStem,
          includeNotesProse,
          kind,
          note: notes[index],
          ordinal: index + 1,
        })
      )
    }
  }

  if (kind === "character" && namedSubjectCount(notes, imageCount) >= 2) {
    lines.push(
      "Do not interchange the characters' appearances, clothing, actions, positions, or dialogue."
    )
  }

  if (kind === "environment" && lines.length > 0) {
    lines.push(ENVIRONMENT_STAGING_DIRECTIONS[shotMode])
  }

  return lines.join("\n")
}

/**
 * Formats extra stills as additional views of already-named subjects.
 *
 * @param extraCount - How many stills remain after 1:1 pairing.
 * @param kind - Character or environment group.
 * @param startIndex - 1-based index of the first extra still.
 * @returns The additional-views sentence.
 */
function formatAdditionalViews(options: {
  extraCount: number
  kind: SeedanceSubjectKind
  startIndex: number
}): string {
  const { extraCount, kind, startIndex } = options
  const lastIndex = startIndex + extraCount - 1
  const refs =
    extraCount === 1
      ? formatImageToken(startIndex)
      : `${formatImageToken(startIndex)} through ${formatImageToken(lastIndex)}`
  const noun = kind === "character" ? "characters" : "locations"
  const unit = kind === "character" ? "character" : "location"
  const verb = extraCount === 1 ? "is" : "are"

  return `${refs} ${verb} additional views of these ${noun}. The output must contain only one instance of each named ${unit} throughout. Do not use the image backgrounds.`
}

/**
 * Formats one note paired with one still.
 *
 * @param includeNotesProse - Whether to append written notes.
 * @param note - Composer note for this subject.
 * @param startIndex - `@Image` index of the paired still.
 * @param token - `<Name>` token for the subject.
 * @param use - Use-and-exclude clause for this kind.
 * @returns One mapping sentence.
 */
function formatPairedBinding(options: {
  includeNotesProse: boolean
  note: SeedanceNote
  startIndex: number
  token: string
  use: string
}): string {
  const { includeNotesProse, note, startIndex, token, use } = options
  const base = `${token} corresponds to ${formatImageToken(startIndex)}. ${use}`
  const noteText = note.notes.trim()

  if (!includeNotesProse || noteText === "") {
    return base
  }

  return `${base} Notes: ${formatPromptProse(noteText)}`
}

/**
 * Formats many stills as views of a single named subject.
 *
 * @param imageCount - Number of stills that define this subject.
 * @param includeNotesProse - Whether to append written notes.
 * @param note - The single composer note.
 * @param startIndex - `@Image` index of the first still.
 * @param token - `<Name>` token for the subject.
 * @param use - Use-and-exclude clause for this kind.
 * @returns One mapping paragraph.
 */
function formatSingleSubjectManyImages(options: {
  imageCount: number
  includeNotesProse: boolean
  note: SeedanceNote
  startIndex: number
  token: string
  use: string
}): string {
  const { imageCount, includeNotesProse, note, startIndex, token, use } =
    options
  const lastIndex = startIndex + imageCount - 1
  const base = `All ${formatImageToken(startIndex)} through ${formatImageToken(lastIndex)} define one ${token}. The output must contain only one ${token} throughout. ${use}`
  const noteText = note.notes.trim()

  if (!includeNotesProse || noteText === "") {
    return base
  }

  return `${base} Notes: ${formatPromptProse(noteText)}`
}

/**
 * Formats the visual-style lock that closes the consistency block.
 *
 * @param depthMapStyle - Whether @Image1 is a depth-map blockout.
 * @param includeStyleLock - Keep the written visual-style sentence.
 * @param includeStyleReinforcement - Keep the drift-guard sentence.
 * @param visualStyle - Optional textual visual-style guidance.
 * @returns The style sentence, or empty when shed and not a depth map.
 */
function formatStyleLock(options: {
  depthMapStyle: boolean
  includeStyleLock: boolean
  includeStyleReinforcement: boolean
  visualStyle: string
}): string {
  const {
    depthMapStyle,
    includeStyleLock,
    includeStyleReinforcement,
    visualStyle,
  } = options
  const trimmed = visualStyle.trim()

  if (includeStyleLock && trimmed !== "") {
    const lock = `The final video uses ${formatPromptProse(trimmed)}`

    return includeStyleReinforcement
      ? `${lock} Preserve this medium, palette, lighting language, and image-making treatment across every stage. Do not drift toward a different look.`
      : lock
  }

  if (depthMapStyle) {
    return "The final video uses photorealistic live-action cinematography. Render finished colour footage using the depth panels only for camera and blocking. Do not output grayscale depth maps."
  }

  return ""
}

/**
 * Formats a named subject that has notes but no attached still.
 *
 * @param fallbackStem - Label stem when the note has no handle.
 * @param includeNotesProse - Whether to quote the written notes.
 * @param kind - Character or environment group.
 * @param note - Composer note without an image.
 * @param ordinal - 1-based index in the group.
 * @returns One unbound-profile sentence.
 */
function formatUnboundNote(options: {
  fallbackStem: string
  includeNotesProse: boolean
  kind: SeedanceSubjectKind
  note: SeedanceNote
  ordinal: number
}): string {
  const { fallbackStem, includeNotesProse, kind, note, ordinal } = options
  const token = formatSubjectToken(note.name, `${fallbackStem} ${ordinal}`)
  const noteText = note.notes.trim()

  if (includeNotesProse && noteText !== "") {
    return `${token} has no attached still. Use only the written notes: ${formatPromptProse(noteText)}`
  }

  return `${token} has no attached still. Keep this ${kind} consistent from the written profile.`
}

/**
 * Joins named-subject tokens for the consistency sentence.
 *
 * @param names - `<Name>` tokens in composer order.
 * @returns `"<A>'s"` or `"<A> and <B>'s"`.
 */
function joinSubjectNames(names: string[]): string {
  if (names.length === 1) {
    return `${names[0]}'s`
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}'s`
  }

  const head = names.slice(0, -1).join(", ")

  return `${head}, and ${names[names.length - 1]}'s`
}

/**
 * How many distinct character/location identities this group introduces.
 *
 * @param notes - Filled composer notes.
 * @param imageCount - Attached stills for the group.
 * @returns A count used to decide whether to forbid interchanging identities.
 */
function namedSubjectCount(notes: SeedanceNote[], imageCount: number): number {
  if (notes.length > 0) {
    return notes.length
  }

  return imageCount
}

/**
 * Use-and-exclude clause for one material kind.
 *
 * @param kind - Character or environment group.
 * @returns The clause appended to each mapping.
 */
function subjectUseClause(kind: SeedanceSubjectKind): string {
  return kind === "character"
    ? "Use only appearance, hairstyle, and clothing. Do not use the image background, other people, or composition."
    : "Use only spatial layout, architecture, materials, and lighting. Do not use the people in the image or its framing."
}

/**
 * Builds Seedance 2.0 reference-to-video prompts from storyboard scenes.
 *
 * Prompt craft follows fal's Seedance guidance: shot-list structure with
 * concrete motion, camera language, quoted dialogue for lip-sync, explicit
 * `cut to` between beats, and `@ImageN` bindings that match `image_urls`
 * order: the contact sheet, then character references, then environments.
 *
 * In the `continuous` and `voyeuristic` shot modes the same beats describe one
 * unbroken take, so the cut language is replaced by camera-travel language
 * between panels.
 */

import type { ShotMode } from "@/lib/shot-mode-settings"
import type { Scene } from "@/lib/storyboard"

/**
 * Inputs required to assemble a Seedance reference-to-video prompt.
 */
export interface BuildSeedanceVideoPromptInput {
  /**
   * Number of character reference images that follow the storyboard PNG in
   * `image_urls` (@Image2…). Characters occupy the first slots.
   */
  characterImageCount: number
  /** Written character definitions from the prompt composer. */
  characterNotes: SeedanceNote[]
  /**
   * When true, @Image1 is a depth-map camera/composition reference; visual
   * style still drives finished footage appearance.
   */
  depthMapStyle?: boolean
  /**
   * Number of environment reference images, which follow the character
   * references in `image_urls`. Both counts are capped together by the
   * caller via `allocateSeedanceReferenceSlots`.
   */
  environmentImageCount: number
  /** Written environment definitions from the prompt composer. */
  environmentNotes: SeedanceNote[]
  /** Ordered scenes of the current board. */
  scenes: Scene[]
  /** Whether the beats read as cut shots or one unbroken take. */
  shotMode: ShotMode
  /** Optional textual visual-style guidance from the prompt composer. */
  visualStyle: string
}

/**
 * One written definition folded into the Seedance prompt — a character or an
 * environment. Mirrors the composer's note rows without importing UI modules.
 */
export interface SeedanceNote {
  /**
   * Display name from the composer. May arrive as an `@handle`; the prompt
   * strips the `@` so Seedance does not treat it as an `@ImageN` binding.
   */
  name: string
  /** Free-text appearance, wardrobe, or set-design notes. */
  notes: string
}

/**
 * Default action description used when a scene does not define one.
 */
export const DEFAULT_ACTION_TEXT = "Hold on the framed subject."

/**
 * Default audio/music description used when a scene is silent.
 * Note: Must start with a leading space to separate from the dialogue clause.
 */
export const DEFAULT_AUDIO_TEXT = " Audio: natural diegetic sound, no music."

/**
 * How much freedom each shot mode has to restage a supplied location.
 * One unbroken take needs a stable traversable space; cuts may pick fresh
 * setups within the same place.
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
 * Noun used to introduce each beat. Cut sequences read as numbered shots;
 * an unbroken take has only one shot, so its panels are numbered beats.
 */
export const SHOT_BEAT_LABELS: Record<ShotMode, string> = {
  continuous: "Beat",
  "multi-shot": "Shot",
  voyeuristic: "Beat",
}

/**
 * The starting index for attached reference image bindings in the prompt
 * template. Since @Image1 is reserved for the storyboard contact sheet,
 * references start at 2.
 */
export const STARTING_REFERENCE_IMAGE_INDEX = 2

/**
 * The starting index for shot numbering. Shots are numbered starting from 1.
 */
export const STARTING_SHOT_NUMBER = 1

/**
 * The base instruction prompt guiding the AI model on how to interpret the storyboard.
 */
export const STORYBOARD_BASE_PROMPT =
  "@Image1 is the storyboard contact sheet showing the shot sequence in reading order (left to right, top to bottom). Animate this story as continuous live-action footage with hard cuts that match each panel in order. Preserve composition, wardrobe, lighting, and production design from each panel."

/**
 * Base instruction for one unbroken take: panels are successive framings the
 * camera travels through rather than separate shots joined by cuts.
 */
export const STORYBOARD_CONTINUOUS_BASE_PROMPT =
  "@Image1 is the storyboard contact sheet showing successive moments of ONE unbroken take in reading order (left to right, top to bottom). Animate this story as a single continuous live-action shot: no cuts, no dissolves, no wipes, no transitions of any kind. Travel the camera from each panel's framing to the next, reframing through camera movement and subject blocking inside one continuous space and time. Preserve composition, wardrobe, lighting, and production design from each panel."

/**
 * Base instruction when the contact sheet is a grayscale linear depth map.
 * Depth panels drive camera, framing, and blocking only — not final look.
 */
export const STORYBOARD_DEPTH_MAP_BASE_PROMPT =
  "@Image1 is a depth-map storyboard contact sheet (grayscale linear depth: white nearest, black farthest) showing shot sequence in reading order (left to right, top to bottom). Use it only for camera, composition, framing, blocking, and relative depth. Animate this story as continuous finished footage with hard cuts that match each panel in order — do not output grayscale depth-map video. Take medium, palette, lighting, texture, and production design from the visual style lock below, not from the depth panels."

/**
 * Depth-map base instruction for one unbroken take. Combines the depth-map
 * reading rules with single-shot camera-travel language.
 */
export const STORYBOARD_DEPTH_MAP_CONTINUOUS_BASE_PROMPT =
  "@Image1 is a depth-map storyboard contact sheet (grayscale linear depth: white nearest, black farthest) showing successive moments of ONE unbroken take in reading order (left to right, top to bottom). Use it only for camera, composition, framing, blocking, and relative depth. Animate this story as a single continuous finished shot: no cuts, no dissolves, no transitions of any kind — travel the camera from each panel's framing to the next through camera movement and subject blocking inside one continuous space and time, and do not output grayscale depth-map video. Take medium, palette, lighting, texture, and production design from the visual style lock below, not from the depth panels."

/**
 * Base instruction for one unbroken take watched from concealment, with the
 * zoom cycle every location must complete before the camera moves on.
 */
export const STORYBOARD_VOYEURISTIC_BASE_PROMPT =
  "@Image1 is the storyboard contact sheet showing successive moments of ONE unbroken voyeuristic take in reading order (left to right, top to bottom). Animate this story as a single continuous live-action shot filmed by an unseen observer: no cuts, no dissolves, no wipes, no transitions of any kind. The camera watches from concealment — through windows, part-open doorways, gaps in blinds or curtains, foliage, stairwells, or from across the street — with foreground obstruction cropping the frame, long-lens compression, and subjects who are unaware and never look into the lens. At every location the lens zooms in from the wide watching frame to a tight detail, holds, then zooms back out to that wide frame before the camera drifts on unseen to the next vantage. Travel the camera from each panel's framing to the next through camera movement, lens zoom, and subject blocking inside one continuous space and time. Preserve composition, wardrobe, lighting, and production design from each panel."

/**
 * Depth-map base instruction for the voyeuristic take. Combines the depth-map
 * reading rules with the hidden-vantage and zoom-cycle language.
 */
export const STORYBOARD_DEPTH_MAP_VOYEURISTIC_BASE_PROMPT =
  "@Image1 is a depth-map storyboard contact sheet (grayscale linear depth: white nearest, black farthest) showing successive moments of ONE unbroken voyeuristic take in reading order (left to right, top to bottom). Use it only for camera, composition, framing, blocking, and relative depth. Animate this story as a single continuous finished shot filmed by an unseen observer: no cuts, no dissolves, no transitions of any kind — the camera watches from concealment with foreground obstruction cropping the frame, long-lens compression, and subjects who are unaware and never look into the lens. At every location the lens zooms in from the wide watching frame to a tight detail, holds, then zooms back out to that wide frame before the camera drifts on to the next vantage, travelling from each panel's framing to the next inside one continuous space and time. Do not output grayscale depth-map video. Take medium, palette, lighting, texture, and production design from the visual style lock below, not from the depth panels."

/**
 * Default appearance when depth-map boards have no written visual style.
 */
export const DEPTH_MAP_DEFAULT_VIDEO_STYLE_LOCK =
  "Visual style lock: photorealistic live-action cinematography. Render finished colour footage using the depth panels only for camera and blocking — do not output grayscale depth maps."

/**
 * The transition command prefixed to beats starting from the second one.
 * Continuous takes must never imply an edit, so the camera travels instead.
 */
export const TRANSITION_TEXTS: Record<ShotMode, string> = {
  continuous: "Without cutting, the camera continues into ",
  "multi-shot": "Cut to ",
  voyeuristic: "Still unseen and without cutting, the camera drifts on to ",
}

/**
 * Base instruction for each shot mode, keyed by whether @Image1 is a depth
 * map. A lookup keeps every mode's pairing explicit, so a new shot mode
 * cannot silently inherit another mode's opening instruction.
 */
const SHOT_MODE_BASE_PROMPTS: Record<
  ShotMode,
  Record<"depthMap" | "standard", string>
> = {
  continuous: {
    depthMap: STORYBOARD_DEPTH_MAP_CONTINUOUS_BASE_PROMPT,
    standard: STORYBOARD_CONTINUOUS_BASE_PROMPT,
  },
  "multi-shot": {
    depthMap: STORYBOARD_DEPTH_MAP_BASE_PROMPT,
    standard: STORYBOARD_BASE_PROMPT,
  },
  voyeuristic: {
    depthMap: STORYBOARD_DEPTH_MAP_VOYEURISTIC_BASE_PROMPT,
    standard: STORYBOARD_VOYEURISTIC_BASE_PROMPT,
  },
}

/**
 * Assembles a Seedance 2.0 prompt that animates the storyboard contact sheet
 * (@Image1) and optionally locks character identity and location design from
 * @Image2+.
 *
 * Character bindings come first, then environments, matching the order the
 * caller uploads `image_urls`.
 *
 * @param input - The scenes, character, and environment inputs for the prompt.
 * @returns The fully formatted Seedance reference-to-video prompt string.
 */
export function buildSeedanceVideoPrompt({
  characterImageCount,
  characterNotes,
  depthMapStyle = false,
  environmentImageCount,
  environmentNotes,
  scenes,
  shotMode,
  visualStyle,
}: BuildSeedanceVideoPromptInput): string {
  if (scenes.length === 0) {
    return ""
  }

  const lines: string[] = [selectBasePrompt({ depthMapStyle, shotMode })]
  const trimmedVisualStyle = visualStyle.trim()

  if (trimmedVisualStyle !== "") {
    lines.push(
      `Visual style lock: ${formatPromptProse(trimmedVisualStyle)} Preserve this medium, palette, lighting language, and image-making treatment across every shot — do not drift toward a different look.`
    )
  } else if (depthMapStyle) {
    lines.push(DEPTH_MAP_DEFAULT_VIDEO_STYLE_LOCK)
  }

  const sections = [
    formatCharacterReferences(characterImageCount),
    formatCharacterNotes(characterNotes),
    formatEnvironmentReferences({
      characterImageCount,
      environmentImageCount,
      shotMode,
    }),
    formatEnvironmentNotes(environmentNotes),
  ]

  for (const section of sections) {
    if (section !== "") {
      lines.push(section)
    }
  }

  lines.push("")

  scenes.forEach((scene, index) => {
    const beat = formatShotBeat(scene, index + STARTING_SHOT_NUMBER, shotMode)

    if (index === 0) {
      lines.push(beat)
    } else {
      lines.push(`${TRANSITION_TEXTS[shotMode]}${beat}`)
    }
  })

  return lines.join("\n")
}

/**
 * Formats one group of written notes into a single labelled prompt line.
 *
 * @param notes - Names and descriptions from one composer note group.
 * @param label - Line prefix, e.g. `"Character notes"`.
 * @returns The formatted line, or an empty string when the group is empty.
 */
function formatNotes(notes: SeedanceNote[], label: string): string {
  const namedNotes = notes
    .map((note) => {
      const name = formatReferenceLabel(note.name)
      const noteText = stripComposerHandles(note.notes.trim())

      if (name === "" && noteText === "") {
        return null
      }

      if (name === "") {
        return noteText
      }

      return noteText === "" ? name : `${name}: ${noteText}`
    })
    .filter((value): value is string => value !== null)

  return namedNotes.length > 0
    ? formatPromptProse(`${label}: ${namedNotes.join("; ")}`)
    : ""
}

/**
 * Normalizes user/LLM prose for the Seedance prompt: drop composer `@handles`
 * and guarantee a single trailing sentence terminator.
 *
 * @param text - Action, notes, or style copy that may already be punctuated.
 * @returns The cleaned sentence, or an empty string when `text` is blank.
 */
function formatPromptProse(text: string): string {
  return withSentencePeriod(stripComposerHandles(text))
}

/**
 * Strips leading `@` from a composer handle so the video prompt uses a plain
 * label (`Character`, not `@Character` / `@@Character`).
 *
 * @param name - Raw note name, with or without a leading `@`.
 * @returns The label with leading `@` signs removed.
 */
function formatReferenceLabel(name: string): string {
  return name.trim().replace(/^@+/, "")
}

/**
 * Builds the `@ImageN` binding list for one contiguous group of references.
 *
 * @param count - How many reference images the group contributes.
 * @param startIndex - 1-based `@Image` index of the group's first image.
 * @returns Comma-separated bindings, or an empty string when count is zero.
 */
function formatImageBindings(count: number, startIndex: number): string {
  if (count <= 0) {
    return ""
  }

  return Array.from(
    { length: count },
    (_, index) => `@Image${index + startIndex}`
  ).join(", ")
}

/**
 * Parses and formats a list of character notes into a single line for the prompt.
 *
 * @param characterNotes - An array of character names and descriptions.
 * @returns A formatted string listing all character notes, or an empty string.
 */
export function formatCharacterNotes(characterNotes: SeedanceNote[]): string {
  return formatNotes(characterNotes, "Character notes")
}

/**
 * Generates character image references and identity preservation instructions.
 * Characters fill the reference slots immediately after the contact sheet.
 *
 * @param characterImageCount - The number of character reference images.
 * @returns A formatted string detailing the character image reference bindings.
 */
export function formatCharacterReferences(characterImageCount: number): string {
  const imageRefs = formatImageBindings(
    characterImageCount,
    STARTING_REFERENCE_IMAGE_INDEX
  )

  if (imageRefs === "") {
    return ""
  }

  const referenceTerm =
    characterImageCount === 1
      ? "is a character identity reference"
      : "are character identity references"

  const imageTerm = characterImageCount === 1 ? "this image" : "these images"

  return `${imageRefs} ${referenceTerm}. Preserve face, wardrobe, hair, and silhouette from ${imageTerm} across every shot.`
}

/**
 * Parses and formats a list of environment notes into a single prompt line.
 *
 * @param environmentNotes - An array of location names and descriptions.
 * @returns A formatted string listing all environment notes, or empty string.
 */
export function formatEnvironmentNotes(
  environmentNotes: SeedanceNote[]
): string {
  return formatNotes(environmentNotes, "Environment notes")
}

interface EnvironmentReferencesOptions {
  /** Character references preceding this group. */
  characterImageCount: number
  /** The number of environment reference images. */
  environmentImageCount: number
  /** Whether the beats read as cut shots or one unbroken take. */
  shotMode: ShotMode
}

/**
 * Generates environment image references and location staging instructions.
 * Environments follow the character references, so their bindings start after
 * the character block.
 *
 * The references establish what the location is; their framing and element
 * arrangement must not be reproduced, so how freely each shot may restage
 * comes from {@link ENVIRONMENT_STAGING_DIRECTIONS}.
 *
 * @param options - Preceding character count, environment count, shot mode.
 * @returns A formatted string detailing the environment reference bindings.
 */
export function formatEnvironmentReferences({
  characterImageCount,
  environmentImageCount,
  shotMode,
}: EnvironmentReferencesOptions): string {
  const imageRefs = formatImageBindings(
    environmentImageCount,
    STARTING_REFERENCE_IMAGE_INDEX + Math.max(characterImageCount, 0)
  )

  if (imageRefs === "") {
    return ""
  }

  const referenceTerm =
    environmentImageCount === 1
      ? "is an environment reference"
      : "are environment references"

  const imageTerm =
    environmentImageCount === 1 ? "this image" : "these images"

  const establishTerm =
    environmentImageCount === 1 ? "It establishes" : "They establish"

  return `${imageRefs} ${referenceTerm}. ${establishTerm} what the location is — architecture, materials, set dressing, period, and scale. Do not reproduce the framing, cropping, or the arrangement of buildings and set pieces shown in ${imageTerm}; keep the place recognizable while staging new views of it. ${ENVIRONMENT_STAGING_DIRECTIONS[shotMode]}`
}

/**
 * Formats one storyboard scene as a Seedance shot beat.
 *
 * @param scene - The storyboard scene structure to format.
 * @param shotNumber - The ordered number of the shot in the scene list.
 * @param shotMode - Whether the beat belongs to a cut sequence or one take.
 * @returns The formatted shot beat description.
 */
export function formatShotBeat(
  scene: Scene,
  shotNumber: number,
  shotMode: ShotMode
): string {
  const craft = `[${scene.shot} | ${scene.camera} | ${scene.lens} | ${scene.movement} | ${scene.lighting}]`
  const trimmedAction = scene.action.trim()
  const action = formatPromptProse(
    trimmedAction === "" ? DEFAULT_ACTION_TEXT : trimmedAction
  )

  const dialogueTrimmed = stripComposerHandles(scene.dialogue.trim())
  const dialogue =
    dialogueTrimmed === "" ? "" : ` Says: "${dialogueTrimmed}".`

  const musicTrimmed = scene.music.trim()
  const audio =
    musicTrimmed === ""
      ? DEFAULT_AUDIO_TEXT
      : ` Audio: ${formatPromptProse(musicTrimmed)}`

  return `${SHOT_BEAT_LABELS[shotMode]} ${shotNumber} — ${craft}: ${action}${dialogue}${audio} Hold ~${scene.timeSeconds}s.`
}

/**
 * Removes composer `@handles` from prose while leaving Seedance `@ImageN`
 * image bindings intact.
 *
 * @param text - Prompt copy that may mix handles and `@ImageN` tokens.
 * @returns The same copy with `@Character`-style handles reduced to names.
 */
function stripComposerHandles(text: string): string {
  return text.replace(/@(?!Image\d+)(\S+)/g, "$1")
}

/**
 * Ensures a clause ends with a single sentence terminator so assembled
 * prompt lines never trail with `..` or `...`.
 *
 * @param text - A prompt clause that may already end in punctuation.
 * @returns The clause with one trailing `.`, or unchanged when it already
 *   ends with `!`, `?`, or `…`.
 */
function withSentencePeriod(text: string): string {
  const trimmed = text.trim().replace(/\.+$/, ".")

  if (trimmed === "" || trimmed === ".") {
    return ""
  }

  if (/[.!?…]$/.test(trimmed)) {
    return trimmed
  }

  return `${trimmed}.`
}

interface SelectBasePromptOptions {
  /** Whether @Image1 is a grayscale linear depth map. */
  depthMapStyle: boolean
  /** Whether the beats read as cut shots or one unbroken take. */
  shotMode: ShotMode
}

/**
 * Picks the base instruction for the depth-map and shot-mode combination.
 *
 * @param options - The depth-map and shot-mode flags for this prompt.
 * @returns The base instruction that opens the Seedance prompt.
 */
export function selectBasePrompt({
  depthMapStyle,
  shotMode,
}: SelectBasePromptOptions): string {
  return SHOT_MODE_BASE_PROMPTS[shotMode][
    depthMapStyle ? "depthMap" : "standard"
  ]
}

/**
 * Builds Seedance 2.0 reference-to-video prompts from storyboard scenes.
 *
 * Prompt craft follows fal's Seedance guidance: shot-list structure with
 * concrete motion, camera language, quoted dialogue for lip-sync, explicit
 * `cut to` between beats, and `@ImageN` bindings that match `image_urls` order.
 *
 * In `continuous` shot mode the same beats describe one unbroken take, so the
 * cut language is replaced by camera-travel language between panels.
 */

import type { ShotMode } from "@/lib/shot-mode-settings"
import type { Scene } from "@/lib/storyboard"

/**
 * Inputs required to assemble a Seedance reference-to-video prompt.
 */
export interface BuildSeedanceVideoPromptInput {
  /**
   * Number of character reference images that will follow the storyboard PNG
   * in `image_urls` (@Image2…). Capped by the caller to leave room under 9.
   */
  characterImageCount: number
  /** Written character definitions from the prompt composer. */
  characterNotes: SeedanceCharacterNote[]
  /**
   * When true, @Image1 is a depth-map camera/composition reference; visual
   * style still drives finished footage appearance.
   */
  depthMapStyle?: boolean
  /** Ordered scenes of the current board. */
  scenes: Scene[]
  /** Whether the beats read as cut shots or one unbroken take. */
  shotMode: ShotMode
  /** Optional textual visual-style guidance from the prompt composer. */
  visualStyle: string
}

/**
 * Character identity material folded into the Seedance prompt.
 * Mirrors the composer’s character note rows without importing UI modules.
 */
export interface SeedanceCharacterNote {
  /** Display name, used as an @handle when non-empty. */
  name: string
  /** Free-text appearance and wardrobe notes. */
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
 * Noun used to introduce each beat. Cut sequences read as numbered shots;
 * an unbroken take has only one shot, so its panels are numbered beats.
 */
export const SHOT_BEAT_LABELS: Record<ShotMode, string> = {
  continuous: "Beat",
  "multi-shot": "Shot",
}

/**
 * The starting index for character reference image bindings in the prompt template.
 * Since @Image1 is reserved for the storyboard contact sheet, references start at 2.
 */
export const STARTING_CHARACTER_IMAGE_INDEX = 2

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
}

/**
 * Assembles a Seedance 2.0 prompt that animates the storyboard contact sheet
 * (@Image1) and optionally locks character identity from @Image2+.
 *
 * @param input - The scenes and character notes inputs needed for prompt assembly.
 * @returns The fully formatted Seedance reference-to-video prompt string.
 */
export function buildSeedanceVideoPrompt({
  characterImageCount,
  characterNotes,
  depthMapStyle = false,
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
      `Visual style lock: ${trimmedVisualStyle}. Preserve this medium, palette, lighting language, and image-making treatment across every shot — do not drift toward a different look.`
    )
  } else if (depthMapStyle) {
    lines.push(DEPTH_MAP_DEFAULT_VIDEO_STYLE_LOCK)
  }

  const characterReferences = formatCharacterReferences(characterImageCount)
  if (characterReferences !== "") {
    lines.push(characterReferences)
  }

  const formattedNotes = formatCharacterNotes(characterNotes)
  if (formattedNotes !== "") {
    lines.push(formattedNotes)
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
 * Parses and formats a list of character notes into a single line for the prompt.
 *
 * @param characterNotes - An array of character names and descriptions.
 * @returns A formatted string listing all character notes, or an empty string.
 */
export function formatCharacterNotes(
  characterNotes: SeedanceCharacterNote[]
): string {
  const namedNotes = characterNotes
    .map((note) => {
      const name = note.name.trim()
      const notes = note.notes.trim()

      if (name === "" && notes === "") {
        return null
      }

      if (name === "") {
        return notes
      }

      return notes === "" ? `@${name}` : `@${name}: ${notes}`
    })
    .filter((value): value is string => value !== null)

  return namedNotes.length > 0
    ? `Character notes: ${namedNotes.join("; ")}.`
    : ""
}

/**
 * Generates character image references and identity preservation instructions.
 *
 * @param characterImageCount - The number of character reference images.
 * @returns A formatted string detailing the character image reference bindings.
 */
export function formatCharacterReferences(characterImageCount: number): string {
  if (characterImageCount <= 0) {
    return ""
  }

  const imageRefs = Array.from(
    { length: characterImageCount },
    (_, index) => `@Image${index + STARTING_CHARACTER_IMAGE_INDEX}`
  ).join(", ")

  const referenceTerm =
    characterImageCount === 1
      ? "is a character identity reference"
      : "are character identity references"

  const imageTerm = characterImageCount === 1 ? "this image" : "these images"

  return `${imageRefs} ${referenceTerm}. Preserve face, wardrobe, hair, and silhouette from ${imageTerm} across every shot.`
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
  const action = trimmedAction === "" ? DEFAULT_ACTION_TEXT : trimmedAction

  const dialogueTrimmed = scene.dialogue.trim()
  const dialogue =
    dialogueTrimmed === "" ? "" : ` Says: "${dialogueTrimmed}".`

  const musicTrimmed = scene.music.trim()
  const audio =
    musicTrimmed === "" ? DEFAULT_AUDIO_TEXT : ` Audio: ${musicTrimmed}.`

  return `${SHOT_BEAT_LABELS[shotMode]} ${shotNumber} — ${craft}: ${action}.${dialogue}${audio} Hold ~${scene.timeSeconds}s.`
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
  if (shotMode === "continuous") {
    return depthMapStyle
      ? STORYBOARD_DEPTH_MAP_CONTINUOUS_BASE_PROMPT
      : STORYBOARD_CONTINUOUS_BASE_PROMPT
  }

  return depthMapStyle
    ? STORYBOARD_DEPTH_MAP_BASE_PROMPT
    : STORYBOARD_BASE_PROMPT
}

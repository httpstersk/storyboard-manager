/**
 * Builds Seedance 2.0 reference-to-video prompts from storyboard scenes.
 *
 * Prompt craft follows fal's Seedance guidance: shot-list structure with
 * concrete motion, camera language, quoted dialogue for lip-sync, explicit
 * `cut to` between beats, and `@ImageN` bindings that match `image_urls` order.
 */

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
  /** Ordered scenes of the current board. */
  scenes: Scene[]
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
 * The transition command prefixed to shot beats starting from the second shot.
 */
export const TRANSITION_TEXT = "Cut to "

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
  scenes,
}: BuildSeedanceVideoPromptInput): string {
  if (scenes.length === 0) {
    return ""
  }

  const lines: string[] = [STORYBOARD_BASE_PROMPT]

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
    const beat = formatShotBeat(scene, index + STARTING_SHOT_NUMBER)

    if (index === 0) {
      lines.push(beat)
    } else {
      lines.push(`${TRANSITION_TEXT}${beat}`)
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
 * @returns The formatted shot beat description.
 */
export function formatShotBeat(scene: Scene, shotNumber: number): string {
  const craft = `[${scene.shot} | ${scene.camera} | ${scene.lens} | ${scene.movement} | ${scene.lighting}]`
  const trimmedAction = scene.action.trim()
  const action = trimmedAction === "" ? DEFAULT_ACTION_TEXT : trimmedAction

  const dialogueTrimmed = scene.dialogue.trim()
  const dialogue =
    dialogueTrimmed === "" ? "" : ` Says: "${dialogueTrimmed}".`

  const musicTrimmed = scene.music.trim()
  const audio =
    musicTrimmed === "" ? DEFAULT_AUDIO_TEXT : ` Audio: ${musicTrimmed}.`

  return `Shot ${shotNumber} — ${craft}: ${action}.${dialogue}${audio} Hold ~${scene.timeSeconds}s.`
}

/**
 * Builds Seedance 2.0 reference-to-video prompts from storyboard scenes.
 *
 * Prompt craft follows fal's Seedance guidance: shot-list structure with
 * concrete motion, camera language, quoted dialogue for lip-sync, explicit
 * `cut to` between beats, and `@ImageN` bindings that match `image_urls` order.
 */

import type { Scene } from "@/lib/storyboard"

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

/** Inputs required to assemble a Seedance reference-to-video prompt. */
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

/** Formats one scene as a Seedance shot beat. */
function formatShotBeat(scene: Scene, shotNumber: number): string {
  const craft = `[${scene.shot} | ${scene.camera} | ${scene.lens} | ${scene.movement} | ${scene.lighting}]`
  const action =
    scene.action.trim() === "" ? "Hold on the framed subject." : scene.action.trim()
  const dialogue =
    scene.dialogue.trim() === ""
      ? ""
      : ` Says: "${scene.dialogue.trim()}".`
  const audio =
    scene.music.trim() === ""
      ? " Audio: natural diegetic sound, no music."
      : ` Audio: ${scene.music.trim()}.`

  return `Shot ${shotNumber} — ${craft}: ${action}.${dialogue}${audio} Hold ~${scene.timeSeconds}s.`
}

/**
 * Assembles a Seedance 2.0 prompt that animates the storyboard contact sheet
 * (@Image1) and optionally locks character identity from @Image2+.
 */
export function buildSeedanceVideoPrompt({
  characterImageCount,
  characterNotes,
  scenes,
}: BuildSeedanceVideoPromptInput): string {
  if (scenes.length === 0) {
    return ""
  }

  const lines: string[] = [
    "@Image1 is the storyboard contact sheet showing the shot sequence in reading order (left to right, top to bottom). Animate this story as continuous live-action footage with hard cuts that match each panel in order. Preserve composition, wardrobe, lighting, and production design from each panel.",
  ]

  if (characterImageCount > 0) {
    const imageRefs = Array.from(
      { length: characterImageCount },
      (_, index) => `@Image${index + 2}`
    ).join(", ")

    lines.push(
      `${imageRefs} ${characterImageCount === 1 ? "is a character identity reference" : "are character identity references"}. Preserve face, wardrobe, hair, and silhouette from ${characterImageCount === 1 ? "this image" : "these images"} across every shot.`
    )
  }

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

  if (namedNotes.length > 0) {
    lines.push(`Character notes: ${namedNotes.join("; ")}.`)
  }

  lines.push("")

  scenes.forEach((scene, index) => {
    const beat = formatShotBeat(scene, index + 1)

    if (index === 0) {
      lines.push(beat)
      return
    }

    lines.push(`Cut to ${beat}`)
  })

  return lines.join("\n")
}

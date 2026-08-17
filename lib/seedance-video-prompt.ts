/**
 * Builds Seedance 2.5 reference-to-video prompts from storyboard scenes.
 *
 * Prompt craft follows the Dreamina Seedance 2.5 guide: bind every still to a
 * named subject, state what not to use, one primary change plus a checkable
 * end state per stage, and keep output duration out of the prompt text.
 * `@ImageN` tokens match fal `image_urls` order: the contact sheet, then
 * character stills, then environments.
 *
 * In the `continuous` and `voyeuristic` shot modes the stages describe one
 * unbroken take, so later stages continue from the previous state instead of
 * cutting.
 */

import {
  formatGenerationGoal,
  formatGridRole,
  formatMaintainConsistency,
  formatSubjectBindings,
} from "@/lib/seedance-prompt-roles"
import { allocateStageSeconds, formatStage } from "@/lib/seedance-prompt-stages"
import {
  type SeedanceNote,
  STARTING_REFERENCE_IMAGE_INDEX,
  STARTING_STAGE_NUMBER,
} from "@/lib/seedance-prompt-text"
import type { ShotMode } from "@/lib/shot-mode-settings"
import { type Scene, totalRuntimeSeconds } from "@/lib/storyboard"
import { resolveSeedanceDurationSeconds } from "@/lib/video-generation"

export type { SeedanceNote }

/**
 * Inputs required to assemble a Seedance 2.5 reference-to-video prompt.
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
   * Clip length in seconds that will be sent as fal `duration`. Stage time
   * ranges are scaled to this total. Omit to derive from scene durations.
   */
  durationSeconds?: number
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
 * Hard safety ceiling on the finished prompt's character count. This is not
 * a design target — every section (craft, timestamps, notes prose, style
 * reinforcement, default audio) is always included in full. It exists only
 * to guarantee callers never receive an unbounded string; see
 * {@link buildSeedanceVideoPrompt}.
 */
export const MAX_SEEDANCE_PROMPT_CHARS = 5_000

/**
 * Assembles a Seedance 2.5 prompt that animates the storyboard contact sheet
 * (@Image1) and locks character identity and location design from @Image2+.
 *
 * Character bindings come first, then environments, matching the order the
 * caller uploads `image_urls`. The prompt always includes every section in
 * full; if the assembled text exceeds {@link MAX_SEEDANCE_PROMPT_CHARS}, it is
 * flat-truncated to that length as a last-resort safety net.
 *
 * @param input - The scenes, character, and environment inputs for the prompt.
 * @returns The fully formatted Seedance reference-to-video prompt string.
 */
export function buildSeedanceVideoPrompt(
  input: BuildSeedanceVideoPromptInput
): string {
  if (input.scenes.length === 0) {
    return ""
  }

  const prompt = assemblePromptSections(input).join(SECTION_SEPARATOR)

  return prompt.length > MAX_SEEDANCE_PROMPT_CHARS
    ? prompt.slice(0, MAX_SEEDANCE_PROMPT_CHARS)
    : prompt
}

/** Separator joining top-level prompt sections. */
const SECTION_SEPARATOR = "\n\n"

/**
 * Builds the ordered top-level sections of the prompt. The first section is
 * the material-role block; the last is `[Maintain Consistency]`, which
 * carries the visual-style lock.
 *
 * @param input - The scenes, character, and environment inputs for the prompt.
 * @returns The assembled prompt sections, in order.
 */
function assemblePromptSections(
  input: BuildSeedanceVideoPromptInput
): string[] {
  const {
    characterImageCount,
    characterNotes,
    depthMapStyle = false,
    environmentImageCount,
    environmentNotes,
    scenes,
    shotMode,
    visualStyle,
  } = input
  const durationSeconds =
    input.durationSeconds ??
    resolveSeedanceDurationSeconds(totalRuntimeSeconds(scenes))
  const sections: string[] = [
    `[Material Roles]\n${formatGridRole({
      depthMapStyle,
      panelCount: scenes.length,
      shotMode,
    })}`,
  ]
  const characterBindings = formatSubjectBindings({
    fallbackStem: "Character",
    imageCount: characterImageCount,
    kind: "character",
    notes: characterNotes,
    shotMode,
    startIndex: STARTING_REFERENCE_IMAGE_INDEX,
  })

  if (characterBindings !== "") {
    sections.push(`[Characters]\n${characterBindings}`)
  }

  const environmentBindings = formatSubjectBindings({
    fallbackStem: "Location",
    imageCount: environmentImageCount,
    kind: "environment",
    notes: environmentNotes,
    shotMode,
    startIndex:
      STARTING_REFERENCE_IMAGE_INDEX + Math.max(characterImageCount, 0),
  })

  if (environmentBindings !== "") {
    sections.push(`[Scenes]\n${environmentBindings}`)
  }

  sections.push(
    `[Generation Goal]\n${formatGenerationGoal(depthMapStyle, shotMode)}`
  )

  const stageSeconds = allocateStageSeconds(
    scenes.map((scene) => scene.timeSeconds),
    durationSeconds
  )
  const useTimestamps =
    stageSeconds !== null && stageSeconds.every((value) => value > 0)
  let elapsedSeconds = 0
  const stageBlocks = scenes.map((scene, index) => {
    const allocated = useTimestamps ? stageSeconds[index] : undefined
    const block = formatStage({
      durationSeconds: allocated,
      scene,
      shotMode,
      stageNumber: index + STARTING_STAGE_NUMBER,
      startSeconds: useTimestamps ? elapsedSeconds : undefined,
    })

    if (allocated !== undefined) {
      elapsedSeconds += allocated
    }

    return block
  })

  sections.push(stageBlocks.join("\n\n"))
  sections.push(
    `[Maintain Consistency]\n${formatMaintainConsistency({
      characterNotes,
      depthMapStyle,
      shotMode,
      visualStyle,
    })}`
  )

  return sections
}

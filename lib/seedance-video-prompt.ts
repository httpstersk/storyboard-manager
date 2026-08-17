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
  /**
   * Hard character cap for the finished prompt. When set and exceeded, the
   * builder sheds optional content via {@link PROMPT_REDUCTION_LADDER} before
   * falling back to a clean line-boundary trim; the visual-style lock always
   * survives both (see {@link trimToPromptBudget}). Omit to disable capping.
   */
  maxLength?: number
  /** Ordered scenes of the current board. */
  scenes: Scene[]
  /** Whether the beats read as cut shots or one unbroken take. */
  shotMode: ShotMode
  /** Optional textual visual-style guidance from the prompt composer. */
  visualStyle: string
}

/**
 * Optional content toggles the assembler sheds, in isolation, to fit a
 * character budget. Material-role bindings are never removed here.
 */
interface PromptReduction {
  /** Keep camera, lens, movement, and lighting craft on each stage. */
  includeCraft: boolean
  /** Keep the boilerplate audio clause on silent stages. */
  includeDefaultAudio: boolean
  /** Keep written appearance and set-design notes on subject mappings. */
  includeNotesProse: boolean
  /** Keep the drift-guard sentence on the style lock. */
  includeStyleReinforcement: boolean
  /** Keep consecutive time ranges on each stage. */
  includeTimestamps: boolean
}

/** The full, unreduced prompt: every optional section present. */
const FULL_PROMPT_REDUCTION: PromptReduction = {
  includeCraft: true,
  includeDefaultAudio: true,
  includeNotesProse: true,
  includeStyleReinforcement: true,
  includeTimestamps: true,
}

/**
 * Graceful-degradation steps applied in order, least destructive first.
 * Material-role `@ImageN` bindings, stage order, and the free-text visual
 * style lock (see {@link trimToPromptBudget}) are never removed here.
 */
const PROMPT_REDUCTION_LADDER: Array<Partial<PromptReduction>> = [
  { includeDefaultAudio: false },
  { includeStyleReinforcement: false },
  { includeCraft: false },
  { includeTimestamps: false },
  { includeNotesProse: false },
]

/**
 * Assembles a Seedance 2.5 prompt that animates the storyboard contact sheet
 * (@Image1) and locks character identity and location design from @Image2+.
 *
 * Character bindings come first, then environments, matching the order the
 * caller uploads `image_urls`. When `input.maxLength` is set, the prompt is
 * shortened via graceful degradation (see {@link PROMPT_REDUCTION_LADDER}) and,
 * as a final guarantee, a clean line-boundary trim that always preserves the
 * visual-style lock (see {@link trimToPromptBudget}).
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

  let reduction: PromptReduction = { ...FULL_PROMPT_REDUCTION }
  let sections = assemblePromptSections(input, reduction)
  let prompt = sections.join(SECTION_SEPARATOR)
  const { maxLength } = input

  if (maxLength === undefined) {
    return prompt
  }

  for (const step of PROMPT_REDUCTION_LADDER) {
    if (prompt.length <= maxLength) {
      break
    }

    reduction = { ...reduction, ...step }
    sections = assemblePromptSections(input, reduction)
    prompt = sections.join(SECTION_SEPARATOR)
  }

  return prompt.length > maxLength
    ? trimToPromptBudget(sections, maxLength)
    : prompt
}

/**
 * Separator joining top-level prompt sections (and re-joining them after
 * budget trimming).
 */
const SECTION_SEPARATOR = "\n\n"

/**
 * Builds the ordered top-level sections for one reduction level. The first
 * section is the material-role block; the last is `[Maintain Consistency]`,
 * which carries the visual-style lock — both are load-bearing for
 * {@link trimToPromptBudget}'s survival guarantees.
 *
 * @param input - The scenes, character, and environment inputs for the prompt.
 * @param reduction - Which optional sections to include at this level.
 * @returns The assembled prompt sections for the given reduction level.
 */
function assemblePromptSections(
  input: BuildSeedanceVideoPromptInput,
  reduction: PromptReduction
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
    includeNotesProse: reduction.includeNotesProse,
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
    includeNotesProse: reduction.includeNotesProse,
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

  const stageSeconds = reduction.includeTimestamps
    ? allocateStageSeconds(
        scenes.map((scene) => scene.timeSeconds),
        durationSeconds
      )
    : null
  const useTimestamps =
    stageSeconds !== null && stageSeconds.every((value) => value > 0)
  let elapsedSeconds = 0
  const stageBlocks = scenes.map((scene, index) => {
    const allocated = useTimestamps ? stageSeconds[index] : undefined
    const block = formatStage({
      durationSeconds: allocated,
      includeCraft: reduction.includeCraft,
      includeDefaultAudio: reduction.includeDefaultAudio,
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
      includeStyleReinforcement: reduction.includeStyleReinforcement,
      shotMode,
      visualStyle,
    })}`
  )

  return sections
}

/**
 * Trims assembled prompt sections to fit a character budget without cutting
 * mid-line. The material-role block (first section) and the
 * `[Maintain Consistency]` block (last section, carrying the visual-style
 * lock) are both reserved and always survive intact; only the sections
 * between them are shed or hard-sliced to make room. When the two reserved
 * sections alone cannot fit the budget, the visual-style lock wins and the
 * material-role block is hard-sliced instead.
 *
 * @param sections - The assembled prompt's top-level sections, in order.
 * @param maxLength - The maximum allowed character count.
 * @returns The prompt trimmed to at most `maxLength` characters.
 */
function trimToPromptBudget(sections: string[], maxLength: number): string {
  if (sections.length <= 1) {
    return (sections[0] ?? "").slice(0, maxLength)
  }

  const head = sections[0]
  const tail = sections[sections.length - 1]
  const middle = sections.slice(1, -1)
  const reservedForTail = tail.length + SECTION_SEPARATOR.length

  if (reservedForTail >= maxLength) {
    return tail.slice(0, maxLength)
  }

  const trimmedHeadAndMiddle = trimLinesToBudget(
    [head, ...middle].join(SECTION_SEPARATOR),
    maxLength - reservedForTail
  )

  return trimmedHeadAndMiddle === ""
    ? tail.slice(0, maxLength)
    : `${trimmedHeadAndMiddle}${SECTION_SEPARATOR}${tail}`
}

/**
 * Greedily keeps whole lines from the top of `text` until the next line
 * would exceed `maxLength`, so a kept section is always a complete
 * instruction. The first line always survives; if it alone exceeds the
 * budget it is hard-sliced.
 *
 * @param text - The text to trim.
 * @param maxLength - The maximum allowed character count.
 * @returns The text trimmed to at most `maxLength` characters.
 */
function trimLinesToBudget(text: string, maxLength: number): string {
  const lines = text.split("\n")
  const kept: string[] = []
  let length = 0

  for (const line of lines) {
    const addition = kept.length === 0 ? line.length : line.length + 1

    if (length + addition > maxLength) {
      break
    }

    kept.push(line)
    length += addition
  }

  return kept.length === 0 ? text.slice(0, maxLength) : kept.join("\n")
}

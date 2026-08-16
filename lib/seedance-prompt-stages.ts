/**
 * Seedance 2.5 stage blocks: consecutive time ranges, flowing camera craft,
 * primary event, end state, and audio syntax.
 */

import {
  DEFAULT_ACTION_TEXT,
  formatPromptProse,
  rewriteComposerHandles,
  STARTING_STAGE_NUMBER,
  withSentencePeriod,
} from "@/lib/seedance-prompt-text"
import type { ShotMode } from "@/lib/shot-mode-settings"
import {
  type Scene,
  SHOT_SIZE_OPTIONS,
  type ShotSize,
} from "@/lib/storyboard"

/**
 * Default audio used when a scene has no dialogue or music.
 */
export const DEFAULT_AUDIO_TEXT = "natural diegetic ambience, no music."

/**
 * Inputs for {@link formatStage}.
 */
export interface FormatStageOptions {
  /** Allocated seconds for this stage, omitted when timestamps are shed. */
  durationSeconds?: number
  /** Keep camera, lens, movement, and lighting craft. */
  includeCraft: boolean
  /** Keep boilerplate audio when the scene is silent. */
  includeDefaultAudio: boolean
  /** Scene that this stage describes. */
  scene: Scene
  /** Whether the board reads as cuts or one unbroken take. */
  shotMode: ShotMode
  /** 1-based stage index. */
  stageNumber: number
  /** Inclusive start second when timestamps are present. */
  startSeconds?: number
}

/**
 * Distributes `targetSeconds` across scenes with largest-remainder rounding
 * so the ranges sum exactly. Returns `null` when there are more scenes than
 * seconds, because a zero-width range is not a valid Seedance time budget.
 *
 * @param sceneSeconds - Planned duration of each scene, in order.
 * @param targetSeconds - Clip length the fal `duration` field will request.
 * @returns Per-scene seconds, or `null` when timestamps cannot be used.
 */
export function allocateStageSeconds(
  sceneSeconds: number[],
  targetSeconds: number
): number[] | null {
  const count = sceneSeconds.length

  if (count === 0 || targetSeconds < count) {
    return null
  }

  const weightSum = sceneSeconds.reduce(
    (total, value) => total + Math.max(value, 0),
    0
  )
  const weights =
    weightSum > 0
      ? sceneSeconds.map((value) => Math.max(value, 0))
      : sceneSeconds.map(() => 1)
  const resolvedWeightSum = weights.reduce((total, value) => total + value, 0)
  const extraSeconds = targetSeconds - count
  const extraRaw = weights.map(
    (weight) => (weight / resolvedWeightSum) * extraSeconds
  )
  const extraFloors = extraRaw.map((value) => Math.floor(value))
  let remainder =
    extraSeconds - extraFloors.reduce((total, value) => total + value, 0)
  const fractionalOrder = extraRaw
    .map((value, index) => ({
      fraction: value - extraFloors[index],
      index,
    }))
    .sort(
      (left, right) =>
        right.fraction - left.fraction || left.index - right.index
    )

  for (const entry of fractionalOrder) {
    if (remainder <= 0) {
      break
    }

    extraFloors[entry.index] += 1
    remainder -= 1
  }

  return extraFloors.map((extra) => extra + 1)
}

/**
 * Formats the Audio line for one stage.
 *
 * @param scene - Scene that may hold dialogue and music.
 * @param includeDefaultAudio - Keep the silent-scene boilerplate.
 * @returns The audio line, or an empty string when silent and trimmed.
 */
export function formatAudioLine(
  scene: Scene,
  includeDefaultAudio: boolean
): string {
  const dialogue = rewriteComposerHandles(scene.dialogue.trim())
  const music = rewriteComposerHandles(scene.music.trim()).replace(
    /^\(|\)$/g,
    ""
  )
  const dialogueClause =
    dialogue === "" ? "" : `says in natural American English: {${dialogue}}`
  const musicClause = music === "" ? "" : `(${music})`

  if (dialogueClause === "" && musicClause === "") {
    return includeDefaultAudio ? `Audio: ${DEFAULT_AUDIO_TEXT}` : ""
  }

  return withSentencePeriod(
    `Audio: ${[dialogueClause, musicClause].filter((part) => part !== "").join(" ")}`
  )
}

/**
 * Formats camera language as flowing craft rather than a bracketed slate.
 *
 * @param scene - Scene whose shot, movement, lighting, camera, and lens to
 *   render.
 * @returns A single craft sentence.
 */
export function formatCraftLine(scene: Scene): string {
  const shot = formatShotSizeLabel(scene.shot)
  const movement = scene.movement.trim()
  const lighting = scene.lighting.trim()
  const heading = [shot, movement, lighting]
    .filter((part) => part !== "")
    .join(", ")
  const kit = [scene.camera.trim(), scene.lens.trim()]
    .filter((part) => part !== "")
    .join(", ")

  if (kit === "") {
    return withSentencePeriod(heading)
  }

  return withSentencePeriod(`${heading}. Camera: ${kit}`)
}

/**
 * Formats the observable end state for a stage from its action.
 *
 * @param action - Primary-event prose, already punctuated.
 * @param isFirstStage - Whether this is Stage 1.
 * @returns The End state line.
 */
export function formatEndState(action: string, isFirstStage: boolean): string {
  const completed = action.replace(/\.+$/, "")
  const hold =
    "The resulting positions, prop ownership, and framing hold before the next stage."

  return isFirstStage
    ? `End state: ${completed}. ${hold}`
    : `End state: ${completed}. Keep identity, clothing, and spatial relationships from the previous stage.`
}

/**
 * Formats one storyboard scene as a Seedance 2.5 stage block.
 *
 * @param options - Scene, stage index, craft/audio toggles, and optional time
 *   budget.
 * @returns The formatted `[Stage N]` block.
 */
export function formatStage(options: FormatStageOptions): string {
  const {
    durationSeconds,
    includeCraft,
    includeDefaultAudio,
    scene,
    shotMode,
    stageNumber,
    startSeconds,
  } = options
  const isFirstStage = stageNumber === STARTING_STAGE_NUMBER
  const trimmedAction = scene.action.trim()
  const action = formatPromptProse(
    trimmedAction === "" ? DEFAULT_ACTION_TEXT : trimmedAction
  )
  const lines: string[] = [`[Stage ${stageNumber}]`]

  if (!isFirstStage && shotMode !== "multi-shot") {
    const vantage =
      shotMode === "voyeuristic"
        ? "keep identity, clothing, spatial relationships, and the unseen vantage."
        : "keep identity, clothing, and spatial relationships."

    lines.push(`Continue from the previous stage: ${vantage}`)
  }

  if (
    startSeconds !== undefined &&
    durationSeconds !== undefined &&
    durationSeconds > 0
  ) {
    lines.push(formatTimeRange(startSeconds, durationSeconds))
  }

  if (includeCraft) {
    lines.push(formatCraftLine(scene))
  }

  lines.push(`Primary event: ${action}`)
  lines.push(formatEndState(action, isFirstStage))

  const audio = formatAudioLine(scene, includeDefaultAudio)

  if (audio !== "") {
    lines.push(audio)
  }

  return lines.join("\n")
}

/**
 * Formats the lowercase shot-size phrase Seedance 2.5 expects.
 *
 * @param shot - Storyboard shot-size code.
 * @returns A craft phrase such as `"wide shot"`.
 */
function formatShotSizeLabel(shot: ShotSize): string {
  const option = SHOT_SIZE_OPTIONS.find((entry) => entry.value === shot)

  return option === undefined ? shot : option.label.toLowerCase()
}

/**
 * Formats a consecutive Seedance time-budget range.
 *
 * @param startSeconds - Inclusive start of the range.
 * @param durationSeconds - Length of the range in whole seconds.
 * @returns A `start-end seconds.` clause.
 */
function formatTimeRange(startSeconds: number, durationSeconds: number): string {
  return `${startSeconds}-${startSeconds + durationSeconds} seconds.`
}

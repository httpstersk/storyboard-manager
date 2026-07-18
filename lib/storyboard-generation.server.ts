import sharp from "sharp"

import { type StoryboardLayout } from "@/lib/generation"
import {
  clampResolution,
  type ImageModel,
  type ImageResolution,
} from "@/lib/image-models"

/** Width of every normalized storyboard frame in pixels. */
const FRAME_WIDTH = 640

/** Height of every normalized storyboard frame in pixels. */
const FRAME_HEIGHT = 360

/**
 * Total-pixel bounds accepted by Seedream's custom `image_size` input.
 * 1K targets the API minimum; 2K targets the API maximum.
 */
const SEEDREAM_TOTAL_PIXEL_BOUNDS = {
  max: 2_048 * 2_048,
  min: 1_024 * 1_024,
} as const

/**
 * Aspect ratios accepted by Fal Nano Banana (`aspect_ratio` provider option).
 * Keep this list in sync with the API — wider composites snap to `21:9`.
 */
const SUPPORTED_ASPECT_RATIOS = [
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:4", value: 3 / 4 },
  { label: "2:3", value: 2 / 3 },
  { label: "9:16", value: 9 / 16 },
  { label: "5:4", value: 5 / 4 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "21:9", value: 21 / 9 },
] as const

interface CompositePromptOptions {
  /** Number of leading input images that define character identity. */
  characterImageCount: number
  /** Character continuity instructions supplied by the user. */
  characterSheets: string[]
  /** Number of cells across the composite. */
  columns: number
  /**
   * Column count of the layout-placeholder PNG attached as input image 1.
   * When set (together with {@link layoutPlaceholderRows}), the GRID
   * SPECIFICATION block references the placeholder for structural guidance.
   */
  layoutPlaceholderColumns?: number
  /**
   * Row count of the layout-placeholder PNG attached as input image 1.
   * When set (together with {@link layoutPlaceholderColumns}), the GRID
   * SPECIFICATION block references the placeholder for structural guidance.
   */
  layoutPlaceholderRows?: number
  /** Number of cell rows in the composite. */
  rows: number
  /** Ordered visual beats assigned to grid cells. */
  scenes: Array<{
    action: string
    camera: string
    dialogue: string
    lens: string
    lighting: string
    movement: string
    shot: string
  }>
  /** Original logline or full story material. */
  storyline: string
  /** Number of trailing input images that define visual treatment. */
  styleImageCount: number
  /** Optional textual description of the desired visual treatment. */
  visualStyle: string
}

interface VisualStyleSectionOptions {
  /** Number of trailing input images that define visual treatment. */
  styleImageCount: number
  /** Optional textual description of the desired visual treatment. */
  visualStyle: string
}

interface SceneImageEditPromptOptions {
  /** User instruction describing how to change the frame. */
  instruction: string
  /** Optional textual visual-style guidance to preserve while editing. */
  visualStyle: string
}

/**
 * Non-negotiable composition rules prepended to every single-frame edit.
 * The selected edit model receives this as part of its image-editing prompt.
 */
const SCENE_IMAGE_EDIT_SYSTEM_PROMPT = `Edit the supplied storyboard frame while preserving its cinematic visual language.

OUTPUT REQUIREMENTS (hard requirements):
- Return exactly one cinematic 16:9 frame.
- Keep the edited shot fully contained within the frame.
- Absolutely no text, typography, or burned-in graphics anywhere in the frame — no shot numbers, craft slates, labels, captions, titles, subtitles, watermarks, borders, or UI chrome.
- Never render craft metadata as readable text: shot codes (WS, MS, MCU, CU), camera or lens names, movement words (e.g. Static), lighting names (e.g. Blue hour), dialogue, or @handles. Pure imagery only.`

/**
 * Builds one production prompt that maps ordered beats to exact grid cells.
 */
export function buildCompositePrompt({
  characterImageCount,
  characterSheets,
  columns,
  layoutPlaceholderColumns,
  layoutPlaceholderRows,
  rows,
  scenes,
  storyline,
  styleImageCount,
  visualStyle,
}: CompositePromptOptions): string {
  const hasLayoutPlaceholder =
    layoutPlaceholderColumns !== undefined &&
    layoutPlaceholderRows !== undefined
  const sceneList = scenes
    .map(
      (scene, index) =>
        `${index + 1}. [${scene.shot} | ${scene.camera} | ${scene.lens} | ${scene.movement} | ${scene.lighting}] ${scene.action}${
          scene.dialogue === ""
            ? ""
            : ` Performance intent only (never typeset as speech, captions, or subtitles): ${scene.dialogue}`
        }`
    )
    .join("\n")
  const emptyCellCount = rows * columns - scenes.length
  const hasCharacterReferences =
    characterImageCount > 0 || characterSheets.length > 0
  const hasStyleGuidance = hasVisualStyleGuidance({
    styleImageCount,
    visualStyle,
  })
  const continuity = !hasCharacterReferences
    ? "Infer consistent character appearances and wardrobe from the storyline and keep them identical in every cell."
    : `Maintain the supplied character designs exactly across every frame. Re-assert each character's identity inside every cell they appear in — same face, hair, wardrobe, and silhouette.${
        characterSheets.length === 0
          ? ""
          : `\n\nCharacter identities use @handle form (e.g. @XYZ) in the storyline and sheets; keep each @handle visually consistent across every cell. Never draw @handles as readable text on any cell.\n\nWritten character sheets:\n${characterSheets.join(
              "\n\n---\n\n"
            )}`
      }`
  const referenceDirections = buildReferenceDirections(
    characterImageCount,
    styleImageCount,
    hasLayoutPlaceholder
      ? `Input image 1: LAYOUT GRID REFERENCE — a black ${layoutPlaceholderColumns}×${layoutPlaceholderRows} contact-sheet placeholder with red cell-boundary lines. Reproduce this exact grid structure in the output: match the column and row proportions precisely.`
      : undefined
  )
  const styleSection = buildVisualStyleSection({
    styleImageCount,
    visualStyle,
  })
  const renderingDirection = hasStyleGuidance
    ? "STYLE LOCK (hard requirement): Every cell must match the declared visual style exactly — same medium, palette, contrast, lighting language, texture, production design, and image-making treatment. Do not fall back to photoreal live-action, illustration defaults, or any other look. Apply that locked style to this story rather than copying any referenced person, pose, composition, location, or narrative event."
    : "Every cell is photorealistic live-action cinematography — real human skin texture, real fabric and materials, natural depth of field, and the optical character of the camera body and lens named for that cell. Absolutely no illustration, storyboard sketch, pencil or ink drawing, comic art, anime, cel-shading, watercolor, concept-art painting, or 3D cartoon rendering."
  const visualDirection = hasStyleGuidance
    ? "Coherent production design and strong visual continuity within the locked style. Each cell follows its bracketed [shot size | camera | lens | movement | lighting] specification as framing and staging guidance interpreted through the locked medium — not as a mandate for photoreal optics. Compose with variety — at most 2 cells on the whole sheet may center the subject; vary blocking, angle, and depth layering between adjacent cells so no two neighbours read the same."
    : "Premium cinematic previsualization with coherent production design and strong visual continuity. Each cell follows its bracketed [shot size | camera | lens | movement | lighting] specification: frame the subject at the stated shot size, render the lens's field of view and compression, imply the movement through motion blur or composition energy, and light the cell with the stated condition. Compose with variety — at most 2 cells on the whole sheet may center the subject; vary blocking, angle, and depth layering between adjacent cells so no two neighbours read the same."

  const layoutReferenceInstruction = hasLayoutPlaceholder
    ? `- Input image 1 is the LAYOUT REFERENCE. Fill this exact ${layoutPlaceholderColumns}×${layoutPlaceholderRows} grid precisely — the red lines mark every cell boundary. Use the proportions from that image without deviation.`
    : ""

  return `Create ONE finished cinematic storyboard contact sheet, not separate images.

${styleSection === "" ? "" : `${styleSection}\n\n`}GRID SPECIFICATION:
- Exactly ${columns} columns by ${rows} rows.
- Read left-to-right, then top-to-bottom.
- Every cell has the same dimensions and a cinematic 16:9 composition.
- Cells are rendered edge-to-edge with ZERO gap: no separator lines, no borders, no gutters, no margins, no frames anywhere on the sheet.
- Keep each shot fully contained in its own cell with a clean hard boundary between adjacent shots. Never blend imagery across cell boundaries.
${emptyCellCount > 0 ? `- Leave the final ${emptyCellCount} unused cell${emptyCellCount === 1 ? "" : "s"} solid black.` : ""}
${layoutReferenceInstruction}

RENDERING (hard requirement):
${renderingDirection}

CONTAINMENT (hard requirement):
Absolutely no text, typography, or burned-in graphics anywhere on the sheet — pure imagery only.
Forbidden on every cell: shot numbers, numbered slates, captions, titles, subtitles, watermarks, borders, UI chrome, dialogue as readable speech, and @handles as readable text.
Never paint craft metadata as text — including shot codes (WS, MS, MCU, CU), camera or lens names, movement words (e.g. Static), or lighting names (e.g. Blue hour).

VISUAL DIRECTION:
${visualDirection}

REFERENCE IMAGE MAP:
${referenceDirections}

STORYLINE:
${storyline}

CONTINUITY:
${continuity}

ORDERED CELLS:
Bracketed [shot | camera | lens | movement | lighting] values are invisible camera instructions for framing, optics, and light only. Apply them to composition and atmosphere; never render them (or any abbreviation of them) as typography on any cell.
${sceneList}`
}

/**
 * Combines an editor instruction with the mandatory single-frame composition
 * constraints before sending it to the selected edit model.
 */
export function buildSceneImageEditPrompt({
  instruction,
  visualStyle,
}: SceneImageEditPromptOptions): string {
  const styleSection = buildVisualStyleSection({
    styleImageCount: 0,
    visualStyle,
  })
  const styleLock =
    styleSection === ""
      ? "Preserve the existing frame's visual language while applying the edit."
      : `${styleSection}

STYLE LOCK (hard requirement): Preserve and apply this visual style while editing. Do not drift toward a different medium, palette, or image-making treatment.`

  return `${SCENE_IMAGE_EDIT_SYSTEM_PROMPT}

${styleLock}

EDIT INSTRUCTION:
${instruction}`
}

/**
 * Whether textual style, style images, or both provide visual-style guidance.
 */
export function hasVisualStyleGuidance({
  styleImageCount,
  visualStyle,
}: VisualStyleSectionOptions): boolean {
  return styleImageCount > 0 || visualStyle.trim() !== ""
}

/**
 * Shared visual-style block for composite generation and scene editing.
 */
export function buildVisualStyleSection({
  styleImageCount,
  visualStyle,
}: VisualStyleSectionOptions): string {
  const trimmedStyle = visualStyle.trim()

  if (trimmedStyle === "" && styleImageCount === 0) {
    return ""
  }

  const lines = ["VISUAL STYLE (hard requirement):"]

  if (trimmedStyle !== "") {
    lines.push(`Written style: ${trimmedStyle}`)
  }

  if (styleImageCount > 0) {
    lines.push(
      styleImageCount === 1
        ? "A visual-style reference image is attached — lock medium, palette, lighting, texture, production design, and treatment from it."
        : `${styleImageCount} visual-style reference images are attached — lock medium, palette, lighting, texture, production design, and treatment from them.`
    )
  }

  lines.push(
    "This style overrides any default photoreal live-action look. Do not invent a different medium."
  )

  return lines.join("\n")
}

/**
 * Maps ordered model input images to their distinct roles.
 *
 * @param characterImageCount - Number of character reference images.
 * @param styleImageCount - Number of visual-style reference images.
 * @param layoutDescription - When the layout placeholder is input image 1,
 *   pass its pre-formatted description here so indices are shifted correctly.
 */
function buildReferenceDirections(
  characterImageCount: number,
  styleImageCount: number,
  layoutDescription?: string
): string {
  const hasLayout = layoutDescription !== undefined
  // Layout placeholder occupies slot 1 when present; user images follow.
  const offset = hasLayout ? 1 : 0
  const hasUserImages = characterImageCount > 0 || styleImageCount > 0

  if (!hasLayout && !hasUserImages) {
    return "No reference images were supplied."
  }

  const directions: string[] = []

  if (layoutDescription !== undefined) {
    directions.push(layoutDescription)
  }

  if (characterImageCount > 0) {
    const first = offset + 1
    const last = offset + characterImageCount
    const range =
      characterImageCount === 1
        ? `Input image ${first}`
        : `Input images ${first}–${last}`

    directions.push(
      `${range}: CHARACTER REFERENCES. Use only for face, hair, body, wardrobe, and silhouette continuity. Do not inherit their composition, background, or visual style.`
    )
  }

  if (styleImageCount > 0) {
    const firstStyleImage = offset + characterImageCount + 1
    const lastStyleImage = offset + characterImageCount + styleImageCount
    const range =
      styleImageCount === 1
        ? `Input image ${firstStyleImage}`
        : `Input images ${firstStyleImage}–${lastStyleImage}`

    directions.push(
      `${range}: VISUAL STYLE REFERENCES. Lock every cell to the style of ${styleImageCount === 1 ? "this attached image" : "these attached images"} — use only for medium, palette, lighting, texture, production design, and cinematic treatment. Do not copy people, wardrobe, poses, locations, compositions, or story content from them.`
    )
  }

  return directions.join("\n")
}

interface CompositeProviderOptionsInput {
  /** Selected image model for this generation. */
  imageModel: ImageModel
  /** Grid dimensions of the composite contact sheet. */
  layout: StoryboardLayout
  /** Number of reference images attached to the prompt. */
  referenceImageCount: number
  /** Preferred output resolution; clamped to what the model supports. */
  resolution: ImageResolution
}

/**
 * Builds the fal provider options for composite generation. Nano Banana
 * sizes via `aspect_ratio` + `resolution`; Seedream via a custom
 * `image_size` computed for the grid.
 */
export function buildCompositeProviderOptions({
  imageModel,
  layout,
  referenceImageCount,
  resolution,
}: CompositeProviderOptionsInput): Record<
  string,
  boolean | string | { height: number; width: number }
> {
  const sharedOptions = {
    outputFormat: "jpeg",
    // Both models' edit endpoints require image_urls even for one
    // reference image.
    useMultipleImages: referenceImageCount > 0,
  }

  if (imageModel === "seedream-5-pro") {
    return {
      ...sharedOptions,
      image_size: chooseCompositeImageSize(layout, resolution),
    }
  }

  return {
    ...sharedOptions,
    aspect_ratio: chooseCompositeAspectRatio(layout),
    limit_generations: true,
    resolution,
  }
}

/**
 * Computes a custom Seedream `image_size` matching the grid's aspect ratio.
 * 1K fills the API's minimum total-pixel bound and 2K its maximum, so the
 * dimensions round outward or inward respectively to stay in range.
 */
export function chooseCompositeImageSize(
  { columns, rows }: StoryboardLayout,
  resolution: ImageResolution
): { height: number; width: number } {
  const targetRatio = (columns * FRAME_WIDTH) / (rows * FRAME_HEIGHT)
  const isMinimumBudget =
    clampResolution("seedream-5-pro", resolution) === "1K"
  const pixelBudget = isMinimumBudget
    ? SEEDREAM_TOTAL_PIXEL_BOUNDS.min
    : SEEDREAM_TOTAL_PIXEL_BOUNDS.max
  const round = isMinimumBudget ? Math.ceil : Math.floor
  const exactHeight = Math.sqrt(pixelBudget / targetRatio)

  return {
    height: round(exactHeight),
    width: round(exactHeight * targetRatio),
  }
}

/**
 * Picks the supported model ratio nearest to the physical grid composition.
 */
export function chooseCompositeAspectRatio({
  columns,
  rows,
}: StoryboardLayout): (typeof SUPPORTED_ASPECT_RATIOS)[number]["label"] {
  const targetRatio = (columns * FRAME_WIDTH) / (rows * FRAME_HEIGHT)
  let closest: (typeof SUPPORTED_ASPECT_RATIOS)[number] =
    SUPPORTED_ASPECT_RATIOS[0]
  let closestDistance = Math.abs(closest.value - targetRatio)

  for (const candidate of SUPPORTED_ASPECT_RATIOS.slice(1)) {
    const distance = Math.abs(candidate.value - targetRatio)

    if (distance < closestDistance) {
      closest = candidate
      closestDistance = distance
    }
  }

  return closest.label
}

/**
 * Slices a zero-gap contact sheet into equal cells and normalizes each
 * one into a 640×360 PNG frame, one per requested scene.
 */
export async function normalizeAndSliceComposite(
  composite: Uint8Array,
  layout: StoryboardLayout,
  sceneCount: number
): Promise<Buffer[]> {
  // Decode the contact sheet once and `.clone()` per slice so the source
  // is not re-parsed for every extracted cell.
  const source = sharp(composite)
  const metadata = await source.metadata()

  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error("The generated storyboard has no readable dimensions.")
  }

  const sourceCellWidth = Math.floor(metadata.width / layout.columns)
  const sourceCellHeight = Math.floor(metadata.height / layout.rows)

  if (sourceCellWidth < 1 || sourceCellHeight < 1) {
    throw new Error("The generated storyboard is too small to slice.")
  }

  return Promise.all(
    Array.from({ length: sceneCount }, (_, index) => {
      const column = index % layout.columns
      const row = Math.floor(index / layout.columns)

      return source
        .clone()
        .extract({
          height: sourceCellHeight,
          left: column * sourceCellWidth,
          top: row * sourceCellHeight,
          width: sourceCellWidth,
        })
        .resize(FRAME_WIDTH, FRAME_HEIGHT, { fit: "cover" })
        .png()
        .toBuffer()
    })
  )
}

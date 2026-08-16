import sharp from "sharp"

import { DEPTH_MAP_STYLE_PROMPT } from "@/lib/depth-map-style-settings"
import { type StoryboardLayout } from "@/lib/generation"
import {
  clampResolution,
  type ImageModel,
  type ImageResolution,
} from "@/lib/image-models"
import { type ShotMode } from "@/lib/shot-mode-settings"

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
   * When true, every cell is a clean grayscale linear depth map and free-text
   * / style-image guidance is ignored.
   */
  depthMapStyle?: boolean
  /** Number of input images that define location and set design. */
  environmentImageCount: number
  /** Environment continuity instructions supplied by the user. */
  environmentSheets: string[]
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
  /** Whether the cells are cut shots or moments of one unbroken take. */
  shotMode: ShotMode
  /** Original logline or full story material. */
  storyline: string
  /** Number of trailing input images that define visual treatment. */
  styleImageCount: number
  /** Optional textual description of the desired visual treatment. */
  visualStyle: string
}

interface VisualStyleSectionOptions {
  /**
   * When true, emits the fixed depth-map STYLE LOCK and ignores free-text /
   * style-image guidance.
   */
  depthMapStyle?: boolean
  /** Number of trailing input images that define visual treatment. */
  styleImageCount: number
  /** Optional textual description of the desired visual treatment. */
  visualStyle: string
}

interface SceneImageEditPromptOptions {
  /**
   * When true, preserves/applies the fixed depth-map STYLE LOCK while editing.
   */
  depthMapStyle?: boolean
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
 * How much freedom each shot mode has to restage a supplied location.
 * Continuous and voyeuristic takes need one traversable space, and the
 * voyeuristic vantage also stays hidden; cuts may pick fresh setups.
 */
const ENVIRONMENT_STAGING_DIRECTIONS: Record<ShotMode, string> = {
  continuous:
    "The take moves through one coherent, traversable version of the location: once you establish where its elements sit relative to one another, keep that arrangement self-consistent from cell to cell so the camera's travel reads as physically continuous. Open the take from a vantage point of your own rather than the reference's.",
  "multi-shot":
    "Each cut restages freely — a different part of the location, a different depth relationship, and a different angle in every cell. Two cells set in the same location must never read as the same setup.",
  voyeuristic:
    "The take moves through one coherent, traversable version of the location: once you establish where its elements sit relative to one another, keep that arrangement self-consistent from cell to cell so the camera's travel reads as physically continuous. Every view is watched from concealment outside the action — through a window, a part-open doorway, gaps in blinds or curtains, foliage, a stairwell, or across the street — with foreground elements cropping part of the frame. Choose the hidden vantage yourself rather than adopting the reference's own viewpoint.",
}

/** How adjacent cells relate to one another in each shot mode. */
const SHOT_MODE_SEQUENCE_DIRECTIONS: Record<ShotMode, string> = {
  continuous:
    "The cells are successive moments of ONE unbroken camera take, not separate cut shots. Keep every cell inside the same continuous space and time — consistent geography, light direction, staging, and time of day — and make each framing reachable from the previous one through camera travel or subject blocking. Neighbouring cells still differ, but the difference comes from how far the camera has travelled, never from a new location or a new setup.",
  "multi-shot":
    "The cells are separate cut shots of an edited sequence. Each cell is its own setup and reads as a distinct shot, while the whole sheet keeps coherent geography and production design.",
  voyeuristic:
    "The cells are successive moments of ONE unbroken take filmed by an unseen watcher, not separate cut shots. Keep every cell inside the same continuous space and time — consistent geography, light direction, staging, and time of day — and make each framing reachable from the previous one through camera travel. Every cell is a concealed vantage: the subjects are unaware and never look toward the camera, foreground obstruction crops part of the frame, and long-lens compression flattens the depth. At each location the framing tightens from the wide watching frame to a zoomed-in detail and then widens back out to that wide frame before the camera drifts on to the next vantage, so a location's last cell is always the widened view.",
}

/**
 * Builds one production prompt that maps ordered beats to exact grid cells.
 */
export function buildCompositePrompt({
  characterImageCount,
  characterSheets,
  columns,
  depthMapStyle = false,
  environmentImageCount,
  environmentSheets,
  layoutPlaceholderColumns,
  layoutPlaceholderRows,
  rows,
  scenes,
  shotMode,
  storyline,
  styleImageCount,
  visualStyle,
}: CompositePromptOptions): string {
  const hasLayoutPlaceholder =
    layoutPlaceholderColumns !== undefined &&
    layoutPlaceholderRows !== undefined
  const effectiveStyleImageCount = depthMapStyle ? 0 : styleImageCount
  const effectiveVisualStyle = depthMapStyle ? "" : visualStyle
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
  const hasStyleGuidance = hasVisualStyleGuidance({
    depthMapStyle,
    styleImageCount: effectiveStyleImageCount,
    visualStyle: effectiveVisualStyle,
  })
  const continuity = [
    buildCharacterContinuity(characterImageCount, characterSheets),
    buildEnvironmentContinuity({
      environmentImageCount,
      environmentSheets,
      shotMode,
    }),
  ].join("\n\n")
  const referenceDirections = buildReferenceDirections({
    characterImageCount,
    environmentImageCount,
    layoutDescription: hasLayoutPlaceholder
      ? `Input image 1: LAYOUT GRID REFERENCE — a black ${layoutPlaceholderColumns}×${layoutPlaceholderRows} contact-sheet placeholder with red cell-boundary lines. Reproduce this exact grid structure in the output: match the column and row proportions precisely.`
      : undefined,
    styleImageCount: effectiveStyleImageCount,
  })
  const styleSection = buildVisualStyleSection({
    depthMapStyle,
    styleImageCount: effectiveStyleImageCount,
    visualStyle: effectiveVisualStyle,
  })
  const renderingDirection = depthMapStyle
    ? `STYLE LOCK (hard requirement): ${DEPTH_MAP_STYLE_PROMPT} Every cell is a clean grayscale linear depth map of the staged scene — white nearest, black farthest. Do not invent colour, texture, lighting, shading, outlines, normals, ambient occlusion, or any other surface treatment.`
    : hasStyleGuidance
      ? "STYLE LOCK (hard requirement): Every cell must match the declared visual style exactly — same medium, palette, contrast, lighting language, texture, production design, and image-making treatment. Do not fall back to photoreal live-action, illustration defaults, or any other look. Apply that locked style to this story rather than copying any referenced person, pose, composition, location, or narrative event."
      : "Every cell is photorealistic live-action cinematography — real human skin texture, real fabric and materials, natural depth of field, and the optical character of the camera body and lens named for that cell. Absolutely no illustration, storyboard sketch, pencil or ink drawing, comic art, anime, cel-shading, watercolor, concept-art painting, or 3D cartoon rendering."
  const visualDirection = depthMapStyle
    ? "Each cell follows its bracketed [shot size | camera | lens | movement | lighting] specification as framing and staging guidance only — shot size, camera angle, lens compression, and implied motion shape the depth geometry. Ignore lighting names for illumination; they must not introduce colour or shading. Compose with variety — at most 2 cells on the whole sheet may center the subject; vary blocking, angle, and depth layering between adjacent cells so no two neighbours read the same."
    : hasStyleGuidance
      ? "Coherent production design and strong visual continuity within the locked style. Each cell follows its bracketed [shot size | camera | lens | movement | lighting] specification as framing and staging guidance interpreted through the locked medium — not as a mandate for photoreal optics. Compose with variety — at most 2 cells on the whole sheet may center the subject; vary blocking, angle, and depth layering between adjacent cells so no two neighbours read the same."
      : "Premium cinematic previsualization with coherent production design and strong visual continuity. Each cell follows its bracketed [shot size | camera | lens | movement | lighting] specification: frame the subject at the stated shot size, render the lens's field of view and compression, imply the movement through motion blur or composition energy, and light the cell with the stated condition. Compose with variety — at most 2 cells on the whole sheet may center the subject; vary blocking, angle, and depth layering between adjacent cells so no two neighbours read the same."

  const layoutReferenceInstruction = hasLayoutPlaceholder
    ? `- Input image 1 is the LAYOUT REFERENCE. Fill this exact ${layoutPlaceholderColumns}×${layoutPlaceholderRows} grid precisely — the red lines mark every cell boundary. Use the proportions from that image without deviation.`
    : ""

  const orderedCellsGuidance = depthMapStyle
    ? "Bracketed [shot | camera | lens | movement | lighting] values are invisible camera instructions for framing and staging only. Apply them to composition and depth geometry; never render them (or any abbreviation of them) as typography on any cell. Do not interpret lighting names as illumination, colour, or shading."
    : "Bracketed [shot | camera | lens | movement | lighting] values are invisible camera instructions for framing, optics, and light only. Apply them to composition and atmosphere; never render them (or any abbreviation of them) as typography on any cell."

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

SEQUENCE CONTINUITY:
${SHOT_MODE_SEQUENCE_DIRECTIONS[shotMode]}

REFERENCE IMAGE MAP:
${referenceDirections}

STORYLINE:
${storyline}

CONTINUITY:
${continuity}

ORDERED CELLS:
${orderedCellsGuidance}
${sceneList}`
}

/**
 * Combines an editor instruction with the mandatory single-frame composition
 * constraints before sending it to the selected edit model.
 */
export function buildSceneImageEditPrompt({
  depthMapStyle = false,
  instruction,
  visualStyle,
}: SceneImageEditPromptOptions): string {
  const styleSection = buildVisualStyleSection({
    depthMapStyle,
    styleImageCount: 0,
    visualStyle: depthMapStyle ? "" : visualStyle,
  })
  const styleLock =
    styleSection === ""
      ? "Preserve the existing frame's visual language while applying the edit."
      : depthMapStyle
        ? `${styleSection}

STYLE LOCK (hard requirement): Preserve and apply this depth-map treatment while editing. Keep the result a clean grayscale linear depth map — white nearest, black farthest. Do not introduce colour, texture, lighting, shading, outlines, normals, or ambient occlusion.`
        : `${styleSection}

STYLE LOCK (hard requirement): Preserve and apply this visual style while editing. Do not drift toward a different medium, palette, or image-making treatment.`

  return `${SCENE_IMAGE_EDIT_SYSTEM_PROMPT}

${styleLock}

EDIT INSTRUCTION:
${instruction}`
}

/**
 * Whether textual style, style images, depth-map mode, or a combination
 * provide visual-style guidance.
 */
export function hasVisualStyleGuidance({
  depthMapStyle = false,
  styleImageCount,
  visualStyle,
}: VisualStyleSectionOptions): boolean {
  return depthMapStyle || styleImageCount > 0 || visualStyle.trim() !== ""
}

/**
 * Shared visual-style block for composite generation and scene editing.
 */
export function buildVisualStyleSection({
  depthMapStyle = false,
  styleImageCount,
  visualStyle,
}: VisualStyleSectionOptions): string {
  if (depthMapStyle) {
    return [
      "VISUAL STYLE (hard requirement):",
      `Written style: ${DEPTH_MAP_STYLE_PROMPT}`,
      "This style overrides any default photoreal live-action look. Do not invent a different medium.",
    ].join("\n")
  }

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
 * Character identity guidance for the CONTINUITY block. Falls back to
 * inferring appearances when the board supplies no character material.
 */
function buildCharacterContinuity(
  characterImageCount: number,
  characterSheets: string[]
): string {
  if (characterImageCount === 0 && characterSheets.length === 0) {
    return "Infer consistent character appearances and wardrobe from the storyline and keep them identical in every cell."
  }

  const sheets =
    characterSheets.length === 0
      ? ""
      : `\n\nCharacter identities use @handle form (e.g. @XYZ) in the storyline and sheets; keep each @handle visually consistent across every cell. Never draw @handles as readable text on any cell.\n\nWritten character sheets:\n${characterSheets.join(
          "\n\n---\n\n"
        )}`

  return `Maintain the supplied character designs exactly across every frame. Re-assert each character's identity inside every cell they appear in — same face, hair, wardrobe, and silhouette.${sheets}`
}

interface EnvironmentContinuityOptions {
  /** Number of input images that define location and set design. */
  environmentImageCount: number
  /** Environment continuity instructions supplied by the user. */
  environmentSheets: string[]
  /** Whether the cells are cut shots or moments of one unbroken take. */
  shotMode: ShotMode
}

/**
 * Location and set-design guidance for the CONTINUITY block. Falls back to
 * inferring settings when the board supplies no environment material.
 *
 * Reference images document what a place is, never a framing to reproduce, so
 * the staging freedom comes from {@link ENVIRONMENT_STAGING_DIRECTIONS}.
 */
function buildEnvironmentContinuity({
  environmentImageCount,
  environmentSheets,
  shotMode,
}: EnvironmentContinuityOptions): string {
  if (environmentImageCount === 0 && environmentSheets.length === 0) {
    return "Infer the settings from the storyline and keep each recurring location's architecture, set dressing, and geography identical every time it appears."
  }

  const sheets =
    environmentSheets.length === 0
      ? ""
      : `\n\nLocations use @handle form (e.g. @XYZ) in the storyline and sheets; every cell set in a given @handle shares that location's architecture, materials, and set dressing. Never draw @handles as readable text on any cell.\n\nWritten environment sheets:\n${environmentSheets.join(
          "\n\n---\n\n"
        )}`

  return `Each location is recognizably the same place in every cell set there — same architecture, materials, set dressing, period, and scale. Never reproduce a reference image's own composition: no cell may repeat the reference's vantage point, cropping, or the placement and arrangement of buildings and set pieces as they appear in it. Treat the references as documentation of the place, then stage fresh views of it. ${ENVIRONMENT_STAGING_DIRECTIONS[shotMode]}${sheets}`
}

/** One group of model input images sharing a single role. */
interface ReferenceImageGroup {
  /** How many consecutive input images the group occupies. */
  count: number
  /** Role instruction, receiving the formatted input-image range. */
  describe: (range: string) => string
}

interface ReferenceDirectionsOptions {
  /** Number of character reference images. */
  characterImageCount: number
  /** Number of environment reference images. */
  environmentImageCount: number
  /**
   * When the layout placeholder is input image 1, its pre-formatted
   * description, so every following index is shifted correctly.
   */
  layoutDescription?: string
  /** Number of visual-style reference images. */
  styleImageCount: number
}

/**
 * Maps ordered model input images to their distinct roles.
 *
 * Groups are emitted in the same order the caller concatenates the images —
 * characters, environments, then styles — so the stated slot numbers always
 * match the actual `prompt.images` array.
 */
function buildReferenceDirections({
  characterImageCount,
  environmentImageCount,
  layoutDescription,
  styleImageCount,
}: ReferenceDirectionsOptions): string {
  const groups: ReferenceImageGroup[] = [
    {
      count: characterImageCount,
      describe: (range) =>
        `${range}: CHARACTER REFERENCES. Use only for face, hair, body, wardrobe, and silhouette continuity. Do not inherit their composition, background, or visual style.`,
    },
    {
      count: environmentImageCount,
      describe: (range) =>
        `${range}: ENVIRONMENT REFERENCES. They identify what the location is — architecture, materials, set dressing, period, and scale. They are design references, not framings to reproduce: do not copy their composition, camera framing, cropping, vantage point, or the exact placement and arrangement of buildings and set pieces. Do not inherit their people, wardrobe, weather, time of day, or visual style. Stage every cell as its own view of that place.`,
    },
    {
      count: styleImageCount,
      describe: (range) =>
        `${range}: VISUAL STYLE REFERENCES. Lock every cell to the style of ${styleImageCount === 1 ? "this attached image" : "these attached images"} — use only for medium, palette, lighting, texture, production design, and cinematic treatment. Do not copy people, wardrobe, poses, locations, compositions, or story content from them.`,
    },
  ]
  const hasUserImages = groups.some((group) => group.count > 0)

  if (layoutDescription === undefined && !hasUserImages) {
    return "No reference images were supplied."
  }

  const directions =
    layoutDescription === undefined ? [] : [layoutDescription]
  // Layout placeholder occupies slot 1 when present; user images follow.
  let slot = layoutDescription === undefined ? 0 : 1

  for (const { count, describe } of groups) {
    if (count === 0) {
      continue
    }

    const first = slot + 1
    const last = slot + count

    directions.push(
      describe(
        count === 1 ? `Input image ${first}` : `Input images ${first}–${last}`
      )
    )
    slot = last
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

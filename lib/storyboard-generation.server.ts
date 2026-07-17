import sharp from "sharp"

import { STORYBOARD_CELL_GAP, type StoryboardLayout } from "@/lib/generation"

/** Width of every normalized storyboard frame in pixels. */
const FRAME_WIDTH = 640

/** Height of every normalized storyboard frame in pixels. */
const FRAME_HEIGHT = 360

/** Aspect ratios accepted by Nano Banana Lite. */
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
  { label: "4:1", value: 4 },
  { label: "8:1", value: 8 },
] as const

interface CompositePromptOptions {
  /** Character continuity instructions supplied by the user. */
  characterSheets: string[]
  /** Number of cells across the composite. */
  columns: number
  /** Number of cell rows in the composite. */
  rows: number
  /** Ordered visual beats assigned to grid cells. */
  scenes: Array<{
    action: string
    dialogue: string
    shot: string
  }>
  /** Original logline or full story material. */
  storyline: string
}

/**
 * Builds one production prompt that maps ordered beats to exact grid cells.
 */
export function buildCompositePrompt({
  characterSheets,
  columns,
  rows,
  scenes,
  storyline,
}: CompositePromptOptions): string {
  const sceneList = scenes
    .map(
      (scene, index) =>
        `${index + 1}. [${scene.shot}] ${scene.action}${
          scene.dialogue === "" ? "" : ` Dialogue context: ${scene.dialogue}`
        }`
    )
    .join("\n")
  const emptyCellCount = rows * columns - scenes.length
  const continuity =
    characterSheets.length === 0
      ? "Infer consistent character appearances and wardrobe from the storyline."
      : `Maintain these character designs exactly across every frame:\n${characterSheets.join(
          "\n\n---\n\n"
        )}`

  return `Create ONE finished cinematic storyboard contact sheet, not separate images.

GRID SPECIFICATION:
- Exactly ${columns} columns by ${rows} rows.
- Read left-to-right, then top-to-bottom.
- Every cell has the same dimensions and a cinematic 16:9 composition.
- Separate adjacent cells with exactly ${STORYBOARD_CELL_GAP}px solid black lines.
- No outer border, captions, labels, scene numbers, text, watermarks, or margins.
- Keep each shot entirely inside its own cell. Never blend imagery across separators.
${emptyCellCount > 0 ? `- Leave the final ${emptyCellCount} unused cell${emptyCellCount === 1 ? "" : "s"} solid black.` : ""}

VISUAL DIRECTION:
Premium live-action film previsualization, coherent production design, realistic lighting, intentional lens language, rich cinematic contrast, and strong visual continuity. Each cell must be immediately readable as a distinct story beat.

STORYLINE:
${storyline}

CONTINUITY:
${continuity}

ORDERED CELLS:
${sceneList}`
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
 * Normalizes a received contact sheet into equal 16:9 cells separated by
 * exact 1px gaps, then extracts one PNG per requested scene.
 */
export async function normalizeAndSliceComposite(
  composite: Uint8Array,
  layout: StoryboardLayout,
  sceneCount: number
): Promise<Buffer[]> {
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

  const normalizedFrames = await Promise.all(
    Array.from({ length: layout.columns * layout.rows }, async (_, index) => {
      const column = index % layout.columns
      const row = Math.floor(index / layout.columns)

      return sharp(composite)
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
  const normalizedWidth =
    layout.columns * FRAME_WIDTH + (layout.columns - 1) * STORYBOARD_CELL_GAP
  const normalizedHeight =
    layout.rows * FRAME_HEIGHT + (layout.rows - 1) * STORYBOARD_CELL_GAP
  const normalizedComposite = await sharp({
    create: {
      background: "#000000",
      channels: 4,
      height: normalizedHeight,
      width: normalizedWidth,
    },
  })
    .composite(
      normalizedFrames.map((input, index) => ({
        input,
        left: (index % layout.columns) * (FRAME_WIDTH + STORYBOARD_CELL_GAP),
        top:
          Math.floor(index / layout.columns) *
          (FRAME_HEIGHT + STORYBOARD_CELL_GAP),
      }))
    )
    .png()
    .toBuffer()

  return Promise.all(
    Array.from({ length: sceneCount }, (_, index) => {
      const column = index % layout.columns
      const row = Math.floor(index / layout.columns)

      return sharp(normalizedComposite)
        .extract({
          height: FRAME_HEIGHT,
          left: column * (FRAME_WIDTH + STORYBOARD_CELL_GAP),
          top: row * (FRAME_HEIGHT + STORYBOARD_CELL_GAP),
          width: FRAME_WIDTH,
        })
        .png()
        .toBuffer()
    })
  )
}

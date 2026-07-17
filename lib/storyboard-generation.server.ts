import sharp from "sharp"

import { type StoryboardLayout } from "@/lib/generation"

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
  /** Number of leading input images that define character identity. */
  characterImageCount: number
  /** Character continuity instructions supplied by the user. */
  characterSheets: string[]
  /** Number of cells across the composite. */
  columns: number
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
}

/**
 * Non-negotiable composition rules prepended to every single-frame edit.
 * Nano Banana receives this as part of its image-editing prompt.
 */
const SCENE_IMAGE_EDIT_SYSTEM_PROMPT = `Edit the supplied storyboard frame while preserving its cinematic visual language.

OUTPUT REQUIREMENTS (hard requirements):
- Return exactly one cinematic 16:9 frame.
- Keep the edited shot fully contained within the frame.
- No text, typography, shot numbers, labels, captions, titles, subtitles, watermarks, borders, or UI chrome.`

/**
 * Builds one production prompt that maps ordered beats to exact grid cells.
 */
export function buildCompositePrompt({
  characterImageCount,
  characterSheets,
  columns,
  rows,
  scenes,
  storyline,
  styleImageCount,
}: CompositePromptOptions): string {
  const sceneList = scenes
    .map(
      (scene, index) =>
        `${index + 1}. [${scene.shot} | ${scene.camera} | ${scene.lens} | ${scene.movement} | ${scene.lighting}] ${scene.action}${
          scene.dialogue === "" ? "" : ` Dialogue context: ${scene.dialogue}`
        }`
    )
    .join("\n")
  const emptyCellCount = rows * columns - scenes.length
  const hasCharacterReferences =
    characterImageCount > 0 || characterSheets.length > 0
  const continuity = !hasCharacterReferences
    ? "Infer consistent character appearances and wardrobe from the storyline and keep them identical in every cell."
    : `Maintain the supplied character designs exactly across every frame. Re-assert each character's identity inside every cell they appear in — same face, hair, wardrobe, and silhouette.${
        characterSheets.length === 0
          ? ""
          : `\n\nCharacter identities use @handle form (e.g. @XYZ) in the storyline and sheets; keep each @handle visually consistent across every cell.\n\nWritten character sheets:\n${characterSheets.join(
              "\n\n---\n\n"
            )}`
      }`
  const referenceDirections = buildReferenceDirections(
    characterImageCount,
    styleImageCount
  )
  const renderingDirection =
    styleImageCount === 0
      ? "Every cell is photorealistic live-action cinematography — real human skin texture, real fabric and materials, natural depth of field, and the optical character of the camera body and lens named for that cell. Absolutely no illustration, storyboard sketch, pencil or ink drawing, comic art, anime, cel-shading, watercolor, concept-art painting, or 3D cartoon rendering."
      : "Lock the style of every cell by referring to the style of the attached visual-style image(s): preserve their medium, palette, contrast, lighting language, texture, production design, and image-making treatment across the entire sheet. Apply that locked style to this story rather than copying any referenced person, pose, composition, location, or narrative event."

  return `Create ONE finished cinematic storyboard contact sheet, not separate images.

GRID SPECIFICATION:
- Exactly ${columns} columns by ${rows} rows.
- Read left-to-right, then top-to-bottom.
- Every cell has the same dimensions and a cinematic 16:9 composition.
- Cells are rendered edge-to-edge with ZERO gap: no separator lines, no borders, no gutters, no margins, no frames anywhere on the sheet.
- Keep each shot fully contained in its own cell with a clean hard boundary between adjacent shots. Never blend imagery across cell boundaries.
${emptyCellCount > 0 ? `- Leave the final ${emptyCellCount} unused cell${emptyCellCount === 1 ? "" : "s"} solid black.` : ""}

RENDERING (hard requirement):
${renderingDirection}

CONTAINMENT (hard requirement):
Absolutely no text anywhere on the sheet — no shot numbers, labels, captions, titles, subtitles, borders, watermarks, or UI chrome. Pure imagery only.

VISUAL DIRECTION:
Premium cinematic previsualization with coherent production design and strong visual continuity. Each cell follows its bracketed [shot size | camera | lens | movement | lighting] specification: frame the subject at the stated shot size, render the lens's field of view and compression, imply the movement through motion blur or composition energy, and light the cell with the stated condition. Compose with variety — at most 2 cells on the whole sheet may center the subject; vary blocking, angle, and depth layering between adjacent cells so no two neighbours read the same.

REFERENCE IMAGE MAP:
${referenceDirections}

STORYLINE:
${storyline}

CONTINUITY:
${continuity}

ORDERED CELLS:
${sceneList}`
}

/**
 * Combines an editor instruction with the mandatory single-frame composition
 * constraints before sending it to Nano Banana.
 */
export function buildSceneImageEditPrompt(instruction: string): string {
  return `${SCENE_IMAGE_EDIT_SYSTEM_PROMPT}

EDIT INSTRUCTION:
${instruction}`
}

/** Maps ordered model input images to their distinct continuity and style roles. */
function buildReferenceDirections(
  characterImageCount: number,
  styleImageCount: number
): string {
  if (characterImageCount === 0 && styleImageCount === 0) {
    return "No reference images were supplied."
  }

  const directions: string[] = []

  if (characterImageCount > 0) {
    const characterImageRange =
      characterImageCount === 1
        ? "Input image 1"
        : `Input images 1–${characterImageCount}`

    directions.push(
      `${characterImageRange}: CHARACTER REFERENCES. Use only for face, hair, body, wardrobe, and silhouette continuity. Do not inherit their composition, background, or visual style.`
    )
  }

  if (styleImageCount > 0) {
    const firstStyleImage = characterImageCount + 1
    const lastStyleImage = characterImageCount + styleImageCount
    const styleImageRange =
      styleImageCount === 1
        ? `Input image ${firstStyleImage}`
        : `Input images ${firstStyleImage}–${lastStyleImage}`

    directions.push(
      `${styleImageRange}: VISUAL STYLE REFERENCES. Lock every cell to the style of ${styleImageCount === 1 ? "this attached image" : "these attached images"} — use only for medium, palette, lighting, texture, production design, and cinematic treatment. Do not copy people, wardrobe, poses, locations, compositions, or story content from them.`
    )
  }

  return directions.join("\n")
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

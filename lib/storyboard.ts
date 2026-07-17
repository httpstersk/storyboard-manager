/**
 * Domain model, option catalogues, and seed data for the storyboard studio.
 *
 * All values that appear in more than one place (cameras, lenses, grid
 * limits, and so on) live here so components never hardcode them.
 */

/** A storyboard: an ordered list of scenes with a title. */
export interface Board {
  /** Stable identifier for the board. */
  id: string
  /** Scenes of the board, in order. */
  scenes: Scene[]
  /** Display title of the board. */
  title: string
  /** Epoch milliseconds of the last edit. */
  updatedAt: number
}

/** Generated metadata used to populate a new storyboard scene. */
export interface GeneratedBoardScene {
  /** Visual action planned for the frame. */
  action: string
  /** Planned camera body. */
  camera: string
  /** Essential dialogue context, empty when the scene is silent. */
  dialogue: string
  /** Generated frame encoded as an image data URL. */
  image: string
  /** Planned lens. */
  lens: string
  /** Planned lighting condition. */
  lighting: string
  /** Planned camera movement. */
  movement: string
  /** Planned shot size. */
  shot: ShotSize
  /** Planned scene duration in seconds. */
  timeSeconds: number
}

/** A single storyboard scene and all of its editable parameters. */
export interface Scene {
  /** What happens on screen during the scene. */
  action: string
  /** Camera body used for the scene. */
  camera: string
  /** Spoken dialogue, empty when the scene is silent. */
  dialogue: string
  /** Stable identifier for the scene. */
  id: string
  /** Data URL of an uploaded reference image, if any. */
  image?: string
  /** Lens mounted for the scene. */
  lens: string
  /** Lighting condition of the scene. */
  lighting: string
  /** Camera movement during the scene. */
  movement: string
  /** Music or sound design note for the scene. */
  music: string
  /** Animated shader preset rendered behind the scene numeral. */
  shader: SceneShaderPreset
  /** Shot size of the scene. */
  shot: ShotSize
  /** Duration of the scene in seconds. */
  timeSeconds: number
}

/** Parameters for the mesh gradient rendered in a scene thumbnail. */
export interface SceneShaderPreset {
  /** Colour spots (up to 10). */
  colors: string[]
  /** Organic noise distortion power, 0 to 1. */
  distortion: number
  /** Grain distortion on shape edges, 0 to 1. */
  grainMixer: number
  /** Post-processing b/w grain overlay, 0 to 1. */
  grainOverlay: number
  /** Horizontal offset of the gradient centre, -1 to 1. */
  offsetX: number
  /** Vertical offset of the gradient centre, -1 to 1. */
  offsetY: number
  /** Overall zoom level, 0.01 to 4. */
  scale: number
  /** Animation speed multiplier. */
  speed: number
  /** Vortex distortion power, 0 to 1. */
  swirl: number
}

/** A generic labelled option for select-style controls. */
export interface SelectOption {
  /** Text shown to the user. */
  label: string
  /** Value stored on the scene. */
  value: string
}

/** Shot sizes supported by the shot segmented control. */
export type ShotSize = "CU" | "MCU" | "MS" | "WS"

/** Inclusive numeric range used to clamp user input. */
export interface ValueLimits {
  /** Largest allowed value. */
  max: number
  /** Smallest allowed value. */
  min: number
}

/** Camera bodies available in the camera select. */
export const CAMERA_OPTIONS: SelectOption[] = [
  { label: "Alexa 35", value: "Alexa 35" },
  { label: "RED Komodo-X", value: "RED Komodo-X" },
  { label: "Sony Venice 2", value: "Sony Venice 2" },
]

/** Allowed range for the grid column stepper. */
export const COLUMN_LIMITS: ValueLimits = { max: 4, min: 1 }

/** Lenses available in the lens select. */
export const LENS_OPTIONS: SelectOption[] = [
  { label: "Cooke S7 50mm", value: "Cooke S7 50mm" },
  { label: "Cooke S7 75mm", value: "Cooke S7 75mm" },
  { label: "Signature 18mm", value: "Signature 18mm" },
  { label: "Signature 21mm", value: "Signature 21mm" },
  { label: "Signature 40mm", value: "Signature 40mm" },
  { label: "Signature 75mm", value: "Signature 75mm" },
  { label: "Zeiss Supreme 29mm", value: "Zeiss Supreme 29mm" },
  { label: "Zeiss Supreme 50mm", value: "Zeiss Supreme 50mm" },
]

/** Lighting conditions available in the lighting select. */
export const LIGHTING_OPTIONS: SelectOption[] = [
  { label: "Blue hour", value: "Blue hour" },
  { label: "Golden hour", value: "Golden hour" },
  { label: "Hard noon sun", value: "Hard noon sun" },
  { label: "Night, moonlit", value: "Night, moonlit" },
  { label: "Overcast soft", value: "Overcast soft" },
  { label: "Practical neon", value: "Practical neon" },
  { label: "Sodium vapor", value: "Sodium vapor" },
]

/** Camera movements available in the movement select. */
export const MOVEMENT_OPTIONS: SelectOption[] = [
  { label: "Crane up", value: "Crane up" },
  { label: "Dolly in", value: "Dolly in" },
  { label: "Drone pull-back", value: "Drone pull-back" },
  { label: "Handheld", value: "Handheld" },
  { label: "Static", value: "Static" },
  { label: "Steadicam", value: "Steadicam" },
]

/** Allowed range for the grid row stepper. */
export const ROW_LIMITS: ValueLimits = { max: 9, min: 1 }

/** Rows shown when a workspace first loads. Kept modest (well below
 * {@link ROW_LIMITS.max}) so a fresh board opens compact rather than
 * filling every available row. */
export const DEFAULT_ROWS = 2

/** Allowed range for a scene duration in seconds. */
export const SCENE_TIME_LIMITS: ValueLimits = { max: 60, min: 1 }

/** Shot sizes shown by the shot segmented control, widest first. */
export const SHOT_SIZE_OPTIONS: { label: string; value: ShotSize }[] = [
  { label: "Wide shot", value: "WS" },
  { label: "Medium shot", value: "MS" },
  { label: "Medium close-up", value: "MCU" },
  { label: "Close-up", value: "CU" },
]

/** Cinematic mesh gradient presets with opposing-spectrum colour pairs. */
const BLANK_SCENE_SHADERS: SceneShaderPreset[] = [
  {
    colors: ["#0a4f5c", "#e85d20", "#064e6b", "#ff8c42"],
    distortion: 0.6,
    grainMixer: 0.15,
    grainOverlay: 0.08,
    offsetX: 0.3,
    offsetY: -0.2,
    scale: 1.2,
    speed: 0.35,
    swirl: 0.2,
  },
  {
    colors: ["#6b21a8", "#d4e500", "#4c1d95", "#a3e635"],
    distortion: 0.7,
    grainMixer: 0.12,
    grainOverlay: 0.1,
    offsetX: -0.15,
    offsetY: 0.4,
    scale: 1.0,
    speed: 0.4,
    swirl: 0.15,
  },
  {
    colors: ["#be123c", "#06b6d4", "#9f1239", "#22d3ee"],
    distortion: 0.55,
    grainMixer: 0.18,
    grainOverlay: 0.06,
    offsetX: 0.2,
    offsetY: -0.6,
    scale: 1.4,
    speed: 0.3,
    swirl: 0.25,
  },
  {
    colors: ["#ea580c", "#2563eb", "#c2410c", "#3b82f6"],
    distortion: 0.65,
    grainMixer: 0.1,
    grainOverlay: 0.12,
    offsetX: -0.4,
    offsetY: 0.1,
    scale: 1.1,
    speed: 0.45,
    swirl: 0.18,
  },
  {
    colors: ["#0891b2", "#f43f5e", "#0e7490", "#fb7185"],
    distortion: 0.5,
    grainMixer: 0.2,
    grainOverlay: 0.07,
    offsetX: 0.5,
    offsetY: 0.3,
    scale: 1.3,
    speed: 0.35,
    swirl: 0.22,
  },
  {
    colors: ["#ca8a04", "#7c3aed", "#a16207", "#8b5cf6"],
    distortion: 0.72,
    grainMixer: 0.14,
    grainOverlay: 0.09,
    offsetX: -0.25,
    offsetY: -0.45,
    scale: 0.9,
    speed: 0.5,
    swirl: 0.12,
  },
  {
    colors: ["#e11d48", "#10b981", "#be123c", "#34d399"],
    distortion: 0.58,
    grainMixer: 0.16,
    grainOverlay: 0.11,
    offsetX: 0.35,
    offsetY: 0.55,
    scale: 1.15,
    speed: 0.38,
    swirl: 0.28,
  },
  {
    colors: ["#059669", "#dc2626", "#047857", "#ef4444"],
    distortion: 0.62,
    grainMixer: 0.13,
    grainOverlay: 0.08,
    offsetX: -0.1,
    offsetY: -0.7,
    scale: 1.25,
    speed: 0.42,
    swirl: 0.2,
  },
]

/**
 * Number of blank scenes a new board starts with: enough to fill the
 * largest possible grid (COLUMN_LIMITS.max x ROW_LIMITS.max), so every
 * row and column the user can select always has a scene to display.
 */
const NEW_BOARD_SCENE_COUNT = COLUMN_LIMITS.max * ROW_LIMITS.max

/** Title given to boards created without an explicit name. */
export const UNTITLED_BOARD_TITLE = "Untitled board"

/**
 * Returns the blank-scene mesh gradient preset for the given scene index.
 */
export function shaderPresetForIndex(index: number): SceneShaderPreset {
  return BLANK_SCENE_SHADERS[index % BLANK_SCENE_SHADERS.length]
}

/**
 * Creates a blank scene with neutral defaults and a shader preset
 * cycled by scene index.
 */
function createBlankScene(index: number): Scene {
  return {
    action: "",
    camera: CAMERA_OPTIONS[0].value,
    dialogue: "",
    id: `scene-${formatSceneNumber(index)}`,
    lens: LENS_OPTIONS[0].value,
    lighting: "Overcast soft",
    movement: "Static",
    music: "",
    shader: shaderPresetForIndex(index),
    shot: "WS",
    timeSeconds: 3,
  }
}

/**
 * Creates a board pre-filled with {@link NEW_BOARD_SCENE_COUNT} blank
 * scenes.
 */
export function createBlankBoard(id: string, title: string): Board {
  return {
    id,
    scenes: Array.from({ length: NEW_BOARD_SCENE_COUNT }, (unused, index) =>
      createBlankScene(index)
    ),
    title,
    updatedAt: Date.now(),
  }
}

/**
 * Creates a full-capacity board populated with generated scenes at the start.
 */
export function createGeneratedBoard(
  id: string,
  scenes: GeneratedBoardScene[],
  title: string
): Board {
  const board = createBlankBoard(id, title)

  return {
    ...board,
    scenes: board.scenes.map((scene, index) => {
      const generatedScene = scenes[index]

      return generatedScene === undefined
        ? scene
        : { ...scene, ...generatedScene }
    }),
  }
}

/**
 * Picks the next free "Untitled board" title, counting up from the
 * existing board titles: "Untitled board", "Untitled board 2", ...
 */
export function nextUntitledBoardTitle(boards: Board[]): string {
  const titles = new Set(boards.map((board) => board.title))

  if (!titles.has(UNTITLED_BOARD_TITLE)) {
    return UNTITLED_BOARD_TITLE
  }

  let counter = 2

  while (titles.has(`${UNTITLED_BOARD_TITLE} ${counter}`)) {
    counter += 1
  }

  return `${UNTITLED_BOARD_TITLE} ${counter}`
}

/**
 * Formats the time since the given epoch-milliseconds edit as a short
 * relative label, for example "edited now" or "2d ago".
 */
export function formatEditedAt(updatedAt: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000))

  if (seconds < 60) {
    return "edited now"
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)

  if (days < 7) {
    return `${days}d ago`
  }

  return `${Math.floor(days / 7)}w ago`
}

/**
 * Formats a zero-based scene index as a two-digit label, for example "01".
 */
export function formatSceneNumber(index: number): string {
  return String(index + 1).padStart(2, "0")
}

/**
 * Formats a duration in seconds as "m:ss", for example "0:42".
 */
export function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/**
 * Sums the duration of the given scenes in seconds.
 */
export function totalRuntimeSeconds(scenes: Scene[]): number {
  return scenes.reduce((total, scene) => total + scene.timeSeconds, 0)
}

/**
 * Domain model, option catalogues, and seed data for the storyboard manager.
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

/** Parameters for the animated swirl rendered in a scene thumbnail. */
export interface SceneShaderPreset {
  /** Number of colour bands in the swirl. */
  bandCount: number
  /** Stripe colours blended by the swirl. */
  colors: string[]
  /** Horizontal offset of the swirl centre, -1 to 1. */
  offsetX: number
  /** Vertical offset of the swirl centre, -1 to 1. */
  offsetY: number
  /** Colour transition softness, 0 hard to 1 smooth. */
  softness: number
  /** Animation speed multiplier. */
  speed: number
  /** Vortex strength, 0 straight to 1 fully twisted. */
  twist: number
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
export const ROW_LIMITS: ValueLimits = { max: 2, min: 1 }

/** Allowed range for a scene duration in seconds. */
export const SCENE_TIME_LIMITS: ValueLimits = { max: 60, min: 1 }

/** Shot sizes shown by the shot segmented control, widest first. */
export const SHOT_SIZE_OPTIONS: { label: string; value: ShotSize }[] = [
  { label: "Wide shot", value: "WS" },
  { label: "Medium shot", value: "MS" },
  { label: "Medium close-up", value: "MCU" },
  { label: "Close-up", value: "CU" },
]

const SHADER_PRESET_DEFAULTS = {
  bandCount: 3,
  softness: 0.9,
  speed: 0.5,
  twist: 0.35,
} satisfies Partial<SceneShaderPreset>

/** Shader palettes cycled through the scenes of a blank board. */
const BLANK_SCENE_SHADERS: Pick<
  SceneShaderPreset,
  "colors" | "offsetX" | "offsetY"
>[] = [
  { colors: ["#ff3d9a", "#ffd93d", "#f72585"], offsetX: 0.4, offsetY: -0.3 },
  {
    colors: ["#5edf3c", "#7636ff", "#f2ff05", "#0037ff"],
    offsetX: 0.1,
    offsetY: -0.35,
  },
  {
    colors: ["#90c8cf", "#3d3a6b", "#012afc", "#1b6dd9"],
    offsetX: 0.2,
    offsetY: 0.8,
  },
  {
    colors: ["#4e0149", "#058d92", "#7657f0", "#79eb0b"],
    offsetX: -0.05,
    offsetY: -0.9,
  },
  {
    colors: ["#e63412", "#ffb703", "#ff4400", "#8b0045"],
    offsetX: 0.4,
    offsetY: 0.15,
  },
  {
    colors: ["#76d3f5", "#b569ff", "#7dd3fc", "#e0aaff"],
    offsetX: 0.4,
    offsetY: 0.25,
  },
  {
    colors: ["#e3408a", "#edbd55", "#d4876e", "#a34d7a"],
    offsetX: 0.4,
    offsetY: 0.05,
  },
  {
    colors: ["#ff0040", "#00ff88", "#ffe600", "#ff00d5"],
    offsetX: 0.4,
    offsetY: -0.9,
  },
]

/** Number of blank scenes a new board starts with (a full grid). */
export const NEW_BOARD_SCENE_COUNT = COLUMN_LIMITS.max * ROW_LIMITS.max

/** Title given to boards created without an explicit name. */
export const UNTITLED_BOARD_TITLE = "Untitled board"

/**
 * Creates a blank scene with neutral defaults and a shader preset
 * cycled by scene index.
 */
export function createBlankScene(index: number): Scene {
  return {
    action: "",
    camera: CAMERA_OPTIONS[0].value,
    dialogue: "",
    id: `scene-${formatSceneNumber(index)}`,
    lens: LENS_OPTIONS[0].value,
    lighting: "Overcast soft",
    movement: "Static",
    music: "",
    shader: {
      ...SHADER_PRESET_DEFAULTS,
      ...BLANK_SCENE_SHADERS[index % BLANK_SCENE_SHADERS.length],
    },
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

/**
 * Domain model, option catalogues, and seed data for the storyboard manager.
 *
 * All values that appear in more than one place (cameras, lenses, grid
 * limits, and so on) live here so components never hardcode them.
 */

/** Summary of a storyboard shown in the sidebar board list. */
export interface BoardSummary {
  /** Human-readable relative edit time, for example "2d ago". */
  editedAt: string
  /** Stable identifier for the board. */
  id: string
  /** Total runtime of the board in seconds. */
  runtimeSeconds: number
  /** Number of scenes in the board. */
  sceneCount: number
  /** Display title of the board. */
  title: string
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
  /** Object URL of an uploaded reference image, if any. */
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

/** Boards listed in the sidebar, most recently edited first. */
export const RECENT_BOARDS: BoardSummary[] = [
  {
    editedAt: "edited now",
    id: "the-phone-booth",
    runtimeSeconds: 42,
    sceneCount: 8,
    title: "The Phone Booth",
  },
  {
    editedAt: "2d ago",
    id: "night-market-chase",
    runtimeSeconds: 64,
    sceneCount: 12,
    title: "Night Market Chase",
  },
  {
    editedAt: "5d ago",
    id: "rooftop-finale",
    runtimeSeconds: 31,
    sceneCount: 6,
    title: "Rooftop Finale",
  },
  {
    editedAt: "1w ago",
    id: "desert-opening",
    runtimeSeconds: 58,
    sceneCount: 9,
    title: "Desert Opening",
  },
  {
    editedAt: "2w ago",
    id: "client-cut-v2",
    runtimeSeconds: 82,
    sceneCount: 14,
    title: "Client Cut v2",
  },
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

/** Seed scenes for "The Phone Booth" storyboard. */
export const PHONE_BOOTH_SCENES: Scene[] = [
  {
    action: "Mara crosses the empty parking lot",
    camera: "Alexa 35",
    dialogue: "",
    id: "scene-01",
    lens: "Signature 21mm",
    lighting: "Golden hour",
    movement: "Static",
    music: "Low synth drone",
    shader: {
      ...SHADER_PRESET_DEFAULTS,
      colors: ["#ff3d9a", "#ffd93d", "#f72585"],
      offsetX: 0.4,
      offsetY: -0.3,
    },
    shot: "WS",
    timeSeconds: 4,
  },
  {
    action: "She stops at the phone booth",
    camera: "Alexa 35",
    dialogue: "",
    id: "scene-02",
    lens: "Signature 40mm",
    lighting: "Golden hour",
    movement: "Dolly in",
    music: "Drone swells",
    shader: {
      ...SHADER_PRESET_DEFAULTS,
      colors: ["#5edf3c", "#7636ff", "#f2ff05", "#0037ff"],
      offsetX: 0.1,
      offsetY: -0.35,
    },
    shot: "MS",
    timeSeconds: 3,
  },
  {
    action: "Coin drops, she dials",
    camera: "Sony Venice 2",
    dialogue: "\u201CPick up. Please.\u201D",
    id: "scene-03",
    lens: "Cooke S7 50mm",
    lighting: "Practical neon",
    movement: "Handheld",
    music: "Silence",
    shader: {
      ...SHADER_PRESET_DEFAULTS,
      colors: ["#90c8cf", "#3d3a6b", "#012afc", "#1b6dd9"],
      offsetX: 0.2,
      offsetY: 0.8,
    },
    shot: "MCU",
    timeSeconds: 6,
  },
  {
    action: "Finger hovers over the hook",
    camera: "Sony Venice 2",
    dialogue: "",
    id: "scene-04",
    lens: "Cooke S7 75mm",
    lighting: "Practical neon",
    movement: "Static",
    music: "Single piano note",
    shader: {
      ...SHADER_PRESET_DEFAULTS,
      colors: ["#4e0149", "#058d92", "#7657f0", "#79eb0b"],
      offsetX: -0.05,
      offsetY: -0.9,
    },
    shot: "CU",
    timeSeconds: 2,
  },
  {
    action: "Wide reveal of the overpass",
    camera: "RED Komodo-X",
    dialogue: "",
    id: "scene-05",
    lens: "Zeiss Supreme 29mm",
    lighting: "Blue hour",
    movement: "Crane up",
    music: "Strings enter",
    shader: {
      ...SHADER_PRESET_DEFAULTS,
      colors: ["#e63412", "#ffb703", "#ff4400", "#8b0045"],
      offsetX: 0.4,
      offsetY: 0.15,
    },
    shot: "WS",
    timeSeconds: 8,
  },
  {
    action: "Dan walks toward camera",
    camera: "RED Komodo-X",
    dialogue: "\u201CYou came back.\u201D",
    id: "scene-06",
    lens: "Zeiss Supreme 50mm",
    lighting: "Sodium vapor",
    movement: "Steadicam",
    music: "Strings hold",
    shader: {
      ...SHADER_PRESET_DEFAULTS,
      colors: ["#76d3f5", "#b569ff", "#7dd3fc", "#e0aaff"],
      offsetX: 0.4,
      offsetY: 0.25,
    },
    shot: "MS",
    timeSeconds: 5,
  },
  {
    action: "Mara turns, eyes wet",
    camera: "Alexa 35",
    dialogue: "\u201CI never left.\u201D",
    id: "scene-07",
    lens: "Signature 75mm",
    lighting: "Sodium vapor",
    movement: "Static",
    music: "Strings fade",
    shader: {
      ...SHADER_PRESET_DEFAULTS,
      colors: ["#e3408a", "#edbd55", "#d4876e", "#a34d7a"],
      offsetX: 0.4,
      offsetY: 0.05,
    },
    shot: "CU",
    timeSeconds: 4,
  },
  {
    action: "Two figures shrink into the skyline",
    camera: "Alexa 35",
    dialogue: "",
    id: "scene-08",
    lens: "Signature 18mm",
    lighting: "Night, moonlit",
    movement: "Drone pull-back",
    music: "Full theme",
    shader: {
      ...SHADER_PRESET_DEFAULTS,
      colors: ["#ff0040", "#00ff88", "#ffe600", "#ff00d5"],
      offsetX: 0.4,
      offsetY: -0.9,
    },
    shot: "WS",
    timeSeconds: 10,
  },
]

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

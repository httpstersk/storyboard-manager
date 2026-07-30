/**
 * Persisted user preference for depth-map storyboard rendering.
 *
 * Backed by `atomWithStorage` on Jotai's default store, so no Provider is
 * required. Storage is read after mount (the `atomWithStorage` default),
 * keeping the server and first client render in sync.
 */

import { atomWithStorage } from "jotai/utils"

/**
 * Hard STYLE LOCK injected into image/video prompts when depth-map mode is on.
 * White = nearest, black = farthest; no colour, texture, lighting, or shading.
 */
export const DEPTH_MAP_STYLE_PROMPT =
  "Physically accurate, grayscale, linear depth map. White represents the nearest point and black represents the farthest point. Remove all colour, texture, lighting, shading, outlines, normals and ambient occlusion. Only output the clean depth map."

/** Default preference: standard photoreal / free-text visual style. */
const DEFAULT_DEPTH_MAP_STYLE = false

/** Versioned localStorage key for {@link depthMapStyleAtom}. */
const DEPTH_MAP_STYLE_SETTINGS_KEY = "storyboard-studio:depth-map-style:v1"

/**
 * Global, persisted depth-map style preference.
 * When true, generation ignores composer visual style and style images.
 */
export const depthMapStyleAtom = atomWithStorage<boolean>(
  DEPTH_MAP_STYLE_SETTINGS_KEY,
  DEFAULT_DEPTH_MAP_STYLE
)

/**
 * Persisted user preference for image output resolution.
 *
 * Backed by `atomWithStorage` on Jotai's default store, so no Provider is
 * required. Storage is read after mount (the `atomWithStorage` default),
 * keeping the server and first client render in sync. Models that do not
 * support the stored resolution clamp it to their highest supported one.
 */

import { atomWithStorage } from "jotai/utils"

import { type ImageResolution } from "@/lib/image-models"

/** Default preference: 2K, matching the previous hardcoded generate setting. */
const DEFAULT_IMAGE_RESOLUTION: ImageResolution = "2K"

/** Versioned localStorage key for {@link imageResolutionAtom}. */
const IMAGE_RESOLUTION_SETTINGS_KEY = "storyboard-studio:image-resolution:v1"

/** Global, persisted 1K / 2K / 4K resolution preference. */
export const imageResolutionAtom = atomWithStorage<ImageResolution>(
  IMAGE_RESOLUTION_SETTINGS_KEY,
  DEFAULT_IMAGE_RESOLUTION
)

/**
 * Persisted user preference for the image generation model.
 *
 * Backed by `atomWithStorage` on Jotai's default store, so no Provider is
 * required. Storage is read after mount (the `atomWithStorage` default),
 * keeping the server and first client render in sync.
 */

import { atomWithStorage } from "jotai/utils"

import { type ImageModel } from "@/lib/image-models"

/** Default preference: Nano Banana Pro, the previous default lineup's Pro tier. */
const DEFAULT_IMAGE_MODEL: ImageModel = "nano-banana-pro"

/**
 * Versioned localStorage key for {@link imageModelAtom}.
 * v2 switched values from `lite` / `pro` to full model identifiers.
 */
const IMAGE_MODEL_SETTINGS_KEY = "storyboard-studio:image-model:v2"

/** Global, persisted Nano Banana Pro / Seedream 5 Pro preference. */
export const imageModelAtom = atomWithStorage<ImageModel>(
  IMAGE_MODEL_SETTINGS_KEY,
  DEFAULT_IMAGE_MODEL
)

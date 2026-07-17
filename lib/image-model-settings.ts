/**
 * Persisted user preference for the Nano Banana image model.
 *
 * Backed by `atomWithStorage` on Jotai's default store, so no Provider is
 * required. Storage is read after mount (the `atomWithStorage` default),
 * keeping the server and first client render in sync.
 */

import { atomWithStorage } from "jotai/utils"

import { type ImageModel } from "@/lib/generation"

/** Default preference: Lite for fast, cost-effective generation. */
const DEFAULT_IMAGE_MODEL: ImageModel = "lite"

/** Versioned localStorage key for {@link imageModelAtom}. */
const IMAGE_MODEL_SETTINGS_KEY = "storyboard-studio:image-model:v1"

/** Global, persisted Nano Banana Lite / Pro preference. */
export const imageModelAtom = atomWithStorage<ImageModel>(
  IMAGE_MODEL_SETTINGS_KEY,
  DEFAULT_IMAGE_MODEL
)

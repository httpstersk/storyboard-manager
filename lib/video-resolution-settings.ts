/**
 * Persisted user preference for Seedance video output resolution.
 *
 * Backed by `atomWithStorage` on Jotai's default store, so no Provider is
 * required. Storage is read after mount (the `atomWithStorage` default),
 * keeping the server and first client render in sync.
 */

import { atomWithStorage } from "jotai/utils"

import { type VideoResolution } from "@/lib/video-generation"

/** Default preference: 720p, matching the previous hardcoded generate setting. */
const DEFAULT_VIDEO_RESOLUTION: VideoResolution = "720p"

/** Versioned localStorage key for {@link videoResolutionAtom}. */
const VIDEO_RESOLUTION_SETTINGS_KEY = "storyboard-studio:video-resolution:v1"

/** Global, persisted 480p / 720p / 1080p video resolution preference. */
export const videoResolutionAtom = atomWithStorage<VideoResolution>(
  VIDEO_RESOLUTION_SETTINGS_KEY,
  DEFAULT_VIDEO_RESOLUTION
)

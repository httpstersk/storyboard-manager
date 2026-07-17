import {
  type VideoGenerationRequest,
  videoGenerationResponseSchema,
} from "@/lib/video-generation"
import { apiPost } from "@/lib/api-client"
import type { z } from "zod"

/** Parsed video generation payload returned by the API. */
export type VideoGenerationResult = z.infer<
  typeof videoGenerationResponseSchema
>

/**
 * Requests a Seedance 2.0 video from the server API and validates the
 * response against the shared video generation schema.
 */
export async function requestVideoGeneration(
  request: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  return apiPost(
    "/api/generate-video",
    request,
    videoGenerationResponseSchema,
    "The video could not be generated."
  )
}

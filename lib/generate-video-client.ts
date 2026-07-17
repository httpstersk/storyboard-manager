import {
  type VideoGenerationRequest,
  videoGenerationResponseSchema,
} from "@/lib/video-generation"
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
  const response = await fetch("/api/generate-video", {
    body: JSON.stringify(request),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
  const responseBody: unknown = await response.json()

  if (!response.ok) {
    const message =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "error" in responseBody &&
      typeof responseBody.error === "string"
        ? responseBody.error
        : "The video could not be generated."

    throw new Error(message)
  }

  return videoGenerationResponseSchema.parse(responseBody)
}

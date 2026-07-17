import {
  type StoryboardGenerationRequest,
  storyboardGenerationResponseSchema,
} from "@/lib/generation"
import { apiPost } from "@/lib/api-client"
import type { z } from "zod"

/** Parsed storyboard generation payload returned by the API. */
export type StoryboardGenerationResult = z.infer<
  typeof storyboardGenerationResponseSchema
>

/**
 * Requests a generated storyboard from the server API and validates the
 * response against the shared generation schema.
 */
export async function requestStoryboardGeneration(
  request: StoryboardGenerationRequest
): Promise<StoryboardGenerationResult> {
  return apiPost(
    "/api/generate-storyboard",
    request,
    storyboardGenerationResponseSchema,
    "The storyboard could not be generated."
  )
}

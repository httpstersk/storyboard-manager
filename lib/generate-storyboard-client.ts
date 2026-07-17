import {
  type StoryboardGenerationRequest,
  storyboardGenerationResponseSchema,
} from "@/lib/generation"
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
  const response = await fetch("/api/generate-storyboard", {
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
        : "The storyboard could not be generated."

    throw new Error(message)
  }

  return storyboardGenerationResponseSchema.parse(responseBody)
}

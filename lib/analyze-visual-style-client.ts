import { apiPost } from "@/lib/api-client"
import {
  type VisualStyleAnalysisRequest,
  visualStyleAnalysisResponseSchema,
} from "@/lib/generation"
import type { z } from "zod"

/** Parsed visual-style analysis payload returned by the API. */
export type VisualStyleAnalysisResult = z.infer<
  typeof visualStyleAnalysisResponseSchema
>

/**
 * Requests a technical visual-style description for uploaded style reference
 * images from the server API and validates the response against the shared
 * analysis schema.
 */
export async function requestVisualStyleAnalysis(
  request: VisualStyleAnalysisRequest
): Promise<VisualStyleAnalysisResult> {
  return apiPost(
    "/api/analyze-visual-style",
    request,
    visualStyleAnalysisResponseSchema,
    "The style images could not be analysed."
  )
}

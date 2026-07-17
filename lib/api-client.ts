/**
 * Shared HTTP client utilities for API route consumption.
 *
 * Every client module that calls a server API route follows the same
 * pattern: POST JSON, parse the response, extract a structured error
 * on failure. This module centralises that pipeline so each call site
 * only specifies the endpoint, payload, schema, and fallback message.
 */

import type { z } from "zod"

/**
 * Extracts a user-facing error message from an untyped API response body,
 * falling back to the provided default when the body has no `.error` string.
 */
function extractApiError(body: unknown, fallback: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as Record<string, unknown>).error === "string"
  ) {
    return (body as Record<string, unknown>).error as string
  }

  return fallback
}

/**
 * Posts a JSON payload to an API route, validates the response against a
 * Zod schema, and returns the parsed result. Throws with a user-facing
 * message when the server returns an error or the response is malformed.
 *
 * @param url - Relative API route path, e.g. `/api/generate-storyboard`.
 * @param body - Request payload serialised to JSON.
 * @param schema - Zod schema used to validate the successful response.
 * @param fallbackError - Message shown when the server returns no `.error`.
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
  schema: z.ZodType<T>,
  fallbackError: string
): Promise<T> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
  const responseBody: unknown = await response.json()

  if (!response.ok) {
    throw new Error(extractApiError(responseBody, fallbackError))
  }

  return schema.parse(responseBody)
}

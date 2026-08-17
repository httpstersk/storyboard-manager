/**
 * Shared fal → Pika fallback policy for media generation routes.
 *
 * Falls back only on infrastructure-style failures — transport errors,
 * rate limits, provider outages, or a call that produced no usable output —
 * never on a validation or content-moderation rejection, which Pika would
 * reject identically and would only double the spend.
 */

import { isRetryableError } from "@fal-ai/client"
import { APICallError, NoImageGeneratedError, RetryError } from "ai"

/**
 * HTTP status codes that indicate a transient or provider-side failure,
 * as opposed to a request the caller sent wrong (400/404/422) or content
 * the provider refused. Those are deliberately excluded so a bad request
 * never silently retries against a second paid provider.
 *
 * Passed as the status allow-list to fal's own {@link isRetryableError},
 * widened beyond fal's narrower internal-retry default (429/502/503/504)
 * to also treat an unusable key (401/403) or an overloaded queue
 * (408/425) as worth trying on a different provider.
 */
export const RETRYABLE_PROVIDER_STATUS_CODES: number[] = [
  401, 402, 403, 408, 425, 429, 500, 502, 503, 504,
]

/**
 * Thrown by a provider call that resolved without error but produced no
 * usable media (for example a Seedance response with no video URL). This
 * never became a rejected request, so it is always eligible for fallback.
 */
export class ProviderNoOutputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProviderNoOutputError"
  }
}

/**
 * Whether a failed fal call is worth retrying on Pika.
 *
 * `APICallError` (raised by the `ai` SDK's `generateImage`, used for the
 * two image routes) is checked directly since fal's `isRetryableError`
 * does not recognise it. Everything else — fal's own `ApiError` (used by
 * the video route's direct `@fal-ai/client` calls) and any bare
 * network/transport failure — is delegated to fal's own battle-tested
 * {@link isRetryableError}.
 */
export function isRetryableProviderFailure(error: unknown): boolean {
  if (error instanceof ProviderNoOutputError) {
    return true
  }

  if (NoImageGeneratedError.isInstance(error)) {
    return true
  }

  if (RetryError.isInstance(error)) {
    return error.errors.some(isRetryableProviderFailure)
  }

  if (APICallError.isInstance(error)) {
    return error.statusCode === undefined
      ? error.isRetryable
      : RETRYABLE_PROVIDER_STATUS_CODES.includes(error.statusCode)
  }

  return isRetryableError(error, RETRYABLE_PROVIDER_STATUS_CODES)
}

/**
 * Runs `primary`, falling back to `fallback` when `primary` throws a
 * {@link isRetryableProviderFailure} error and a fallback is available.
 * Rethrows the original fal error otherwise, so existing user-facing error
 * messages stay unchanged.
 *
 * @param label - Short description used in the fallback log line.
 */
export async function runWithProviderFallback<T>({
  fallback,
  label,
  primary,
}: {
  fallback?: () => Promise<T>
  label: string
  primary: () => Promise<T>
}): Promise<T> {
  try {
    return await primary()
  } catch (error) {
    if (fallback === undefined || !isRetryableProviderFailure(error)) {
      throw error
    }

    console.error(`Falling back to Pika after fal failure (${label}):`, error)

    return fallback()
  }
}

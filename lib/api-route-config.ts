/**
 * Shared configuration for Next.js API routes.
 *
 * Environment helpers live here so each route module only contains its
 * endpoint-specific logic. Note: `maxDuration` and `runtime` must remain
 * inline string/number literals in each route file because Next.js
 * statically analyses them at compile-time.
 */

/**
 * Resolves the fal API key from environment variables, checking both
 * `FAL_KEY` (preferred) and `FAL_API_KEY` (legacy fallback).
 *
 * @returns The resolved key, or `undefined` when neither variable is set.
 */
export function resolveFalApiKey(): string | undefined {
  return process.env.FAL_KEY ?? process.env.FAL_API_KEY
}

/**
 * Resolves the Pika API key used as a fallback provider when fal is
 * unconfigured or fails for an infrastructure reason, and as the sole
 * provider when only this key is set.
 *
 * @returns The resolved key, or `undefined` when `PIKA_API_KEY` is not set.
 */
export function resolvePikaApiKey(): string | undefined {
  return process.env.PIKA_API_KEY
}

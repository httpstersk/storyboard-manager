/**
 * Low-level Pika API REST client: uploads, job submission, and job polling.
 * Model-specific request bodies live in `lib/pika-video.server.ts` and
 * `lib/pika-image.server.ts`; this module only knows the transport.
 *
 * @see https://dev.pika.art/llms.txt for the full API reference.
 */

import { z } from "zod"

import { dataUrlToBlob } from "@/lib/image-data"

/** Customer-facing Pika API host. */
const PIKA_API_BASE_URL = "https://api.dev.pika.art"

/** Delay between job-status polls. */
const PIKA_JOB_POLL_INTERVAL_MS = 2_000

/**
 * Pika's documented upload cap for image and audio references. Video
 * references have a separate, larger cap not used by this codebase.
 */
export const PIKA_MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024

const pikaUploadResponseSchema = z.object({
  // Nullish per the same explicit-null convention observed on job envelopes.
  headers: z.record(z.string(), z.string()).nullish(),
  upload_url: z.string().url(),
  url: z.string().url(),
})

const pikaJobErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

const pikaJobSchema = z.object({
  // Pika sends an explicit `null` for these fields rather than omitting
  // them on a queued/running job, so `.optional()` alone (undefined-only)
  // rejects the response; `.nullish()` accepts both.
  error: pikaJobErrorSchema.nullish(),
  id: z.string(),
  output: z.unknown().nullish(),
  status: z.enum(["queued", "running", "completed", "failed"]),
})

/** A submitted or polled Pika media job. */
export type PikaJob = z.infer<typeof pikaJobSchema>

/**
 * Raised when a Pika job reaches `status: "failed"`, carrying the
 * machine-readable `error.code` Pika documents for branching.
 */
export class PikaJobError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "PikaJobError"
    this.code = code
  }
}

/**
 * Polls `GET /v1/media/jobs/{requestId}` until the job reaches a terminal
 * state, returning its `output` once `completed`.
 *
 * @throws {PikaJobError} When the job reaches `status: "failed"`.
 * @throws {Error} When the job does not finish within `timeoutMs`.
 */
export async function awaitPikaJob(
  requestId: string,
  apiKey: string,
  { timeoutMs }: { timeoutMs: number }
): Promise<unknown> {
  const deadline = Date.now() + timeoutMs

  while (true) {
    const job = await pollPikaJob(requestId, apiKey)

    if (job.status === "completed") {
      return job.output
    }

    if (job.status === "failed") {
      throw new PikaJobError(
        job.error?.code ?? "unknown",
        job.error?.message ?? "Pika generation failed."
      )
    }

    if (Date.now() >= deadline) {
      throw new Error("Pika generation timed out.")
    }

    await sleep(PIKA_JOB_POLL_INTERVAL_MS)
  }
}

/** Downloads a Pika-hosted result file into raw bytes. */
export async function fetchPikaFileBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Pika result download failed with status ${response.status}.`)
  }

  return new Uint8Array(await response.arrayBuffer())
}

/**
 * Submits a Pika media generation job.
 *
 * @param path - Model path from the operation's spec, e.g.
 * `/v1/media/bytedance/seedance-2.5/reference-to-video`.
 * @returns The job id to pass to {@link awaitPikaJob}.
 * @throws {PikaJobError} When the submit is rejected after the job row
 * exists (insufficient balance, rate limit, unpriceable input).
 */
export async function submitPikaJob(
  path: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<string> {
  const response = await pikaFetch(path, apiKey, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    method: "POST",
  })
  const payload: unknown = await response.json()

  if (!response.ok) {
    throw new Error(
      `Pika job submission failed with status ${response.status}.`
    )
  }

  const job = pikaJobSchema.parse(payload)

  if (job.status === "failed") {
    throw new PikaJobError(
      job.error?.code ?? "unknown",
      job.error?.message ?? "Pika rejected the request."
    )
  }

  return job.id
}

/**
 * Uploads an image data URL to Pika's hosted storage via the three-step
 * presigned-URL flow, returning the permanent Pika URL to reference in a
 * generation request's `image_urls`.
 *
 * @throws When the data URL cannot be parsed or exceeds
 * {@link PIKA_MAX_IMAGE_UPLOAD_BYTES}.
 */
export async function uploadPikaImage(
  dataUrl: string,
  apiKey: string
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl)

  if (blob === null) {
    throw new Error("The image data URL could not be parsed.")
  }

  if (blob.size > PIKA_MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error(
      `Image exceeds Pika's ${PIKA_MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB upload limit.`
    )
  }

  const contentType = blob.type === "" ? "image/png" : blob.type
  const presignResponse = await pikaFetch("/v1/media/uploads", apiKey, {
    body: JSON.stringify({ content_type: contentType, size_bytes: blob.size }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })

  if (!presignResponse.ok) {
    throw new Error(
      `Pika upload presign failed with status ${presignResponse.status}.`
    )
  }

  const presigned = pikaUploadResponseSchema.parse(await presignResponse.json())
  // Content-Type and Content-Length are signed into the presigned URL;
  // send the server's own headers verbatim when provided.
  const putResponse = await fetch(presigned.upload_url, {
    body: blob,
    headers:
      presigned.headers ??
      { "Content-Length": String(blob.size), "Content-Type": contentType },
    method: "PUT",
  })

  if (!putResponse.ok) {
    throw new Error(`Pika upload failed with status ${putResponse.status}.`)
  }

  return presigned.url
}

/** Issues one authenticated request against the Pika API. */
async function pikaFetch(
  path: string,
  apiKey: string,
  init: RequestInit
): Promise<Response> {
  return fetch(`${PIKA_API_BASE_URL}${path}`, {
    ...init,
    headers: { "X-API-Key": apiKey, ...init.headers },
  })
}

/** Fetches and validates one job-status poll. */
async function pollPikaJob(requestId: string, apiKey: string): Promise<PikaJob> {
  const response = await pikaFetch(`/v1/media/jobs/${requestId}`, apiKey, {
    method: "GET",
  })
  const payload: unknown = await response.json()

  if (!response.ok) {
    throw new Error(`Pika job poll failed with status ${response.status}.`)
  }

  return pikaJobSchema.parse(payload)
}

/** Resolves after `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

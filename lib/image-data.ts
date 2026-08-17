/**
 * Conversions between data URLs (in-memory UI) and Blobs (IndexedDB).
 */

/**
 * Bytes converted to a binary string per iteration. Chunking keeps the
 * `String.fromCharCode` argument list within engine limits while avoiding
 * the O(n) memory churn of appending one character at a time.
 */
const BASE64_CHUNK_SIZE = 0x8000

/** JPEG and PNG IANA types accepted on image data URLs. */
export const IMAGE_DATA_URL_MIME_TYPES = new Set(["image/jpeg", "image/png"])

/** PNG-only IANA type used for storyboard contact-sheet captures. */
export const PNG_DATA_URL_MIME_TYPES = new Set(["image/png"])

/**
 * Reads a Blob into a `data:` URL for use in React state and exports. A
 * stored MIME type restores images written by browsers that omit Blob.type.
 */
export async function blobToDataUrl(
  blob: Blob,
  storedMimeType?: string
): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""

  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + BASE64_CHUNK_SIZE)
    )
  }

  const mimeType =
    getImageMimeType(blob.type) ??
    getImageMimeType(storedMimeType) ??
    "image/png"

  return `data:${mimeType};base64,${btoa(binary)}`
}

/**
 * Parses a `data:` URL into a Blob, or returns null when the string is not
 * a usable data URL.
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  if (!dataUrl.startsWith("data:")) {
    return null
  }

  const commaIndex = dataUrl.indexOf(",")

  if (commaIndex === -1) {
    return null
  }

  const header = dataUrl.slice(5, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)
  const mimeType = header.split(";")[0] || "application/octet-stream"
  const isBase64 = /;base64$/i.test(header) || /;base64;/i.test(header)

  try {
    if (isBase64) {
      const binary = atob(payload)
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

      return new Blob([bytes], { type: mimeType })
    }

    return new Blob([decodeURIComponent(payload)], { type: mimeType })
  } catch {
    return null
  }
}

/**
 * Reads the JPEG or PNG media type from a data URL header without inspecting
 * the payload.
 */
export function getImageDataUrlMediaType(
  value: string
): "image/jpeg" | "image/png" | null {
  return parseImageDataUrlHeader(value)?.mediaType ?? null
}

/** Returns a supported image MIME type, or null for untrusted values. */
function getImageMimeType(value: string | undefined): string | null {
  if (value === undefined || !IMAGE_DATA_URL_MIME_TYPES.has(value)) {
    return null
  }

  return value
}

/**
 * Returns true when `charCode` is a base64 alphabet, padding, or ASCII
 * whitespace character. Matches the JS `/\s/` class without the `u` flag.
 */
function isBase64CharCode(charCode: number): boolean {
  if (charCode >= 65 && charCode <= 90) {
    return true
  }

  if (charCode >= 97 && charCode <= 122) {
    return true
  }

  if (charCode >= 48 && charCode <= 57) {
    return true
  }

  if (charCode === 43 || charCode === 47 || charCode === 61) {
    return true
  }

  return (
    charCode === 9 ||
    charCode === 10 ||
    charCode === 11 ||
    charCode === 12 ||
    charCode === 13 ||
    charCode === 32
  )
}

/**
 * Returns true when `value` is a JPEG or PNG base64 data URL.
 * The payload is scanned by character rather than a whole-string regex so
 * megabyte-scale storyboard captures cannot overflow V8's regexp stack.
 *
 * @param value - Candidate data URL.
 * @param allowedMimeTypes - IANA types to accept; defaults to JPEG and PNG.
 */
export function isImageDataUrl(
  value: string,
  allowedMimeTypes: ReadonlySet<string> = IMAGE_DATA_URL_MIME_TYPES
): boolean {
  const header = parseImageDataUrlHeader(value)

  if (header === null || !allowedMimeTypes.has(header.mediaType)) {
    return false
  }

  if (header.payloadStart >= value.length) {
    return false
  }

  for (let index = header.payloadStart; index < value.length; index += 1) {
    if (!isBase64CharCode(value.charCodeAt(index))) {
      return false
    }
  }

  return true
}

/** Narrows a header capture to a supported image data URL media type. */
function isImageDataUrlMediaType(
  value: string
): value is "image/jpeg" | "image/png" {
  return value === "image/jpeg" || value === "image/png"
}

/**
 * Parses only the data URL header so validation never copies or regexes the
 * base64 payload.
 */
function parseImageDataUrlHeader(value: string): {
  mediaType: "image/jpeg" | "image/png"
  payloadStart: number
} | null {
  const commaIndex = value.indexOf(",")

  if (commaIndex === -1) {
    return null
  }

  const match = /^data:(image\/(?:jpeg|png));base64$/i.exec(
    value.slice(0, commaIndex)
  )
  const mediaType = match?.[1]?.toLowerCase()

  if (mediaType === undefined || !isImageDataUrlMediaType(mediaType)) {
    return null
  }

  return {
    mediaType,
    payloadStart: commaIndex + 1,
  }
}

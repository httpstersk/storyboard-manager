/**
 * Conversions between data URLs (in-memory UI) and Blobs (IndexedDB).
 */

/** MIME types supported by the scene image API and browser image controls. */
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"])

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

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
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
      const bytes = new Uint8Array(binary.length)

      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
      }

      return new Blob([bytes], { type: mimeType })
    }

    return new Blob([decodeURIComponent(payload)], { type: mimeType })
  } catch {
    return null
  }
}

/** Returns a supported image MIME type, or null for untrusted values. */
function getImageMimeType(value: string | undefined): string | null {
  if (value === undefined || !IMAGE_MIME_TYPES.has(value)) {
    return null
  }

  return value
}

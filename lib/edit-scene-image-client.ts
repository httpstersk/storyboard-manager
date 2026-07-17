import {
  type ImageModel,
  type ImageResolution,
  sceneImageEditResponseSchema,
} from "@/lib/generation"

/** Client payload for editing a single scene image. */
export interface SceneImageEditRequestPayload {
  imageModel: ImageModel
  prompt: string
  resolution: ImageResolution
  sourceImage: string
}

/**
 * Requests an AI edit for a scene image and validates the response
 * against the shared scene image edit schema.
 */
export async function requestSceneImageEdit(
  payload: SceneImageEditRequestPayload
): Promise<string> {
  const response = await fetch("/api/edit-scene-image", {
    body: JSON.stringify(payload),
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
        : "The scene image could not be edited."

    throw new Error(message)
  }

  const result = sceneImageEditResponseSchema.parse(responseBody)

  return result.image
}

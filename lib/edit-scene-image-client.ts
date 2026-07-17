import {
  type SceneImageEditRequest,
  sceneImageEditResponseSchema,
} from "@/lib/generation"
import { apiPost } from "@/lib/api-client"

/**
 * Requests an AI edit for a scene image and validates the response
 * against the shared scene image edit schema.
 */
export async function requestSceneImageEdit(
  payload: SceneImageEditRequest
): Promise<string> {
  const result = await apiPost(
    "/api/edit-scene-image",
    payload,
    sceneImageEditResponseSchema,
    "The scene image could not be edited."
  )

  return result.image
}

/**
 * Registry of the selectable fal image models.
 *
 * Owns the model enum, per-model fal endpoint IDs, display labels, and
 * resolution support so the UI, schemas, and API routes share one source
 * of truth.
 */

/** Supported image models for storyboard generation and scene editing. */
export const IMAGE_MODELS = ["nano-banana-pro", "seedream-5-pro"] as const

/** Selected image model for fal generation and editing. */
export type ImageModel = (typeof IMAGE_MODELS)[number]

/** Output resolutions offered by the Resolution segmented control. */
export const IMAGE_RESOLUTIONS = ["1K", "2K", "4K"] as const

/** Selected fal output resolution for generation and editing. */
export type ImageResolution = (typeof IMAGE_RESOLUTIONS)[number]

/** Static configuration describing one selectable fal image model. */
export interface ImageModelConfig {
  /** Fal model ID used when reference images accompany the prompt. */
  editModelId: string
  /** Fal model ID used for pure text-to-image generation. */
  generateModelId: string
  /** Human-readable name shown in the Model segmented control. */
  label: string
  /**
   * Pika endpoint path used as the fallback provider for this model's
   * image-to-image generation (composite and single-scene edit).
   */
  pikaEditPath: string
  /**
   * Maximum reference images Pika's endpoint accepts for this model, when
   * documented. `undefined` when Pika states no explicit cap — the
   * fallback is attempted regardless and any rejection surfaces normally.
   */
  pikaMaxReferenceImages: number | undefined
  /** Output resolutions the model accepts, ordered low to high. */
  supportedResolutions: readonly ImageResolution[]
}

/** Per-model fal endpoints, Pika fallback endpoints, and resolution support. */
export const IMAGE_MODEL_CONFIGS: Record<ImageModel, ImageModelConfig> = {
  "nano-banana-pro": {
    editModelId: "fal-ai/nano-banana-pro/edit",
    generateModelId: "fal-ai/nano-banana-pro",
    label: "Nano Banana",
    pikaEditPath: "/v1/media/google/gemini-3-pro-image/image-to-image",
    pikaMaxReferenceImages: undefined,
    supportedResolutions: ["1K", "2K", "4K"],
  },
  "seedream-5-pro": {
    editModelId: "bytedance/seedream/v5/pro/edit",
    generateModelId: "bytedance/seedream/v5/pro/text-to-image",
    label: "Seedream 5",
    pikaEditPath: "/v1/media/bytedance/seedream-5.0-pro/image-to-image",
    // Pika's Seedream 5 Pro editing endpoint documents a hard 10-image cap.
    pikaMaxReferenceImages: 10,
    // Seedream 5 Pro caps total output pixels at 2048x2048 on fal, so 4K
    // is not offered.
    supportedResolutions: ["1K", "2K"],
  },
}

/**
 * Snaps a resolution the model does not support down to its highest
 * supported one (for example 4K becomes 2K on Seedream 5 Pro).
 */
export function clampResolution(
  imageModel: ImageModel,
  resolution: ImageResolution
): ImageResolution {
  const { supportedResolutions } = IMAGE_MODEL_CONFIGS[imageModel]

  return supportedResolutions.includes(resolution)
    ? resolution
    : supportedResolutions[supportedResolutions.length - 1]
}

/** Type guard for values emitted by the Model segmented control. */
export function isImageModel(value: string): value is ImageModel {
  return (IMAGE_MODELS as readonly string[]).includes(value)
}

/** Type guard for values emitted by the Resolution segmented control. */
export function isImageResolution(value: string): value is ImageResolution {
  return (IMAGE_RESOLUTIONS as readonly string[]).includes(value)
}

/** Resolves the fal edit model ID for single-scene image editing. */
export function resolveEditModelId(imageModel: ImageModel): string {
  return IMAGE_MODEL_CONFIGS[imageModel].editModelId
}

/**
 * Resolves the fal model ID for storyboard composite generation.
 * Uses the edit endpoint whenever reference images are attached.
 */
export function resolveImageModelId({
  hasReferenceImages,
  imageModel,
}: {
  hasReferenceImages: boolean
  imageModel: ImageModel
}): string {
  const config = IMAGE_MODEL_CONFIGS[imageModel]

  return hasReferenceImages ? config.editModelId : config.generateModelId
}

/**
 * Resolves the Pika endpoint path used as the fallback provider for a
 * model's image-to-image generation (composite and single-scene edit).
 */
export function resolvePikaEditPath(imageModel: ImageModel): string {
  return IMAGE_MODEL_CONFIGS[imageModel].pikaEditPath
}

/**
 * Resolves the maximum reference images Pika's fallback endpoint accepts
 * for a model, or `undefined` when Pika documents no explicit cap.
 */
export function resolvePikaMaxReferenceImages(
  imageModel: ImageModel
): number | undefined {
  return IMAGE_MODEL_CONFIGS[imageModel].pikaMaxReferenceImages
}

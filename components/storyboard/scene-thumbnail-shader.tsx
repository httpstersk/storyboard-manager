"use client"

import { MeshGradient } from "@paper-design/shaders-react"
import * as React from "react"

import type { SceneShaderPreset } from "@/lib/storyboard"
import { cn } from "@/lib/utils"

/** Props for {@link SceneThumbnailShader}. */
interface SceneThumbnailShaderProps {
  className?: string
  /** Shader parameters for this scene. */
  preset: SceneShaderPreset
}

/**
 * Decorative animated background rendered behind a scene numeral.
 *
 * Memoised so note edits elsewhere on the board do not re-render the
 * underlying WebGL canvases.
 */
const SceneThumbnailShader = React.memo(function SceneThumbnailShader({
  className,
  preset,
}: SceneThumbnailShaderProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <MeshGradient
        colors={preset.colors}
        distortion={preset.distortion}
        grainMixer={preset.grainMixer}
        grainOverlay={preset.grainOverlay}
        height="100%"
        offsetX={preset.offsetX}
        offsetY={preset.offsetY}
        scale={preset.scale}
        speed={preset.speed}
        swirl={preset.swirl}
        width="100%"
      />
    </div>
  )
})

export { SceneThumbnailShader, type SceneThumbnailShaderProps }

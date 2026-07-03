"use client"

import { Swirl } from "@paper-design/shaders-react"
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
      <Swirl
        bandCount={preset.bandCount}
        colors={preset.colors}
        height="100%"
        offsetX={preset.offsetX}
        offsetY={preset.offsetY}
        softness={preset.softness}
        speed={preset.speed}
        twist={preset.twist}
        width="100%"
      />
    </div>
  )
})

export { SceneThumbnailShader, type SceneThumbnailShaderProps }

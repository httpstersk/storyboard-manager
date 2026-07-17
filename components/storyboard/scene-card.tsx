"use client"

import { m, useReducedMotion } from "motion/react"
import Image from "next/image"
import * as React from "react"

import { SceneThumbnailShader } from "@/components/storyboard/scene-thumbnail-shader"
import type { Scene } from "@/lib/storyboard"
import { cn } from "@/lib/utils"

/** Image reveal timing used when a generated frame replaces its placeholder. */
const IMAGE_REVEAL_TRANSITION = { duration: 0.45, ease: "easeOut" } as const

interface SceneCardContextValue {
  scene: Scene
  sceneNumber: string
}

const SceneCardContext = React.createContext<SceneCardContextValue | null>(null)

function useSceneCard(): SceneCardContextValue {
  const context = React.use(SceneCardContext)

  if (context === null) {
    throw new Error(
      "SceneCard compound components must be used within <SceneCard>."
    )
  }

  return context
}

/** Props for the {@link SceneCard} root. */
interface SceneCardProps extends React.ComponentProps<"article"> {
  /** Scene rendered by this card. */
  scene: Scene
  /** Two-digit display number of the scene, for example "01". */
  sceneNumber: string
}

/**
 * A storyboard scene card.
 *
 * ```tsx
 * <SceneCard scene={scene} sceneNumber="01">
 *   <SceneCard.Thumbnail onEdit={openEditor} />
 * </SceneCard>
 * ```
 */
function SceneCard({
  children,
  className,
  scene,
  sceneNumber,
  ...props
}: SceneCardProps) {
  const contextValue = React.useMemo<SceneCardContextValue>(
    () => ({ scene, sceneNumber }),
    [scene, sceneNumber]
  )

  return (
    <article
      aria-label={`Scene ${sceneNumber}`}
      className={cn("flex size-full flex-col bg-surface-panel", className)}
      {...props}
    >
      <SceneCardContext.Provider value={contextValue}>
        {children}
      </SceneCardContext.Provider>
    </article>
  )
}

/** Props for {@link SceneCardThumbnail}. */
interface SceneCardThumbnailProps {
  className?: string
  /** Called when the thumbnail is activated to edit the scene. */
  onEdit: () => void
}

/**
 * Scene preview area. Scenes without artwork show the animated shader until
 * an upload or drawing is available. It also renders a full-size edit target.
 */
function SceneCardThumbnail({ className, onEdit }: SceneCardThumbnailProps) {
  const { scene, sceneNumber } = useSceneCard()

  return (
    <div
      className={cn(
        "relative flex aspect-video w-full shrink-0 items-center justify-center overflow-clip bg-surface-thumb",
        className
      )}
    >
      {!scene.image && <SceneThumbnailShader preset={scene.shader} />}
      <SceneCardReferenceImage image={scene.image} sceneNumber={sceneNumber} />
      <button
        aria-label={`Edit scene ${sceneNumber}`}
        className="absolute inset-0 z-20 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={onEdit}
        type="button"
      />
    </div>
  )
}

interface SceneCardReferenceImageProps {
  image?: string
  sceneNumber: string
}

/** Uploaded or generated image overlay, revealed smoothly when it appears. */
function SceneCardReferenceImage({
  image,
  sceneNumber,
}: SceneCardReferenceImageProps) {
  const shouldReduceMotion = useReducedMotion()

  if (!image) {
    return null
  }

  return (
    <m.div
      animate={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      className="absolute inset-0 z-10"
      initial={
        shouldReduceMotion
          ? false
          : { clipPath: "inset(0% 0% 100% 0%)", opacity: 0 }
      }
      key={image}
      transition={{
        ...IMAGE_REVEAL_TRANSITION,
        delay: shouldReduceMotion
          ? 0
          : Math.min(Number(sceneNumber) * 0.035, 0.35),
        duration: shouldReduceMotion ? 0 : IMAGE_REVEAL_TRANSITION.duration,
      }}
    >
      <Image
        alt=""
        className="object-cover"
        fill
        sizes="(max-width: 768px) 100vw, 25vw"
        src={image}
        unoptimized
      />
    </m.div>
  )
}

SceneCard.Thumbnail = SceneCardThumbnail

export { SceneCard, type SceneCardProps, type SceneCardThumbnailProps }

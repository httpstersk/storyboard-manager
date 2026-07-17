"use client"

import { AnimatePresence, m } from "motion/react"
import * as React from "react"

import { SceneCard } from "@/components/storyboard/scene-card"
import { formatSceneNumber, type Scene } from "@/lib/storyboard"

/** Entrance duration/easing; kept under 300ms per UI-animation guidance. */
const SCENE_ENTER_TRANSITION = { duration: 0.25, ease: "easeOut" } as const

/** Exit is quicker and subtler than the entrance. */
const SCENE_EXIT_TRANSITION = { duration: 0.15, ease: "easeOut" } as const

/** Reflow (rows/columns changes) uses a spring so it feels alive rather
 * than mechanical, consistent with the other layout transitions. */
const SCENE_LAYOUT_TRANSITION = {
  type: "spring",
  duration: 0.35,
  bounce: 0.1,
} as const

/** Stagger step between card entrances, capped so large grids don't feel
 * slow to finish appearing. */
const SCENE_STAGGER_STEP = 0.03
const SCENE_STAGGER_MAX = 0.3

/** Props for {@link SceneGrid}. */
interface SceneGridProps {
  /** Number of grid columns. */
  columns: number
  /** Whether a new board is currently being generated. */
  isGenerating: boolean
  /** Called with a scene id when its thumbnail is activated. */
  onEditScene: (sceneId: string) => void
  /** Ref to the grid element, used for PNG capture. */
  ref?: React.Ref<HTMLElement>
  /** Number of grid rows; scenes beyond rows x columns are hidden. */
  rows: number
  /** All scenes of the current board, in order. */
  scenes: Scene[]
}

/**
 * The board's scene grid. Each cell is a gapless 16:9 image frame; scene
 * metadata is available from the image editor rather than the board itself.
 */
function SceneGrid({
  columns,
  isGenerating,
  onEditScene,
  ref,
  rows,
  scenes,
}: SceneGridProps) {
  const visibleScenes = scenes.slice(0, rows * columns)

  return (
    // Once several rows are shown the grid can grow past the viewport, so
    // this wrapper owns the vertical scroll and rounded clipping while the
    // inner <section> (the PNG-capture target) keeps its natural full
    // height -- exports therefore still include every visible row.
    <div
      aria-busy={isGenerating}
      className="[container-type:inline-size] relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-2xl bg-grid-line pb-112 [container-name:scene-grid]"
    >
      <section
        aria-label="Scenes"
        ref={ref}
        data-cols={columns}
        className="scene-grid grid content-start gap-0"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {visibleScenes.map((scene, index) => (
            <m.div
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-video min-w-0"
              exit={{
                opacity: 0,
                scale: 0.97,
                transition: SCENE_EXIT_TRANSITION,
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              key={scene.id}
              layout="position"
              transition={{
                ...SCENE_ENTER_TRANSITION,
                delay: Math.min(index * SCENE_STAGGER_STEP, SCENE_STAGGER_MAX),
                layout: SCENE_LAYOUT_TRANSITION,
              }}
            >
              <GridScene
                onEdit={() => onEditScene(scene.id)}
                scene={scene}
                sceneNumber={formatSceneNumber(index)}
              />
            </m.div>
          ))}
        </AnimatePresence>
      </section>
      <AnimatePresence>
        {isGenerating ? (
          <m.div
            animate={{ opacity: 1 }}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 overflow-hidden bg-surface-app/10"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="generation-scan"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <m.div
              animate={{ top: ["0%", "100%"] }}
              className="absolute inset-x-0 h-px bg-emphasis/80 motion-reduce:hidden"
              transition={{
                duration: 1.8,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "mirror",
              }}
            />
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

interface GridSceneProps {
  onEdit: () => void
  scene: Scene
  sceneNumber: string
}

/** One image-only scene card inside the grid. */
function GridScene({ onEdit, scene, sceneNumber }: GridSceneProps) {
  return (
    <SceneCard scene={scene} sceneNumber={sceneNumber}>
      <SceneCard.Thumbnail onEdit={onEdit} />
    </SceneCard>
  )
}

export { SceneGrid, type SceneGridProps }

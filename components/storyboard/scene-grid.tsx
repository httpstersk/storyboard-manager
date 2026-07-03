"use client"

import { AnimatePresence, motion } from "motion/react"
import * as React from "react"

import { SceneCard } from "@/components/storyboard/scene-card"
import { PillSelect } from "@/components/ui/pill-select"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Stepper } from "@/components/ui/stepper"
import { Tooltip } from "@/components/ui/tooltip"
import {
  CAMERA_OPTIONS,
  formatSceneNumber,
  LENS_OPTIONS,
  LIGHTING_OPTIONS,
  MOVEMENT_OPTIONS,
  SCENE_TIME_LIMITS,
  type Scene,
  type SelectOption,
  SHOT_SIZE_OPTIONS,
  type ShotSize,
} from "@/lib/storyboard"
import { sanitizeNote } from "@/lib/validation"

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
  /** Called with a scene id when its thumbnail is activated. */
  onEditScene: (sceneId: string) => void
  /** Called with a partial update for the given scene. */
  onUpdateScene: (sceneId: string, patch: Partial<Scene>) => void
  /** Ref to the grid element, used for PNG capture. */
  ref?: React.Ref<HTMLElement>
  /** Number of grid rows; scenes beyond rows x columns are hidden. */
  rows: number
  /** All scenes of the current board, in order. */
  scenes: Scene[]
  /** Whether the parameter rows are visible on each card. */
  showParameters: boolean
}

/**
 * The board's scene grid. Cell count derives from the rows and columns
 * steppers; hairline gaps come from the grid-line background.
 */
function SceneGrid({
  columns,
  onEditScene,
  onUpdateScene,
  ref,
  rows,
  scenes,
  showParameters,
}: SceneGridProps) {
  const visibleScenes = scenes.slice(0, rows * columns)

  return (
    <section
      aria-label="Scenes"
      ref={ref}
      className="grid flex-1 content-start gap-px overflow-clip rounded-2xl bg-grid-line"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {visibleScenes.map((scene, index) => (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
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
              onUpdate={(patch) => onUpdateScene(scene.id, patch)}
              scene={scene}
              sceneNumber={formatSceneNumber(index)}
              showParameters={showParameters}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </section>
  )
}

interface GridSceneProps {
  onEdit: () => void
  onUpdate: (patch: Partial<Scene>) => void
  scene: Scene
  sceneNumber: string
  showParameters: boolean
}

/** One fully composed scene card inside the grid. */
function GridScene({
  onEdit,
  onUpdate,
  scene,
  sceneNumber,
  showParameters,
}: GridSceneProps) {
  return (
    <SceneCard scene={scene} sceneNumber={sceneNumber}>
      <SceneCard.Thumbnail onEdit={onEdit} />
      <AnimatePresence initial={false}>
        {showParameters && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            key="details"
            transition={SCENE_LAYOUT_TRANSITION}
          >
            <SceneCard.Details>
              <SceneParameters onUpdate={onUpdate} scene={scene} />
              <SceneCard.Notes>
                <SceneCard.NoteRow
                  label="Action"
                  onValueChange={(value) =>
                    onUpdate({ action: sanitizeNote(value) })
                  }
                  placeholder="Add action"
                  value={scene.action}
                />
                <SceneCard.NoteRow
                  label="Dialogue"
                  onValueChange={(value) =>
                    onUpdate({ dialogue: sanitizeNote(value) })
                  }
                  placeholder="Add dialogue"
                  value={scene.dialogue}
                />
                <SceneCard.NoteRow
                  label="Music"
                  onValueChange={(value) =>
                    onUpdate({ music: sanitizeNote(value) })
                  }
                  placeholder="Add music"
                  value={scene.music}
                />
              </SceneCard.Notes>
            </SceneCard.Details>
          </motion.div>
        )}
      </AnimatePresence>
    </SceneCard>
  )
}

interface SceneParametersProps {
  onUpdate: (patch: Partial<Scene>) => void
  scene: Scene
}

/** The Time/Shot/Camera/Lens/Movement/Lighting rows of a scene card. */
function SceneParameters({ onUpdate, scene }: SceneParametersProps) {
  return (
    <>
      <SceneCard.Row label="Time">
        <Stepper
          label="Scene duration"
          max={SCENE_TIME_LIMITS.max}
          min={SCENE_TIME_LIMITS.min}
          onValueChange={(timeSeconds) => onUpdate({ timeSeconds })}
          value={scene.timeSeconds}
        >
          <Stepper.Decrement />
          <Stepper.Value
            format={(value) => `${String(value).padStart(2, "0")} s`}
          />
          <Stepper.Increment />
        </Stepper>
      </SceneCard.Row>
      <SceneCard.Row label="Shot">
        <SegmentedControl
          label="Shot size"
          onValueChange={(shot) => onUpdate({ shot: shot as ShotSize })}
          value={scene.shot}
        >
          {SHOT_SIZE_OPTIONS.map((option) => (
            <Tooltip key={option.value}>
              <Tooltip.Trigger asChild>
                <SegmentedControl.Option value={option.value}>
                  {option.value}
                </SegmentedControl.Option>
              </Tooltip.Trigger>
              <Tooltip.Content>{option.label}</Tooltip.Content>
            </Tooltip>
          ))}
        </SegmentedControl>
      </SceneCard.Row>
      <SceneParameterSelect
        label="Camera"
        onValueChange={(camera) => onUpdate({ camera })}
        options={CAMERA_OPTIONS}
        value={scene.camera}
      />
      <SceneParameterSelect
        label="Lens"
        onValueChange={(lens) => onUpdate({ lens })}
        options={LENS_OPTIONS}
        value={scene.lens}
      />
      <SceneParameterSelect
        label="Movement"
        onValueChange={(movement) => onUpdate({ movement })}
        options={MOVEMENT_OPTIONS}
        value={scene.movement}
      />
      <SceneParameterSelect
        label="Lighting"
        onValueChange={(lighting) => onUpdate({ lighting })}
        options={LIGHTING_OPTIONS}
        value={scene.lighting}
      />
    </>
  )
}

interface SceneParameterSelectProps {
  label: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  value: string
}

/** A labelled dropdown parameter row. */
function SceneParameterSelect({
  label,
  onValueChange,
  options,
  value,
}: SceneParameterSelectProps) {
  return (
    <SceneCard.Row label={label}>
      <PillSelect onValueChange={onValueChange} value={value}>
        <PillSelect.Trigger label={label} />
        <PillSelect.Content>
          {options.map((option) => (
            <PillSelect.Option key={option.value} value={option.value}>
              {option.label}
            </PillSelect.Option>
          ))}
        </PillSelect.Content>
      </PillSelect>
    </SceneCard.Row>
  )
}

export { SceneGrid, type SceneGridProps }

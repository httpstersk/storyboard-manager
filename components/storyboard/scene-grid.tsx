"use client"

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
      {visibleScenes.map((scene, index) => (
        <GridScene
          key={scene.id}
          onEdit={() => onEditScene(scene.id)}
          onUpdate={(patch) => onUpdateScene(scene.id, patch)}
          scene={scene}
          sceneNumber={formatSceneNumber(index)}
          showParameters={showParameters}
        />
      ))}
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
      <SceneCard.Details>
        {showParameters && (
          <SceneParameters onUpdate={onUpdate} scene={scene} />
        )}
        <SceneCard.Notes>
          <SceneCard.NoteRow
            label="Action"
            onValueChange={(value) => onUpdate({ action: sanitizeNote(value) })}
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
            onValueChange={(value) => onUpdate({ music: sanitizeNote(value) })}
            placeholder="Add music"
            value={scene.music}
          />
        </SceneCard.Notes>
      </SceneCard.Details>
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

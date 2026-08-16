"use client"

import { useAtomValue } from "jotai"
import { SFArrowDownToLine, SFArrowUpToLine } from "sf-symbols-lib/monochrome"
import * as React from "react"

import { BoardToolbar } from "@/components/storyboard/board-toolbar"
import { SelectedBoardContext } from "@/components/storyboard/storyboard-workspace-selected-board-context"
import { SoundControl } from "@/components/storyboard/sound-control"
import { Field } from "@/components/ui/field"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Stepper } from "@/components/ui/stepper"
import { Switch } from "@/components/ui/switch"
import { exportBoardJson } from "@/lib/board-io"
import {
  IMAGE_MODEL_CONFIGS,
  IMAGE_MODELS,
  IMAGE_RESOLUTIONS,
  type ImageModel,
  type ImageResolution,
} from "@/lib/image-models"
import {
  SHOT_MODE_LABELS,
  SHOT_MODES,
  type ShotMode,
} from "@/lib/shot-mode-settings"
import { COLUMN_LIMITS, ROW_LIMITS, type Board } from "@/lib/storyboard"
import { seedanceVideoPromptAtom } from "@/lib/video-section-atoms"

interface WorkspaceExportActionsProps {
  /** Exports the selected board's scene grid as a PNG. */
  onExportPng: (board: Board) => Promise<void>
}

/** Board-dependent export actions isolated from the persistent toolbar. */
function WorkspaceExportActions({ onExportPng }: WorkspaceExportActionsProps) {
  const selectedBoard = React.use(SelectedBoardContext)
  const videoPrompt = useAtomValue(seedanceVideoPromptAtom)

  if (selectedBoard === null) {
    throw new Error(
      "Workspace export actions must be used within SelectedBoardContext."
    )
  }

  return (
    <>
      <BoardToolbar.Action
        onClick={() => exportBoardJson(selectedBoard, { videoPrompt })}
      >
        <SFArrowDownToLine aria-hidden />
        JSON
      </BoardToolbar.Action>
      <BoardToolbar.Action
        onClick={() => void onExportPng(selectedBoard)}
        variant="emphasis"
      >
        <SFArrowDownToLine aria-hidden />
        PNG
      </BoardToolbar.Action>
    </>
  )
}

interface GridSteppersProps {
  columns: number
  onColumnsChange: (columns: number) => void
  onRowsChange: (rows: number) => void
  rows: number
}

/** Rows and columns steppers of the board toolbar. */
function GridSteppers({
  columns,
  onColumnsChange,
  onRowsChange,
  rows,
}: GridSteppersProps) {
  return (
    <>
      <Field>
        <Field.Label>Rows</Field.Label>
        <Field.Control>
          <Stepper
            label="Rows"
            max={ROW_LIMITS.max}
            min={ROW_LIMITS.min}
            onValueChange={onRowsChange}
            value={rows}
          >
            <Stepper.Decrement />
            <Stepper.Value className="min-w-3" />
            <Stepper.Increment />
          </Stepper>
        </Field.Control>
      </Field>
      <Field>
        <Field.Label>Columns</Field.Label>
        <Field.Control>
          <Stepper
            label="Columns"
            max={COLUMN_LIMITS.max}
            min={COLUMN_LIMITS.min}
            onValueChange={onColumnsChange}
            value={columns}
          >
            <Stepper.Decrement />
            <Stepper.Value className="min-w-3" />
            <Stepper.Increment />
          </Stepper>
        </Field.Control>
      </Field>
    </>
  )
}

interface ImageModelFieldProps {
  /** Currently selected image generation model. */
  imageModel: ImageModel
  /** Updates the image generation model. */
  onImageModelChange: (value: string) => void
}

/** Image model switcher of the board toolbar. */
function ImageModelField({
  imageModel,
  onImageModelChange,
}: ImageModelFieldProps) {
  return (
    <Field>
      <Field.Label>Model</Field.Label>
      <Field.Control>
        <SegmentedControl
          label="Image model"
          onValueChange={onImageModelChange}
          value={imageModel}
        >
          {IMAGE_MODELS.map((model) => (
            <SegmentedControl.Option key={model} value={model}>
              {IMAGE_MODEL_CONFIGS[model].label}
            </SegmentedControl.Option>
          ))}
        </SegmentedControl>
      </Field.Control>
    </Field>
  )
}

interface ImageResolutionFieldProps {
  /** Currently selected model, which bounds the available resolutions. */
  imageModel: ImageModel
  /** Currently selected output resolution. */
  imageResolution: ImageResolution
  /** Updates the output resolution preference. */
  onImageResolutionChange: (value: string) => void
}

/** Resolution control; options the selected model can't output are disabled. */
function ImageResolutionField({
  imageModel,
  imageResolution,
  onImageResolutionChange,
}: ImageResolutionFieldProps) {
  const { label: modelLabel, supportedResolutions } =
    IMAGE_MODEL_CONFIGS[imageModel]

  return (
    <Field>
      <Field.Control>
        <SegmentedControl
          label="Output resolution"
          onValueChange={onImageResolutionChange}
          value={imageResolution}
        >
          {IMAGE_RESOLUTIONS.map((resolution) => {
            const isSupported = supportedResolutions.includes(resolution)

            return (
              <SegmentedControl.Option
                aria-label={
                  isSupported
                    ? undefined
                    : `${resolution} (unavailable with ${modelLabel})`
                }
                className="disabled:pointer-events-none disabled:opacity-40"
                disabled={!isSupported}
                key={resolution}
                value={resolution}
              >
                {resolution}
              </SegmentedControl.Option>
            )
          })}
        </SegmentedControl>
      </Field.Control>
    </Field>
  )
}

interface ShotModeFieldProps {
  /** Updates the multi-shot / continuous preference. */
  onShotModeChange: (value: string) => void
  /** Currently selected shot mode. */
  shotMode: ShotMode
}

/** Shot mode switcher deciding whether the board cuts or runs as one take. */
function ShotModeField({ onShotModeChange, shotMode }: ShotModeFieldProps) {
  return (
    <Field>
      <Field.Label>Shots</Field.Label>
      <Field.Control>
        <SegmentedControl
          label="Shot mode"
          onValueChange={onShotModeChange}
          value={shotMode}
        >
          {SHOT_MODES.map((mode) => (
            <SegmentedControl.Option key={mode} value={mode}>
              {SHOT_MODE_LABELS[mode]}
            </SegmentedControl.Option>
          ))}
        </SegmentedControl>
      </Field.Control>
    </Field>
  )
}

interface WorkspaceToolbarProps {
  /** Selected number of scene columns. */
  columns: number
  /** Whether generation locks to grayscale linear depth maps. */
  depthMapStyle: boolean
  /** Image generation model selected for new storyboards. */
  imageModel: ImageModel
  /** Output resolution selected for generation and editing. */
  imageResolution: ImageResolution
  /** Updates the selected number of scene columns. */
  onColumnsChange: (columns: number) => void
  /** Updates whether depth-map style generation is enabled. */
  onDepthMapStyleChange: (depthMapStyle: boolean) => void
  /** Exports the selected board's scene grid as a PNG. */
  onExportPng: (board: Board) => Promise<void>
  /** Updates the image generation model. */
  onImageModelChange: (value: string) => void
  /** Updates the output resolution preference. */
  onImageResolutionChange: (value: string) => void
  /** Opens the storyboard import file picker. */
  onImport: () => void
  /** Updates the selected number of scene rows. */
  onRowsChange: (rows: number) => void
  /** Updates the multi-shot / continuous preference. */
  onShotModeChange: (value: string) => void
  /** Updates whether scene parameters are visible. */
  onShowParametersChange: (showParameters: boolean) => void
  /** Selected number of scene rows. */
  rows: number
  /** Shot mode applied to planning and the Seedance video prompt. */
  shotMode: ShotMode
  /** Whether scene parameters are visible. */
  showParameters: boolean
}

/** Persistent toolbar shell that skips selected-board-only updates. */
function WorkspaceToolbar({
  columns,
  depthMapStyle,
  imageModel,
  imageResolution,
  onColumnsChange,
  onDepthMapStyleChange,
  onExportPng,
  onImageModelChange,
  onImageResolutionChange,
  onImport,
  onRowsChange,
  onShotModeChange,
  onShowParametersChange,
  rows,
  shotMode,
  showParameters,
}: WorkspaceToolbarProps) {
  return (
    <BoardToolbar>
      <BoardToolbar.Brand name="Boooards" version="v1.6" />
      <BoardToolbar.Controls>
        <GridSteppers
          columns={columns}
          onColumnsChange={onColumnsChange}
          onRowsChange={onRowsChange}
          rows={rows}
        />
        <ImageModelField
          imageModel={imageModel}
          onImageModelChange={onImageModelChange}
        />
        <ImageResolutionField
          imageModel={imageModel}
          imageResolution={imageResolution}
          onImageResolutionChange={onImageResolutionChange}
        />
        <ShotModeField
          onShotModeChange={onShotModeChange}
          shotMode={shotMode}
        />
        <Field>
          <Field.Label>Parameters</Field.Label>
          <Field.Control>
            <Switch
              checked={showParameters}
              onCheckedChange={onShowParametersChange}
            />
          </Field.Control>
        </Field>
        <Field>
          <Field.Label>Depth Map</Field.Label>
          <Field.Control>
            <Switch
              checked={depthMapStyle}
              onCheckedChange={onDepthMapStyleChange}
            />
          </Field.Control>
        </Field>
      </BoardToolbar.Controls>
      <BoardToolbar.Actions>
        <BoardToolbar.Action onClick={onImport}>
          <SFArrowUpToLine aria-hidden />
          Import
        </BoardToolbar.Action>
        <WorkspaceExportActions onExportPng={onExportPng} />
        <SoundControl />
        <BoardToolbar.ThemeToggle />
      </BoardToolbar.Actions>
    </BoardToolbar>
  )
}

export { WorkspaceToolbar, type WorkspaceToolbarProps }

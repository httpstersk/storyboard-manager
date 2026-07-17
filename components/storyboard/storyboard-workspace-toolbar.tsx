"use client"

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
import { type ImageModel, type ImageResolution } from "@/lib/generation"
import { COLUMN_LIMITS, ROW_LIMITS, type Board } from "@/lib/storyboard"

interface WorkspaceExportActionsProps {
  /** Exports the selected board's scene grid as a PNG. */
  onExportPng: (board: Board) => Promise<void>
}

/** Board-dependent export actions isolated from the persistent toolbar. */
function WorkspaceExportActions({ onExportPng }: WorkspaceExportActionsProps) {
  const selectedBoard = React.use(SelectedBoardContext)

  if (selectedBoard === null) {
    throw new Error(
      "Workspace export actions must be used within SelectedBoardContext."
    )
  }

  return (
    <>
      <BoardToolbar.Action onClick={() => exportBoardJson(selectedBoard)}>
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

interface WorkspaceToolbarProps {
  /** Selected number of scene columns. */
  columns: number
  /** Image generation model selected for new storyboards. */
  imageModel: ImageModel
  /** Output resolution selected for Pro generation and editing. */
  imageResolution: ImageResolution
  /** Updates the selected number of scene columns. */
  onColumnsChange: (columns: number) => void
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
  /** Updates whether scene parameters are visible. */
  onShowParametersChange: (showParameters: boolean) => void
  /** Selected number of scene rows. */
  rows: number
  /** Whether scene parameters are visible. */
  showParameters: boolean
}

/** Persistent toolbar shell that skips selected-board-only updates. */
function WorkspaceToolbar({
  columns,
  imageModel,
  imageResolution,
  onColumnsChange,
  onExportPng,
  onImageModelChange,
  onImageResolutionChange,
  onImport,
  onRowsChange,
  onShowParametersChange,
  rows,
  showParameters,
}: WorkspaceToolbarProps) {
  const isResolutionDisabled = imageModel === "lite"

  return (
    <BoardToolbar>
      <BoardToolbar.Brand name="Boooards" version="v1.3" />
      <BoardToolbar.Controls>
        <GridSteppers
          columns={columns}
          onColumnsChange={onColumnsChange}
          onRowsChange={onRowsChange}
          rows={rows}
        />
        <Field>
          <Field.Label>Nano Banana</Field.Label>
          <Field.Control>
            <div>
              <SegmentedControl
                label="Image model"
                onValueChange={onImageModelChange}
                value={imageModel}
              >
                <SegmentedControl.Option value="lite">
                  Lite
                </SegmentedControl.Option>
                <SegmentedControl.Option value="pro">
                  Pro
                </SegmentedControl.Option>
              </SegmentedControl>
            </div>
          </Field.Control>
        </Field>
        <Field>
          <Field.Label>Resolution</Field.Label>
          <Field.Control>
            <div>
              <SegmentedControl
                disabled={isResolutionDisabled}
                label={
                  isResolutionDisabled
                    ? "Output resolution (available with Nano Banana Pro)"
                    : "Output resolution"
                }
                onValueChange={onImageResolutionChange}
                value={imageResolution}
              >
                <SegmentedControl.Option value="1K">
                  1K
                </SegmentedControl.Option>
                <SegmentedControl.Option value="2K">
                  2K
                </SegmentedControl.Option>
                <SegmentedControl.Option value="4K">
                  4K
                </SegmentedControl.Option>
              </SegmentedControl>
            </div>
          </Field.Control>
        </Field>
        <Field>
          <Field.Label>Parameters</Field.Label>
          <Field.Control>
            <Switch
              checked={showParameters}
              onCheckedChange={onShowParametersChange}
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

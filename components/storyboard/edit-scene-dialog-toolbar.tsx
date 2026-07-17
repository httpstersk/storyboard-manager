"use client"

import {
  SFArrowCounterclockwise,
  SFEraser,
  SFIcloudAndArrowUp,
  SFPaintbrush,
  SFTrash,
} from "sf-symbols-lib/monochrome"
import * as React from "react"

import type { DrawTool } from "@/components/storyboard/scene-canvas"
import { IconButton } from "@/components/ui/icon-button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { ValueLimits } from "@/lib/storyboard"

/** Allowed range for the drawing brush size. */
const BRUSH_SIZE_LIMITS: ValueLimits = { max: 10, min: 1 }

/** Named swatches offered by the drawing colour picker. */
const DRAW_COLORS = [
  { label: "Black", value: "#1a1a1a" },
  { label: "Dark grey", value: "#4a4a4a" },
  { label: "Grey", value: "#8c8c8c" },
  { label: "Light grey", value: "#bdbdbd" },
  { label: "White", value: "#ffffff" },
] as const

/** Drawing tools offered by the tool picker. */
const DRAW_TOOLS = [
  { icon: SFPaintbrush, label: "Brush", value: "brush" },
  { icon: SFEraser, label: "Eraser", value: "eraser" },
] as const

interface DrawColorPickerProps {
  color: string
  onColorChange: (color: string) => void
}

/** Radiogroup of drawing colour swatches. */
function DrawColorPicker({ color, onColorChange }: DrawColorPickerProps) {
  return (
    <div
      aria-label="Drawing colour"
      className="flex items-center gap-1.5 pl-1"
      role="radiogroup"
    >
      {DRAW_COLORS.map((swatch) => (
        <button
          aria-checked={color === swatch.value}
          aria-label={swatch.label}
          className={cn(
            "size-4 rounded-full border border-edge-strong transition-[box-shadow,transform] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-90",
            color === swatch.value &&
              "ring-2 ring-emphasis ring-offset-2 ring-offset-surface-panel"
          )}
          key={swatch.value}
          onClick={() => onColorChange(swatch.value)}
          role="radio"
          style={{ backgroundColor: swatch.value }}
          type="button"
        />
      ))}
    </div>
  )
}

/** Validation error line for the upload drop zone. */
function UploadError({ error }: { error: string | null }) {
  if (error === null) {
    return null
  }

  return (
    <p className="text-caption text-destructive" role="alert">
      {error}
    </p>
  )
}

interface EditSceneDialogToolbarProps {
  /** Current brush size in pixels. */
  brushSize: number
  /** Whether clear is available on the drawing canvas. */
  canClear: boolean
  /** Whether undo is available on the drawing canvas. */
  canUndo: boolean
  /** Active drawing colour. */
  color: string
  /** Upload or drawing validation error, if any. */
  error: string | null
  /** Ref attached to the hidden file input. */
  fileInputRef: React.RefObject<HTMLInputElement | null>
  /** Whether an image edit request is currently in flight. */
  isEditingImage: boolean
  /** Clears all drawing strokes from the canvas. */
  onClearDrawing: () => void
  /** Updates the active brush size. */
  onSetBrushSize: (brushSize: number) => void
  /** Updates the active drawing colour. */
  onSetColor: (color: string) => void
  /** Updates the active drawing tool. */
  onSetTool: (tool: DrawTool) => void
  /** Undoes the most recent drawing stroke. */
  onUndo: () => void
  /** Active drawing tool. */
  tool: DrawTool
}

/** Upload, drawing tool, brush size, and colour controls for the edit dialog. */
function EditSceneDialogToolbar({
  brushSize,
  canClear,
  canUndo,
  color,
  error,
  fileInputRef,
  isEditingImage,
  onClearDrawing,
  onSetBrushSize,
  onSetColor,
  onSetTool,
  onUndo,
  tool,
}: EditSceneDialogToolbarProps) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-5">
      <div className="flex items-center gap-2.5">
        <button
          className="flex h-7 items-center gap-1.5 rounded-full bg-emphasis px-3 text-label font-medium text-emphasis-foreground transition-[background-color,transform] duration-150 ease-out outline-none hover:bg-emphasis/85 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          disabled={isEditingImage}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <SFIcloudAndArrowUp aria-hidden className="size-3.25" />
          Upload image
        </button>
        <UploadError error={error} />
        <SegmentedControl
          label="Drawing tool"
          onValueChange={(value) => onSetTool(value as DrawTool)}
          value={tool}
          variant="raised"
        >
          {DRAW_TOOLS.map((option) => (
            <SegmentedControl.Option key={option.value} value={option.value}>
              <option.icon aria-hidden />
              {option.label}
            </SegmentedControl.Option>
          ))}
        </SegmentedControl>
        <div className="flex items-center gap-2 rounded-full bg-surface-inset px-3 py-1.5">
          <span className="text-label text-ink-muted">Size</span>
          <Slider
            label="Brush size"
            max={BRUSH_SIZE_LIMITS.max}
            min={BRUSH_SIZE_LIMITS.min}
            onValueChange={([value]) => onSetBrushSize(value)}
            value={[brushSize]}
          />
          <span className="text-label text-ink">{brushSize}</span>
        </div>
        <DrawColorPicker color={color} onColorChange={onSetColor} />
      </div>
      <div className="flex items-center gap-1.5">
        <IconButton
          disabled={isEditingImage || !canUndo}
          label="Undo"
          onClick={onUndo}
        >
          <SFArrowCounterclockwise aria-hidden />
        </IconButton>
        <IconButton
          disabled={isEditingImage || !canClear}
          label="Clear all"
          onClick={onClearDrawing}
        >
          <SFTrash aria-hidden />
        </IconButton>
      </div>
    </div>
  )
}

export { EditSceneDialogToolbar, type EditSceneDialogToolbarProps }

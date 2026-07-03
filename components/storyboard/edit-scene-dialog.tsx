"use client"

import {
  Brush,
  CloudUpload,
  Eraser,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react"
import * as React from "react"

import { Dialog } from "@/components/ui/dialog"
import { IconButton } from "@/components/ui/icon-button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Slider } from "@/components/ui/slider"
import { formatSeconds, type Scene, type ValueLimits } from "@/lib/storyboard"
import { cn } from "@/lib/utils"
import { IMAGE_UPLOAD_RULES, validateImageFile } from "@/lib/validation"

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
  { icon: Pencil, label: "Pencil", value: "pencil" },
  { icon: Brush, label: "Brush", value: "brush" },
  { icon: Eraser, label: "Eraser", value: "eraser" },
] as const

type DrawTool = (typeof DRAW_TOOLS)[number]["value"]

/**
 * New reference image state for the scene being edited:
 * `undefined` = untouched, `null` = removed, string = new data URL.
 */
type DraftImage = string | null | undefined

/** Props for {@link EditSceneDialog}. */
interface EditSceneDialogProps {
  /** Called when the dialog requests to open or close. */
  onOpenChange: (open: boolean) => void
  /** Called with the scene patch when the user saves. */
  onSave: (patch: Partial<Scene>) => void
  /** Whether the dialog is open. */
  open: boolean
  /** Scene being edited, or null when the dialog is closed. */
  scene: Scene | null
  /** Two-digit display number of the scene, for example "01". */
  sceneNumber: string
}

/**
 * Modal editor for a single scene: reference image upload with
 * validation, drawing tool controls, and save/cancel actions.
 */
function EditSceneDialog({
  onOpenChange,
  onSave,
  open,
  scene,
  sceneNumber,
}: EditSceneDialogProps) {
  const [brushSize, setBrushSize] = React.useState(4)
  const [color, setColor] = React.useState<string>(DRAW_COLORS[0].value)
  const [draftImage, setDraftImage] = React.useState<DraftImage>(undefined)
  const [error, setError] = React.useState<string | null>(null)
  const [tool, setTool] = React.useState<DrawTool>("pencil")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  if (scene === null) {
    return null
  }

  const previewImage = draftImage === undefined ? scene.image : draftImage

  const resetState = () => {
    setBrushSize(4)
    setColor(DRAW_COLORS[0].value)
    setDraftImage(undefined)
    setError(null)
    setTool("pencil")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState()
    }

    onOpenChange(nextOpen)
  }

  const handleFile = (file: File) => {
    const result = validateImageFile(file)

    if (!result.ok) {
      setError(result.error ?? "This file cannot be used.")
      return
    }

    // Stored as a data URL so the image survives reloads and JSON export.
    const reader = new FileReader()

    reader.onload = () => {
      setDraftImage(reader.result as string)
      setError(null)
    }
    reader.onerror = () => {
      setError("This file could not be read.")
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setDraftImage(null)
    setError(null)
  }

  const handleSave = () => {
    if (draftImage !== undefined) {
      onSave({ image: draftImage ?? undefined })
    }

    resetState()
    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <Dialog.Content>
        <Dialog.Header>
          <div className="flex items-baseline gap-2.5">
            <Dialog.Title>Edit scene {sceneNumber}</Dialog.Title>
            <Dialog.Description>
              {formatSeconds(scene.timeSeconds)} · 16:9
            </Dialog.Description>
          </div>
          <Dialog.Close asChild>
            <IconButton label="Close">
              <X aria-hidden />
            </IconButton>
          </Dialog.Close>
        </Dialog.Header>
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-5">
          <div className="flex items-center gap-2.5">
            <button
              className="flex h-7 items-center gap-1.5 rounded-full bg-emphasis px-3 text-label font-medium text-emphasis-foreground transition-colors outline-none hover:bg-emphasis/85 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <CloudUpload aria-hidden className="size-3.25" />
              Upload image
            </button>
            <SegmentedControl
              label="Drawing tool"
              onValueChange={(value) => setTool(value as DrawTool)}
              value={tool}
              variant="raised"
            >
              {DRAW_TOOLS.map((option) => (
                <SegmentedControl.Option
                  key={option.value}
                  value={option.value}
                >
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
                onValueChange={([value]) => setBrushSize(value)}
                value={[brushSize]}
              />
              <span className="text-label text-ink">{brushSize}</span>
            </div>
            <DrawColorPicker color={color} onColorChange={setColor} />
          </div>
          <div className="flex items-center gap-1.5">
            <IconButton disabled label="Undo">
              <RotateCcw aria-hidden />
            </IconButton>
            <IconButton
              disabled={previewImage === undefined}
              label="Remove image"
              onClick={handleRemoveImage}
            >
              <Trash2 aria-hidden />
            </IconButton>
          </div>
        </div>
        <div className="flex min-h-95 flex-1 px-5 pb-1">
          <SceneCanvas
            error={error}
            fileInputRef={fileInputRef}
            image={previewImage}
            onFile={handleFile}
            sceneNumber={sceneNumber}
          />
        </div>
        <Dialog.Footer>
          <p className="text-caption text-ink-muted">
            Changes apply to scene {sceneNumber} only
          </p>
          <div className="flex items-center gap-2">
            <Dialog.Close asChild>
              <button
                className="flex h-7.5 items-center rounded-full bg-surface-inset px-4 text-label text-ink transition-colors outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              className="flex h-7.5 items-center rounded-full bg-emphasis px-4 text-label font-medium text-emphasis-foreground transition-colors outline-none hover:bg-emphasis/85 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={handleSave}
              type="button"
            >
              Save scene
            </button>
          </div>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  )
}

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
            "size-4 rounded-full border border-edge-strong outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
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

interface SceneCanvasProps {
  error: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  image: string | undefined | null
  onFile: (file: File) => void
  sceneNumber: string
}

/** Canvas area with the scene numeral and the image drop zone. */
function SceneCanvas({
  error,
  fileInputRef,
  image,
  onFile,
  sceneNumber,
}: SceneCanvasProps) {
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]

    if (file) {
      onFile(file)
    }
  }

  return (
    <div
      className="relative flex flex-1 items-center justify-center overflow-clip rounded-xl bg-surface-thumb"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <span className="text-[10rem] leading-none font-extralight tracking-display text-ink-on-media select-none sm:text-[16rem]">
        {sceneNumber}
      </span>
      <CanvasImage image={image} />
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="flex w-85 flex-col items-center gap-4 rounded-xl border border-edge-strong px-8 py-8">
          <div className="flex flex-col items-center gap-1">
            <p className="text-body font-medium text-ink">
              Drop an image here
            </p>
            <p className="text-caption text-ink-faint">
              PNG or JPG, up to 10 MB · or draw directly on the canvas
            </p>
            <UploadError error={error} />
          </div>
          <button
            className="rounded-full border border-edge-strong px-4 py-1.5 text-label font-medium text-ink transition-colors outline-none hover:bg-surface-panel focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            Browse files
          </button>
          <input
            accept={IMAGE_UPLOAD_RULES.acceptedTypes.join(",")}
            aria-label="Upload scene image"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]

              if (file) {
                onFile(file)
              }

              event.target.value = ""
            }}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </div>
      <span className="absolute right-3 bottom-2.5 z-20 rounded-full bg-ink-strong/55 px-2.5 py-[3px] text-caption text-ink-on-media">
        100%
      </span>
    </div>
  )
}

/** Uploaded image preview shown behind the drop zone. */
function CanvasImage({ image }: { image: string | undefined | null }) {
  if (!image) {
    return null
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URLs from local uploads cannot go through next/image
    <img
      alt="Uploaded scene reference"
      className="absolute inset-0 z-10 size-full object-cover"
      src={image}
    />
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

export { EditSceneDialog, type EditSceneDialogProps }

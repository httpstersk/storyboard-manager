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
import NextImage from "next/image"
import * as React from "react"

import { Dialog } from "@/components/ui/dialog"
import { IconButton } from "@/components/ui/icon-button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Slider } from "@/components/ui/slider"
import { useMountEffect } from "@/hooks/use-mount-effect"
import { formatSeconds, type Scene, type ValueLimits } from "@/lib/storyboard"
import { cn } from "@/lib/utils"
import { IMAGE_UPLOAD_RULES, validateImageFile } from "@/lib/validation"

/** Allowed range for the drawing brush size. */
const BRUSH_SIZE_LIMITS: ValueLimits = { max: 10, min: 1 }

/**
 * Brush strokes render this many times wider than the pencil at the same
 * size, giving the brush its heavier, softer mark.
 */
const BRUSH_WIDTH_SCALE = 2.5

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

interface DialogState {
  brushSize: number
  color: string
  draftImage: DraftImage
  error: string | null
  tool: DrawTool
}

type DialogAction =
  | { type: "CLEAR_IMAGE" }
  | { type: "RESET" }
  | { payload: number; type: "SET_BRUSH_SIZE" }
  | { payload: string; type: "SET_COLOR" }
  | { payload: DraftImage; type: "SET_DRAFT_IMAGE" }
  | { payload: string | null; type: "SET_ERROR" }
  | { payload: DrawTool; type: "SET_TOOL" }

const initialDialogState: DialogState = {
  brushSize: 4,
  color: DRAW_COLORS[0].value,
  draftImage: undefined,
  error: null,
  tool: "pencil",
}

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "CLEAR_IMAGE":
      return {
        ...state,
        draftImage: null,
        error: null,
      }
    case "RESET":
      return initialDialogState
    case "SET_BRUSH_SIZE":
      return { ...state, brushSize: action.payload }
    case "SET_COLOR":
      return { ...state, color: action.payload }
    case "SET_DRAFT_IMAGE":
      return { ...state, draftImage: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "SET_TOOL":
      return { ...state, tool: action.payload }
    default:
      return state
  }
}

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
  const [state, dispatch] = React.useReducer(dialogReducer, initialDialogState)
  const { brushSize, color, draftImage, error, tool } = state
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const drawingCanvasRef = React.useRef<DrawingCanvasHandle>(null)

  if (scene === null) {
    return null
  }

  const previewImage = draftImage === undefined ? scene.image : draftImage

  const resetState = () => {
    dispatch({ type: "RESET" })
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
      dispatch({ payload: result.error ?? "This file cannot be used.", type: "SET_ERROR" })
      return
    }

    // Stored as a data URL so the image survives reloads and JSON export.
    const reader = new FileReader()

    reader.onload = () => {
      dispatch({ payload: reader.result as string, type: "SET_DRAFT_IMAGE" })
      dispatch({ payload: null, type: "SET_ERROR" })
    }
    reader.onerror = () => {
      dispatch({ payload: "This file could not be read.", type: "SET_ERROR" })
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    dispatch({ type: "CLEAR_IMAGE" })
  }

  const handleSave = async () => {
    const drawing = drawingCanvasRef.current?.getDrawing() ?? null

    if (drawing !== null) {
      // The user painted something: flatten the strokes over whatever is
      // currently behind them (an uploaded or existing reference image)
      // so the scene card shows the finished artwork rather than the
      // pre-drawing state.
      const image = await composeSceneImage(previewImage, drawing)
      onSave({ image })
    } else if (draftImage !== undefined) {
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
              className="flex h-7 items-center gap-1.5 rounded-full bg-emphasis px-3 text-label font-medium text-emphasis-foreground outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-emphasis/85 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <CloudUpload aria-hidden className="size-3.25" />
              Upload image
            </button>
            <UploadError error={error} />
            <SegmentedControl
              label="Drawing tool"
              onValueChange={(value) => dispatch({ payload: value as DrawTool, type: "SET_TOOL" })}
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
                onValueChange={([value]) => dispatch({ payload: value, type: "SET_BRUSH_SIZE" })}
                value={[brushSize]}
              />
              <span className="text-label text-ink">{brushSize}</span>
            </div>
            <DrawColorPicker color={color} onColorChange={(nextColor) => dispatch({ payload: nextColor, type: "SET_COLOR" })} />
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
        <div className="flex w-full px-5 pb-1">
          <SceneCanvas
            brushSize={brushSize}
            color={color}
            drawingCanvasRef={drawingCanvasRef}
            fileInputRef={fileInputRef}
            image={previewImage}
            onFile={handleFile}
            sceneNumber={sceneNumber}
            tool={tool}
          />
        </div>
        <Dialog.Footer>
          <p className="text-caption text-ink-muted">
            Changes apply to scene {sceneNumber} only
          </p>
          <div className="flex items-center gap-2">
            <Dialog.Close asChild>
              <button
                className="flex h-7.5 items-center rounded-full bg-surface-inset px-4 text-label text-ink outline-none transition-[color,transform] duration-150 ease-out hover:text-ink-strong active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              className="flex h-7.5 items-center rounded-full bg-emphasis px-4 text-label font-medium text-emphasis-foreground outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-emphasis/85 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => void handleSave()}
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
            "size-4 rounded-full border border-edge-strong outline-none transition-[box-shadow,transform] duration-150 ease-out active:scale-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
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
  brushSize: number
  color: string
  drawingCanvasRef: React.RefObject<DrawingCanvasHandle | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  image: string | undefined | null
  onFile: (file: File) => void
  sceneNumber: string
  tool: DrawTool
}

/**
 * Canvas area with the scene numeral, freehand drawing surface, and image
 * drop target.
 */
function SceneCanvas({
  brushSize,
  color,
  drawingCanvasRef,
  fileInputRef,
  image,
  onFile,
  sceneNumber,
  tool,
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
      className="relative flex w-full aspect-video items-center justify-center overflow-clip rounded-xl bg-surface-thumb"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      {!image && (
        <span className="text-canvas leading-none font-extralight tracking-display text-ink-on-media select-none dark:text-emphasis-foreground/80 sm:text-canvas-lg">
          {sceneNumber}
        </span>
      )}
      <CanvasImage image={image} />
      <DrawingCanvas
        brushSize={brushSize}
        color={color}
        ref={drawingCanvasRef}
        tool={tool}
      />
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
    <NextImage
      alt="Uploaded scene reference"
      className="absolute inset-0 z-10 size-full object-cover"
      fill
      src={image}
      unoptimized
    />
  )
}

/** A pointer position in CSS pixels, relative to the canvas top-left. */
interface Point {
  x: number
  y: number
}

/** Returns the pointer position within the canvas, in CSS pixels. */
function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: React.PointerEvent<HTMLCanvasElement>
): Point {
  const rect = canvas.getBoundingClientRect()

  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

/**
 * Matches the canvas backing store to its rendered size scaled by the
 * device pixel ratio (so strokes stay crisp) and scales the context so
 * drawing code can work in CSS-pixel coordinates. Any existing drawing is
 * preserved across the resize.
 *
 * The layout size (`clientWidth`/`clientHeight`) is used rather than
 * `getBoundingClientRect`, so the open/close zoom transform on the dialog
 * can't make the backing store settle at the wrong size.
 */
function syncCanvasSize(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d")

  if (context === null) {
    return
  }

  const ratio = window.devicePixelRatio || 1
  const cssWidth = canvas.clientWidth
  const cssHeight = canvas.clientHeight
  const width = Math.round(cssWidth * ratio)
  const height = Math.round(cssHeight * ratio)

  if (width === 0 || height === 0) {
    return
  }

  if (canvas.width === width && canvas.height === height) {
    return
  }

  // Resizing the backing store clears it, so copy the current drawing out
  // first and scale it back in afterwards.
  let previous: HTMLCanvasElement | null = null

  if (canvas.width > 0 && canvas.height > 0) {
    previous = document.createElement("canvas")
    previous.width = canvas.width
    previous.height = canvas.height
    previous.getContext("2d")?.drawImage(canvas, 0, 0)
  }

  canvas.width = width
  canvas.height = height
  context.setTransform(ratio, 0, 0, ratio, 0, 0)

  if (previous !== null) {
    context.drawImage(previous, 0, 0, cssWidth, cssHeight)
  }
}

/** Applies the stroke settings for the active tool to the context. */
function configureStroke(
  context: CanvasRenderingContext2D,
  tool: DrawTool,
  color: string,
  brushSize: number
): void {
  context.lineCap = "round"
  context.lineJoin = "round"

  if (tool === "eraser") {
    context.globalCompositeOperation = "destination-out"
    context.strokeStyle = "#000000"
    context.lineWidth = brushSize * BRUSH_WIDTH_SCALE

    return
  }

  context.globalCompositeOperation = "source-over"
  context.strokeStyle = color
  context.lineWidth =
    tool === "brush" ? brushSize * BRUSH_WIDTH_SCALE : brushSize
}

/** Strokes a line between two points; a zero-length line draws a dot. */
function drawSegment(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point
): void {
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
}

/**
 * Returns a standalone copy of the drawing when the overlay holds any
 * painted pixels, or null when it is still blank. The copy is detached
 * from the live element so it survives the dialog closing after a save.
 */
function captureDrawing(
  canvas: HTMLCanvasElement | null
): HTMLCanvasElement | null {
  if (canvas === null || canvas.width === 0 || canvas.height === 0) {
    return null
  }

  const context = canvas.getContext("2d")

  if (context === null) {
    return null
  }

  // The overlay starts fully transparent, so any non-zero alpha byte means
  // the user has drawn at least one mark.
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  let hasStrokes = false

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] !== 0) {
      hasStrokes = true
      break
    }
  }

  if (!hasStrokes) {
    return null
  }

  const copy = document.createElement("canvas")
  copy.width = canvas.width
  copy.height = canvas.height
  copy.getContext("2d")?.drawImage(canvas, 0, 0)

  return copy
}

/** Loads an image element from a URL, rejecting if it cannot decode. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("The image could not be loaded."))
    image.src = src
  })
}

/**
 * Draws `image` to fill the width x height box while preserving its aspect
 * ratio and cropping the overflow — the canvas equivalent of CSS
 * `object-fit: cover`, matching how reference images are displayed.
 */
function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
): void {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale

  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  )
}

/**
 * Flattens a freehand drawing over its background reference image (when
 * one is present) into a single PNG data URL for storing as the scene
 * image. A missing or unreadable background is ignored so the strokes are
 * always captured.
 */
async function composeSceneImage(
  background: string | null | undefined,
  drawing: HTMLCanvasElement
): Promise<string> {
  const output = document.createElement("canvas")
  output.width = drawing.width
  output.height = drawing.height

  const context = output.getContext("2d")

  if (context === null) {
    return drawing.toDataURL("image/png")
  }

  if (background) {
    try {
      const image = await loadImage(background)
      drawImageCover(context, image, output.width, output.height)
    } catch {
      // Keep the strokes even when the background image can't be drawn.
    }
  }

  context.drawImage(drawing, 0, 0)

  return output.toDataURL("image/png")
}

/** Imperative handle exposed by {@link DrawingCanvas}. */
interface DrawingCanvasHandle {
  /**
   * Returns a detached copy of the painted drawing, or null when nothing
   * has been drawn (so save can fall back to the untouched scene image).
   */
  getDrawing: () => HTMLCanvasElement | null
}

interface DrawingCanvasProps {
  brushSize: number
  color: string
  ref?: React.Ref<DrawingCanvasHandle>
  tool: DrawTool
}

/**
 * Transparent overlay that captures pointer input and renders freehand
 * strokes for the active tool. Sits above the reference image so drawings
 * annotate it, and keeps the in-progress stroke in refs to avoid
 * re-rendering on every pointer move. Exposes {@link DrawingCanvasHandle}
 * so the editor can capture the finished artwork on save.
 */
function DrawingCanvas({ brushSize, color, ref, tool }: DrawingCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const drawingRef = React.useRef(false)
  const lastPointRef = React.useRef<Point | null>(null)

  React.useImperativeHandle(
    ref,
    () => ({ getDrawing: () => captureDrawing(canvasRef.current) }),
    []
  )

  useMountEffect(() => {
    const canvas = canvasRef.current

    if (canvas === null) {
      return
    }

    syncCanvasSize(canvas)

    const observer = new ResizeObserver(() => syncCanvasSize(canvas))
    observer.observe(canvas)

    return () => observer.disconnect()
  })

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")

    if (!canvas || !context) {
      return
    }

    canvas.setPointerCapture(event.pointerId)
    drawingRef.current = true

    const point = getCanvasPoint(canvas, event)
    lastPointRef.current = point
    configureStroke(context, tool, color, brushSize)
    drawSegment(context, point, point)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")

    if (!drawingRef.current || !canvas || !context) {
      return
    }

    const point = getCanvasPoint(canvas, event)
    drawSegment(context, lastPointRef.current ?? point, point)
    lastPointRef.current = point
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current

    if (!drawingRef.current) {
      return
    }

    drawingRef.current = false
    lastPointRef.current = null

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <canvas
      className="absolute inset-0 z-10 size-full cursor-crosshair touch-none"
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={canvasRef}
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

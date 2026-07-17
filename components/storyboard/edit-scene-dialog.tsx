"use client"

import { useAtomValue } from "jotai"
import {
  SFArrowLeft,
  SFArrowRight,
  SFArrowCounterclockwise,
  SFEraser,
  SFIcloudAndArrowUp,
  SFPaintbrush,
  SFPencil,
  SFTrash,
  SFXmark,
} from "sf-symbols-lib/monochrome"
import * as React from "react"

import {
  type DrawTool,
  type DrawingCanvasHandle,
  SceneCanvas,
} from "@/components/storyboard/scene-canvas"
import { PromptComposer } from "@/components/storyboard/prompt-composer"
import { Dialog } from "@/components/ui/dialog"
import { IconButton } from "@/components/ui/icon-button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Slider } from "@/components/ui/slider"
import { sceneImageEditResponseSchema } from "@/lib/generation"
import { imageModelAtom } from "@/lib/image-model-settings"
import { formatSeconds, type Scene, type ValueLimits } from "@/lib/storyboard"
import { cn } from "@/lib/utils"
import { validateImageFile } from "@/lib/validation"

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
  { icon: SFPencil, label: "Pencil", value: "pencil" },
  { icon: SFPaintbrush, label: "Brush", value: "brush" },
  { icon: SFEraser, label: "Eraser", value: "eraser" },
] as const

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
  isEditingImage: boolean
  tool: DrawTool
}

type DialogAction =
  | { type: "RESET" }
  | { payload: number; type: "SET_BRUSH_SIZE" }
  | { payload: string; type: "SET_COLOR" }
  | { payload: DraftImage; type: "SET_DRAFT_IMAGE" }
  | { payload: string | null; type: "SET_ERROR" }
  | { payload: boolean; type: "SET_IS_EDITING_IMAGE" }
  | { payload: DrawTool; type: "SET_TOOL" }

const initialDialogState: DialogState = {
  brushSize: 7,
  color: DRAW_COLORS[0].value,
  draftImage: undefined,
  error: null,
  isEditingImage: false,
  tool: "pencil",
}

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
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
    case "SET_IS_EDITING_IMAGE":
      return { ...state, isEditingImage: action.payload }
    case "SET_TOOL":
      return { ...state, tool: action.payload }
    default:
      return state
  }
}

/** Props for {@link EditSceneDialog}. */
interface EditSceneDialogProps {
  /** Whether navigation to the next scene is available. */
  canNavigateNext: boolean
  /** Whether navigation to the previous scene is available. */
  canNavigatePrevious: boolean
  /** Called to navigate to the next scene while keeping dialog open. */
  onNavigateNext: () => void
  /** Called to navigate to the previous scene while keeping dialog open. */
  onNavigatePrevious: () => void
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
  canNavigateNext,
  canNavigatePrevious,
  onNavigateNext,
  onNavigatePrevious,
  onOpenChange,
  onSave,
  open,
  scene,
  sceneNumber,
}: EditSceneDialogProps) {
  const imageModel = useAtomValue(imageModelAtom)
  const [canClear, setCanClear] = React.useState(false)
  const [canUndo, setCanUndo] = React.useState(false)
  const drawingCanvasRef = React.useRef<DrawingCanvasHandle>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [state, dispatch] = React.useReducer(dialogReducer, initialDialogState)
  const { brushSize, color, draftImage, error, isEditingImage, tool } = state
  const previousSceneIdRef = React.useRef<string | null>(null)
  const previewImage = draftImage === undefined ? scene?.image : draftImage

  function handleClearDrawing() {
    drawingCanvasRef.current?.clear()
  }

  function handleFile(file: File) {
    const result = validateImageFile(file)

    if (!result.ok) {
      dispatch({
        payload: result.error ?? "This file cannot be used.",
        type: "SET_ERROR",
      })
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

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isEditingImage) {
      return
    }

    if (!nextOpen) {
      resetState()
    }

    onOpenChange(nextOpen)
  }

  function handleNavigateNext() {
    if (!isEditingImage && canNavigateNext) {
      onNavigateNext()
    }
  }

  function handleNavigatePrevious() {
    if (!isEditingImage && canNavigatePrevious) {
      onNavigatePrevious()
    }
  }

  async function handleImageEdit(prompt: string) {
    if (!previewImage) {
      dispatch({
        payload: "Add an image before requesting an edit.",
        type: "SET_ERROR",
      })

      return
    }

    dispatch({ payload: null, type: "SET_ERROR" })
    dispatch({ payload: true, type: "SET_IS_EDITING_IMAGE" })

    try {
      const response = await fetch("/api/edit-scene-image", {
        body: JSON.stringify({ imageModel, prompt, sourceImage: previewImage }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
      const responseBody: unknown = await response.json()

      if (!response.ok) {
        const message =
          typeof responseBody === "object" &&
          responseBody !== null &&
          "error" in responseBody &&
          typeof responseBody.error === "string"
            ? responseBody.error
            : "The scene image could not be edited."

        throw new Error(message)
      }

      const result = sceneImageEditResponseSchema.parse(responseBody)
      dispatch({ payload: result.image, type: "SET_DRAFT_IMAGE" })
    } catch (imageEditError) {
      const message =
        imageEditError instanceof Error
          ? imageEditError.message
          : "The scene image could not be edited."

      dispatch({ payload: message, type: "SET_ERROR" })
      throw new Error(message)
    } finally {
      dispatch({ payload: false, type: "SET_IS_EDITING_IMAGE" })
    }
  }

  async function handleSave() {
    if (isEditingImage) {
      return
    }

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

  function handleUndo() {
    drawingCanvasRef.current?.undo()
  }

  function resetState() {
    dispatch({ type: "RESET" })
    setCanClear(false)
    setCanUndo(false)
  }

  React.useEffect(() => {
    if (!open || scene === null) {
      previousSceneIdRef.current = null
      return
    }

    if (previousSceneIdRef.current !== null && previousSceneIdRef.current !== scene.id) {
      resetState()
    }

    previousSceneIdRef.current = scene.id
  }, [open, scene])

  React.useEffect(() => {
    if (!open) {
      return
    }

    function isTextEntryTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) {
        return false
      }

      const tagName = target.tagName.toLowerCase()

      if (tagName === "input" || tagName === "textarea" || target.isContentEditable) {
        return true
      }

      return target.closest("[contenteditable='true']") !== null
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isEditingImage ||
        isTextEntryTarget(event.target)
      ) {
        return
      }

      if (event.key === "ArrowLeft" && canNavigatePrevious) {
        event.preventDefault()
        onNavigatePrevious()
      } else if (event.key === "ArrowRight" && canNavigateNext) {
        event.preventDefault()
        onNavigateNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    canNavigateNext,
    canNavigatePrevious,
    isEditingImage,
    onNavigateNext,
    onNavigatePrevious,
    open,
  ])

  if (scene === null) {
    return null
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <Dialog.Content>
        <Dialog.Header>
          <div className="flex items-baseline gap-2.5">
            <Dialog.Title>Edit scene {sceneNumber}</Dialog.Title>
            <Dialog.Description>
              {formatSeconds(scene.timeSeconds)}
            </Dialog.Description>
          </div>
          <div className="flex items-center gap-1.5">
            <IconButton
              disabled={isEditingImage || !canNavigatePrevious}
              label="Previous scene"
              onClick={handleNavigatePrevious}
            >
              <SFArrowLeft aria-hidden />
            </IconButton>
            <IconButton
              disabled={isEditingImage || !canNavigateNext}
              label="Next scene"
              onClick={handleNavigateNext}
            >
              <SFArrowRight aria-hidden />
            </IconButton>
            <Dialog.Close asChild>
              <IconButton label="Close">
                <SFXmark aria-hidden />
              </IconButton>
            </Dialog.Close>
          </div>
        </Dialog.Header>
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
              onValueChange={(value) =>
                dispatch({ payload: value as DrawTool, type: "SET_TOOL" })
              }
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
                onValueChange={([value]) =>
                  dispatch({ payload: value, type: "SET_BRUSH_SIZE" })
                }
                value={[brushSize]}
              />
              <span className="text-label text-ink">{brushSize}</span>
            </div>
            <DrawColorPicker
              color={color}
              onColorChange={(nextColor) =>
                dispatch({ payload: nextColor, type: "SET_COLOR" })
              }
            />
          </div>
          <div className="flex items-center gap-1.5">
            <IconButton
              disabled={isEditingImage || !canUndo}
              label="Undo"
              onClick={handleUndo}
            >
              <SFArrowCounterclockwise aria-hidden />
            </IconButton>
            <IconButton
              disabled={isEditingImage || !canClear}
              label="Clear all"
              onClick={handleClearDrawing}
            >
              <SFTrash aria-hidden />
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
            isDisabled={isEditingImage}
            onFile={handleFile}
            onHistoryChange={({ canClear, canUndo }) => {
              setCanClear(canClear)
              setCanUndo(canUndo)
            }}
            sceneNumber={sceneNumber}
            tool={tool}
          />
        </div>
        {scene.image ? (
          <div className="px-5 pb-1">
            <PromptComposer.Root
              disabled={isEditingImage}
              inputId={`scene-${scene.id}-image-edit-prompt`}
              mode="image-edit"
              onImageEditSubmit={handleImageEdit}
            >
              <PromptComposer.Input />
              <PromptComposer.Actions />
            </PromptComposer.Root>
          </div>
        ) : null}
        <Dialog.Footer>
          <p className="text-caption text-ink-muted">
            Changes apply to scene {sceneNumber} only
          </p>
          <div className="flex items-center gap-2">
            <Dialog.Close asChild>
              <button
                className="flex h-7.5 items-center rounded-full bg-surface-inset px-4 text-label text-ink transition-[color,transform] duration-150 ease-out outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                disabled={isEditingImage}
                type="button"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              className="flex h-7.5 items-center rounded-full bg-emphasis px-4 text-label font-medium text-emphasis-foreground transition-[background-color,transform] duration-150 ease-out outline-none hover:bg-emphasis/85 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              disabled={isEditingImage}
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

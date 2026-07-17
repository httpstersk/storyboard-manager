"use client"

import { useAtomValue } from "jotai"
import * as React from "react"
import { useEffectEvent } from "react"

import {
  type DrawTool,
  type DrawingCanvasHandle,
  SceneCanvas,
} from "@/components/storyboard/scene-canvas"
import { EditSceneDialogFooter } from "@/components/storyboard/edit-scene-dialog-footer"
import { EditSceneDialogHeader } from "@/components/storyboard/edit-scene-dialog-header"
import { EditSceneDialogToolbar } from "@/components/storyboard/edit-scene-dialog-toolbar"
import { EditSceneImagePrompt } from "@/components/storyboard/edit-scene-image-prompt"
import { Dialog } from "@/components/ui/dialog"
import { requestSceneImageEdit } from "@/lib/edit-scene-image-client"
import { imageModelAtom } from "@/lib/image-model-settings"
import { type Scene } from "@/lib/storyboard"
import { validateImageFile } from "@/lib/validation"

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
  color: "#1a1a1a",
  draftImage: undefined,
  error: null,
  isEditingImage: false,
  tool: "brush",
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

/** Resets dialog editing state when the scene changes or the dialog closes. */
function resetEditSceneDialogState(
  dispatch: React.Dispatch<DialogAction>,
  setCanClear: React.Dispatch<React.SetStateAction<boolean>>,
  setCanUndo: React.Dispatch<React.SetStateAction<boolean>>
): void {
  dispatch({ type: "RESET" })
  setCanClear(false)
  setCanUndo(false)
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
      resetEditSceneDialogState(dispatch, setCanClear, setCanUndo)
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

    const editResult = await requestSceneImageEdit({
      imageModel,
      prompt,
      sourceImage: previewImage,
    })
      .then((image) => ({ image, ok: true as const }))
      .catch((error: unknown) => ({
        error:
          error instanceof Error
            ? error.message
            : "The scene image could not be edited.",
        ok: false as const,
      }))

    dispatch({ payload: false, type: "SET_IS_EDITING_IMAGE" })

    if (!editResult.ok) {
      throw new Error(editResult.error)
    }

    dispatch({ payload: editResult.image, type: "SET_DRAFT_IMAGE" })
  }

  async function handleSave() {
    if (isEditingImage) {
      return
    }

    const drawing = drawingCanvasRef.current?.getDrawing() ?? null

    if (drawing !== null) {
      const image = await composeSceneImage(previewImage, drawing)
      onSave({ image })
    } else if (draftImage !== undefined) {
      onSave({ image: draftImage ?? undefined })
    }

    resetEditSceneDialogState(dispatch, setCanClear, setCanUndo)
    onOpenChange(false)
  }

  function handleUndo() {
    drawingCanvasRef.current?.undo()
  }

  React.useEffect(() => {
    if (!open || scene === null) {
      previousSceneIdRef.current = null
      return
    }

    if (previousSceneIdRef.current !== null && previousSceneIdRef.current !== scene.id) {
      resetEditSceneDialogState(dispatch, setCanClear, setCanUndo)
    }

    previousSceneIdRef.current = scene.id
  }, [open, scene])

  const handleNavigateNextEvent = useEffectEvent(() => {
    onNavigateNext()
  })
  const handleNavigatePreviousEvent = useEffectEvent(() => {
    onNavigatePrevious()
  })

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
        handleNavigatePreviousEvent()
      } else if (event.key === "ArrowRight" && canNavigateNext) {
        event.preventDefault()
        handleNavigateNextEvent()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [canNavigateNext, canNavigatePrevious, isEditingImage, open])

  if (scene === null) {
    return null
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <Dialog.Content>
        <EditSceneDialogHeader
          canNavigateNext={canNavigateNext}
          canNavigatePrevious={canNavigatePrevious}
          isEditingImage={isEditingImage}
          onNavigateNext={handleNavigateNext}
          onNavigatePrevious={handleNavigatePrevious}
          scene={scene}
          sceneNumber={sceneNumber}
        />
        <EditSceneDialogToolbar
          brushSize={brushSize}
          canClear={canClear}
          canUndo={canUndo}
          color={color}
          error={error}
          fileInputRef={fileInputRef}
          isEditingImage={isEditingImage}
          onClearDrawing={handleClearDrawing}
          onSetBrushSize={(nextBrushSize) =>
            dispatch({ payload: nextBrushSize, type: "SET_BRUSH_SIZE" })
          }
          onSetColor={(nextColor) =>
            dispatch({ payload: nextColor, type: "SET_COLOR" })
          }
          onSetTool={(nextTool) =>
            dispatch({ payload: nextTool, type: "SET_TOOL" })
          }
          onUndo={handleUndo}
          tool={tool}
        />
        <div className="flex w-full px-5 pb-1">
          <div className="relative w-full">
            <SceneCanvas
              brushSize={brushSize}
              color={color}
              drawingCanvasRef={drawingCanvasRef}
              fileInputRef={fileInputRef}
              image={previewImage}
              isDisabled={isEditingImage}
              onFile={handleFile}
              onHistoryChange={({ canClear: nextCanClear, canUndo: nextCanUndo }) => {
                setCanClear(nextCanClear)
                setCanUndo(nextCanUndo)
              }}
              sceneNumber={sceneNumber}
              tool={tool}
            />
            {scene.image ? (
              <EditSceneImagePrompt.Root
                key={`${scene.id}-${String(open)}`}
                disabled={isEditingImage}
                inputId={`scene-${scene.id}-image-edit-prompt`}
                onImageEditSubmit={handleImageEdit}
              />
            ) : null}
          </div>
        </div>
        <EditSceneDialogFooter
          isEditingImage={isEditingImage}
          onSave={() => void handleSave()}
          sceneNumber={sceneNumber}
        />
      </Dialog.Content>
    </Dialog>
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

export { EditSceneDialog, type EditSceneDialogProps }

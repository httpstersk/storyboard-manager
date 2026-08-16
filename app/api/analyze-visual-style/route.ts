import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

import { MAX_VISUAL_STYLE_LENGTH } from "@/lib/board-composer"
import {
  visualStyleAnalysisRequestSchema,
  visualStyleAnalysisResponseSchema,
} from "@/lib/generation"

/** Vision analysis is short; allow generous headroom on supported hosts. */
export const maxDuration = 120

/** Ensures the provider SDK runs in a full Node.js environment. */
export const runtime = "nodejs"

/**
 * Cinematographer persona that turns reference frames into a single dense,
 * technical style line covering capture medium, optics, exposure, and grade.
 */
const VISUAL_STYLE_SYSTEM_PROMPT = `You are a cinematographer and colourist reverse-engineering the look of reference frames. Study the supplied image or images and infer the technical recipe that would recreate their shared look.

Output rules:
- Return one continuous sentence, comma-separated, with no line breaks, no preamble, and no markdown.
- Cover, when inferable: capture medium (camera body and format, or the illustration/animation medium), film stock or sensor and effective ISO, lens focal length and aperture, shutter, lighting conditions, contrast, shadow and highlight behaviour, grain or texture, and any printing or grading treatment.
- Prefer concrete, plausible technical values over vague adjectives; do not hedge with phrases like "appears to be".
- When the images share a coherent look, describe that single look; if they diverge, describe the dominant one.

Example of the expected form and density:
Shot on a Leica M6 35mm camera, Kodak Tri-X 400 black-and-white film pushed to ISO 1600, 85mm lens at f/2.0, 1/250s shutter, studio conditions, extremely high contrast, deep crushed shadows, bright specular highlights, minimal grain, printed with hard Grade 4-5 contrast filter.`

/**
 * Analyses uploaded style reference images with an OpenAI vision model and
 * returns a single technical visual-style description for the composer field.
 */
export async function POST(request: Request): Promise<Response> {
  if (process.env.OPENAI_API_KEY === undefined) {
    return Response.json(
      { error: "Visual style analysis is not configured." },
      { status: 503 }
    )
  }

  try {
    const parsedRequest = visualStyleAnalysisRequestSchema.safeParse(
      await request.json()
    )

    if (!parsedRequest.success) {
      return Response.json(
        { error: "Check the uploaded style reference images." },
        { status: 400 }
      )
    }

    const { styleImageRefs } = parsedRequest.data
    const { text } = await generateText({
      maxRetries: 1,
      messages: [
        {
          content: [
            {
              text: "Analyse the shared visual style of the following reference image(s) and describe how to recreate their look.",
              type: "text",
            },
            ...styleImageRefs.map((image) => ({
              image,
              type: "image" as const,
            })),
          ],
          role: "user",
        },
      ],
      model: openai("gpt-5.4-mini"),
      system: VISUAL_STYLE_SYSTEM_PROMPT,
    })

    const visualStyle = text.trim().slice(0, MAX_VISUAL_STYLE_LENGTH)

    if (visualStyle === "") {
      throw new Error("The model returned an empty visual-style description.")
    }

    return Response.json(
      visualStyleAnalysisResponseSchema.parse({ visualStyle })
    )
  } catch (error) {
    console.error("Visual style analysis failed:", error)

    return Response.json(
      { error: "The style images could not be analysed. Please try again." },
      { status: 500 }
    )
  }
}

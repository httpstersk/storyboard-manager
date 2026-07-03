import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Register the design system's font-size utilities; without this,
// tailwind-merge treats them as text-color classes and drops them
// whenever a text-* color utility appears in the same cn() call.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["body", "caption", "display", "heading", "label", "title"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

"use client"

import * as React from "react"

import type { Board } from "@/lib/storyboard"

/** Selected board consumed only by board-dependent toolbar export actions. */
export const SelectedBoardContext = React.createContext<Board | null>(null)

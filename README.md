# Boooards

A professional, interactive storyboard manager built with **Next.js**, **Tailwind CSS**, and **shadcn/ui**. Designed for filmmakers, directors, animators, and visual designers to plan, organize, and visualize scenes dynamically in a grid workspace.

---

## 🎬 Overview & Purpose

The Boooards provides a responsive, responsive-grid workspace that acts as a thin interactive layer over local data. It allows users to structure film or animation boards, adjust grid rows and columns dynamically, upload or sketch scene thumbnails, edit camera parameters, write notes, and export high-fidelity results.

All board data is automatically persisted locally and features interactive WebGL animated mesh gradients, procedural audio feedback, and dual-theme capability.

---

## ✨ Core Features

### 📐 Workspace & Grid Layout
- **Dynamic Dimensions**: Scale the board workspace grid up to **4 columns** and **9 rows** (minimum 1x1) using interactive steppers. Grid cells reflow smoothly using spring-based motion.
- **Toggleable Parameters**: Show or hide granular parameters (like camera, lens, and movement) across all cards simultaneously to focus on visual layout or detailed notes.
- **Searchable Sidebar**: Manage, search, and switch between multiple storyboard files. A responsive floating sidebar overlays the board, keeping workspace width constant.

### 🎥 Detailed Scene Customization
Each scene card supports granular industry-standard parameters:
- **Shot Size**: Segmented control for quick selection of **Wide Shot (WS)**, **Medium Shot (MS)**, **Medium Close-up (MCU)**, and **Close-up (CU)**.
- **Camera Configurations**: Alexa 35, Sony Venice 2, and RED Komodo-X.
- **Lens Selection**: Wide range of focal lengths (Signature 18mm, 21mm, 40mm, 75mm; Cooke S7 50mm, 75mm; Zeiss Supreme 29mm, 50mm).
- **Camera Movement**: Static, Handheld, Steadicam, Crane up, Dolly in, and Drone pull-back.
- **Lighting Atmosphere**: Night/moonlit, Golden hour, Blue hour, Hard noon sun, Practical neon, Overcast soft, and Sodium vapor.
- **Time/Duration**: Fine-tune individual scene runtimes between 1 and 60 seconds.
- **Notes Suite**: Dedicated, inline-editable text fields for **Action**, **Dialogue**, and **Music** with character validation (up to 140 characters).

### 🎨 Drawing Canvas & Image References
- **Upload References**: Drop or upload JPEG/PNG reference images (up to 10MB). Files are validated and converted to base64 Data URLs so they persist and export cleanly.
- **Interactive Sketching Canvas**: Open the canvas modal to draw directly on the thumbnail. Includes:
  - Tools: Pencil, Brush, and Eraser.
  - Controls: Variable brush sizes and a grayscale color palette.
  - Action History: Undo support to step backward through drawing actions.
- **Image Flattening**: Canvas sketches are composited and flattened over any uploaded or existing reference images when saved.

### 🌌 Visuals, Sounds & UX Polish
- **Cinematic WebGL Gradients**: Empty scene cards render an animated cinematic mesh gradient (via `@paper-design/shaders-react`). Shader renders are memoized to protect WebGL performance during note edits.
- **Procedural Click Audio**: Click events synthesize soft, mechanical click sounds using the browser's Web Audio API. Volume levels and toggles are managed through a volume slider in the toolbar.
- **Light & Dark Themes**: Full support for system, light, and dark modes.
- **Local Persistence**: Workspace is autosaved to browser `localStorage` on every change. If data size exceeds browser quotas (due to large uploaded reference images), the persistent store safely strips image data to protect the text and structural boards.

### 📥 Import & Export Controls
- **JSON Export & Import**: Save entire boards as versioned, portable JSON files, or import previously saved boards.
- **PNG Grid Capture**: Export the active scene grid structure as a high-resolution PNG using `html-to-image`. Employs a dual-render process to guarantee that all embedded base64 reference images are cached and fully drawn.

---

## 🛠️ Technical Stack & Architecture

- **Framework**: [Next.js](https://nextjs.org/) (App Router layout)
- **State Management**: React `useReducer` for workspace boards and scenes; `Jotai` atoms for global configuration (such as sound settings).
- **Styling**: Tailwind CSS & Vanilla CSS custom tokens (using curated `oklch` color spaces).
- **Animations**: [Motion](https://motion.dev/) (Framer Motion) utilizing spring physics for UI overlays and grids.
- **Interactive Elements**: Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-tooltip`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) or Bun installed.

### Installation
Install workspace dependencies:
```bash
bun install
# or
npm install
```

### Run the Development Server
```bash
bun dev
# or
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the workspace.

### Production Build
Create a optimized production bundle:
```bash
bun run build
# or
npm run build
```

---

## 📝 Specifications & Constraints

- **Maximum Note Length**: 140 characters per note field (`action`, `dialogue`, `music`).
- **Maximum Board Title Length**: 60 characters.
- **Image Upload Constraints**: JPEG or PNG format only, up to 10 MB.
- **Grid Workspace Bounds**: Row bounds (1 to 9); Column bounds (1 to 4).
- **Scene Time Duration**: 1 to 60 seconds.

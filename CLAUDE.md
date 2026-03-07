# pxlator

A browser-based pixel art converter. Drag-and-drop images to downscale, quantize, and dither them with retro palettes.

## Stack

- TypeScript + Vite (no framework)
- Pure Canvas 2D API — no external image libraries

## Commands

```bash
npm run dev      # start dev server
npm run build    # tsc + vite build
npm run preview  # preview production build
```

## Architecture

| File | Purpose |
|------|---------|
| `src/main.ts` | UI wiring, file loading, rendering pipeline |
| `src/quantize.ts` | Median-cut color quantization, palette application |
| `src/dither.ts` | Floyd-Steinberg, Atkinson, ordered 4x4 dithering |
| `src/palettes.ts` | Preset palettes: GAMEBOY, NES, PICO8 |
| `index.html` | Single-page layout with all controls |

## Pipeline

1. Load image via drag-and-drop or file input
2. Downscale to target resolution (bilinear)
3. Build palette: median-cut from image OR preset (GAMEBOY/NES/PICO8)
4. Apply dithering (Floyd-Steinberg / Atkinson / ordered 4x4 / none)
5. Upscale with nearest-neighbor for crisp pixel display
6. Download output as PNG

# pxlator

A browser-based pixel art converter. Drop any image to downscale, quantize, and dither it into retro pixel art.

**Live demo:** https://kacheo.github.io/pxlator/

## Features

- Adjustable resolution (8–256px)
- Color quantization via median-cut (2–256 colors)
- Dithering: Floyd-Steinberg, Atkinson, Ordered 4x4
- Preset palettes: Game Boy, NES, PICO-8
- Download output as PNG

## Development

```bash
npm install
npm run dev
```

## License

MIT

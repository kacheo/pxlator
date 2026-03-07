import { medianCut, applyPalette } from "./quantize";
import { floydSteinberg, atkinson, ordered4x4 } from "./dither";
import { GAMEBOY, NES, PICO8 } from "./palettes";

onmessage = ({ data }) => {
  const { id, buffer, width, height, paletteMode, ditherMode, colorCount } = data;
  const pixels = new Uint8ClampedArray(buffer);

  let palette;
  switch (paletteMode) {
    case "gameboy": palette = GAMEBOY; break;
    case "nes": palette = NES; break;
    case "pico8": palette = PICO8; break;
    default: palette = medianCut(pixels, colorCount); break;
  }

  switch (ditherMode) {
    case "floyd-steinberg": floydSteinberg(pixels, width, height, palette); break;
    case "atkinson": atkinson(pixels, width, height, palette); break;
    case "ordered": ordered4x4(pixels, width, height, palette); break;
    default: applyPalette(pixels, palette); break;
  }

  (self as unknown as Worker).postMessage({ id, buffer: pixels.buffer, palette }, [pixels.buffer]);
};

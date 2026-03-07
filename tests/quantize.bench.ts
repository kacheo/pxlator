import { describe, bench } from "vitest";
import { medianCut, nearestColor, applyPalette, type Palette } from "../src/quantize";

// Every pixel unique — worst case for caching
function makeRandom(w: number, h: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.random() * 255;
    data[i + 1] = Math.random() * 255;
    data[i + 2] = Math.random() * 255;
    data[i + 3] = 255;
  }
  return data;
}

// Smooth gradient quantized to 32 steps per channel (~1000 unique colors).
// Models real photos: large runs of similar color.
function makeGradient(w: number, h: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i]     = Math.round((x / w) * 31) * 8;   // 32 steps
      data[i + 1] = Math.round((y / h) * 31) * 8;   // 32 steps
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return data;
}

// Large flat-color blocks. Models illustrations / pixel art with solid regions.
function makeSolid(w: number, h: number, blocks = 16): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  const cols = Math.ceil(Math.sqrt(blocks));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const b = Math.floor((y / h) * cols) * cols + Math.floor((x / w) * cols);
      data[i]     = (b * 37) % 256;
      data[i + 1] = (b * 71) % 256;
      data[i + 2] = (b * 113) % 256;
      data[i + 3] = 255;
    }
  }
  return data;
}

const PALETTE_16: Palette = Array.from({ length: 16 }, (_, i) => [i * 16, i * 8, 255 - i * 16]);
const PALETTE_256: Palette = Array.from({ length: 256 }, (_, i) => [i, i, i]);

const RAND_256   = makeRandom(256, 256);
const GRAD_256   = makeGradient(256, 256);
const SOLID_256  = makeSolid(256, 256);
const RAND_512   = makeRandom(512, 512);
const GRAD_512   = makeGradient(512, 512);

describe("nearestColor", () => {
  bench("palette 16",  () => { nearestColor(128, 64, 200, PALETTE_16); });
  bench("palette 256", () => { nearestColor(128, 64, 200, PALETTE_256); });
});

describe("applyPalette — 256×256, 16 colors", () => {
  bench("random (worst case)",   () => { applyPalette(RAND_256.slice(),  PALETTE_16); });
  bench("gradient (~1k unique)", () => { applyPalette(GRAD_256.slice(),  PALETTE_16); });
  bench("solid blocks (16 unique)", () => { applyPalette(SOLID_256.slice(), PALETTE_16); });
});

describe("applyPalette — 512×512, 16 colors", () => {
  bench("random (worst case)",   () => { applyPalette(RAND_512.slice(),  PALETTE_16); });
  bench("gradient (~1k unique)", () => { applyPalette(GRAD_512.slice(),  PALETTE_16); });
});

describe("applyPalette — 256×256, 256 colors", () => {
  bench("random (worst case)",   () => { applyPalette(RAND_256.slice(),  PALETTE_256); });
  bench("gradient (~1k unique)", () => { applyPalette(GRAD_256.slice(),  PALETTE_256); });
});

describe("medianCut", () => {
  bench("256×256 → 16 colors",  () => { medianCut(RAND_256, 16); });
  bench("256×256 → 256 colors", () => { medianCut(RAND_256, 256); });
  bench("512×512 → 16 colors",  () => { medianCut(RAND_512, 16); });
});

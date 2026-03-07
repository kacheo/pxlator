import { describe, bench } from "vitest";
import { medianCut, nearestColor, applyPalette, type Palette } from "../src/quantize";

function makeImageData(w: number, h: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.random() * 255;
    data[i + 1] = Math.random() * 255;
    data[i + 2] = Math.random() * 255;
    data[i + 3] = 255;
  }
  return data;
}

const PALETTE_16: Palette = Array.from({ length: 16 }, (_, i) => [i * 16, i * 8, 255 - i * 16]);
const PALETTE_256: Palette = Array.from({ length: 256 }, (_, i) => [i, i, i]);

const IMG_64 = makeImageData(64, 64);
const IMG_256 = makeImageData(256, 256);
const IMG_512 = makeImageData(512, 512);

describe("nearestColor", () => {
  bench("palette 16", () => {
    nearestColor(128, 64, 200, PALETTE_16);
  });

  bench("palette 256", () => {
    nearestColor(128, 64, 200, PALETTE_256);
  });
});

describe("applyPalette", () => {
  bench("64×64, 16 colors", () => {
    applyPalette(IMG_64.slice(), PALETTE_16);
  });

  bench("256×256, 16 colors", () => {
    applyPalette(IMG_256.slice(), PALETTE_16);
  });

  bench("512×512, 16 colors", () => {
    applyPalette(IMG_512.slice(), PALETTE_16);
  });

  bench("256×256, 256 colors", () => {
    applyPalette(IMG_256.slice(), PALETTE_256);
  });
});

describe("medianCut", () => {
  bench("64×64 → 16 colors", () => {
    medianCut(IMG_64, 16);
  });

  bench("256×256 → 16 colors", () => {
    medianCut(IMG_256, 16);
  });

  bench("256×256 → 256 colors", () => {
    medianCut(IMG_256, 256);
  });

  bench("512×512 → 16 colors", () => {
    medianCut(IMG_512, 16);
  });
});

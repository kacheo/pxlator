import { describe, bench } from "vitest";
import { floydSteinberg, atkinson, ordered4x4 } from "../src/dither";
import { type Palette } from "../src/quantize";

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

const PALETTE: Palette = [
  [0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 255, 0],
  [0, 0, 255], [255, 255, 0], [0, 255, 255], [255, 0, 255],
  [128, 0, 0], [0, 128, 0], [0, 0, 128], [128, 128, 0],
  [0, 128, 128], [128, 0, 128], [192, 192, 192], [128, 128, 128],
];

const IMG_64 = makeImageData(64, 64);
const IMG_256 = makeImageData(256, 256);
const IMG_512 = makeImageData(512, 512);

describe("floydSteinberg", () => {
  bench("64×64", () => { floydSteinberg(IMG_64.slice(), 64, 64, PALETTE); });
  bench("256×256", () => { floydSteinberg(IMG_256.slice(), 256, 256, PALETTE); });
  bench("512×512", () => { floydSteinberg(IMG_512.slice(), 512, 512, PALETTE); });
});

describe("atkinson", () => {
  bench("64×64", () => { atkinson(IMG_64.slice(), 64, 64, PALETTE); });
  bench("256×256", () => { atkinson(IMG_256.slice(), 256, 256, PALETTE); });
  bench("512×512", () => { atkinson(IMG_512.slice(), 512, 512, PALETTE); });
});

describe("ordered4x4", () => {
  bench("64×64", () => { ordered4x4(IMG_64.slice(), 64, 64, PALETTE); });
  bench("256×256", () => { ordered4x4(IMG_256.slice(), 256, 256, PALETTE); });
  bench("512×512", () => { ordered4x4(IMG_512.slice(), 512, 512, PALETTE); });
});

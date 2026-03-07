import { describe, bench } from "vitest";
import { floydSteinberg, atkinson, ordered4x4 } from "../src/dither";
import { type Palette } from "../src/quantize";

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

function makeGradient(w: number, h: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i]     = Math.round((x / w) * 31) * 8;
      data[i + 1] = Math.round((y / h) * 31) * 8;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return data;
}

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

const PALETTE: Palette = [
  [0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 255, 0],
  [0, 0, 255], [255, 255, 0], [0, 255, 255], [255, 0, 255],
  [128, 0, 0], [0, 128, 0], [0, 0, 128], [128, 128, 0],
  [0, 128, 128], [128, 0, 128], [192, 192, 192], [128, 128, 128],
];

const RAND_256  = makeRandom(256, 256);
const GRAD_256  = makeGradient(256, 256);
const SOLID_256 = makeSolid(256, 256);
const RAND_512  = makeRandom(512, 512);
const GRAD_512  = makeGradient(512, 512);

describe("floydSteinberg — 256×256", () => {
  bench("random (worst case)",      () => { floydSteinberg(RAND_256.slice(),  256, 256, PALETTE); });
  bench("gradient (~1k unique)",    () => { floydSteinberg(GRAD_256.slice(),  256, 256, PALETTE); });
  bench("solid blocks (16 unique)", () => { floydSteinberg(SOLID_256.slice(), 256, 256, PALETTE); });
});

describe("atkinson — 256×256", () => {
  bench("random (worst case)",      () => { atkinson(RAND_256.slice(),  256, 256, PALETTE); });
  bench("gradient (~1k unique)",    () => { atkinson(GRAD_256.slice(),  256, 256, PALETTE); });
  bench("solid blocks (16 unique)", () => { atkinson(SOLID_256.slice(), 256, 256, PALETTE); });
});

describe("ordered4x4 — 256×256", () => {
  bench("random (worst case)",      () => { ordered4x4(RAND_256.slice(),  256, 256, PALETTE); });
  bench("gradient (~1k unique)",    () => { ordered4x4(GRAD_256.slice(),  256, 256, PALETTE); });
  bench("solid blocks (16 unique)", () => { ordered4x4(SOLID_256.slice(), 256, 256, PALETTE); });
});

describe("floydSteinberg — 512×512", () => {
  bench("random (worst case)",   () => { floydSteinberg(RAND_512.slice(), 512, 512, PALETTE); });
  bench("gradient (~1k unique)", () => { floydSteinberg(GRAD_512.slice(), 512, 512, PALETTE); });
});

describe("ordered4x4 — 512×512", () => {
  bench("random (worst case)",   () => { ordered4x4(RAND_512.slice(), 512, 512, PALETTE); });
  bench("gradient (~1k unique)", () => { ordered4x4(GRAD_512.slice(), 512, 512, PALETTE); });
});

import { nearestColor, type Palette } from "./quantize";

export function floydSteinberg(data: Uint8ClampedArray, w: number, h: number, palette: Palette): void {
  const cache = new Map<number, [number, number, number]>();
  const err = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) err[i] = data[i];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] === 0) continue;

      const or = clamp(err[i]), og = clamp(err[i + 1]), ob = clamp(err[i + 2]);
      const [nr, ng, nb] = nearest(or, og, ob, palette, cache);
      data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;

      const er = or - nr, eg = og - ng, eb = ob - nb;
      spread(err, w, h, x + 1, y, er, eg, eb, 7 / 16);
      spread(err, w, h, x - 1, y + 1, er, eg, eb, 3 / 16);
      spread(err, w, h, x, y + 1, er, eg, eb, 5 / 16);
      spread(err, w, h, x + 1, y + 1, er, eg, eb, 1 / 16);
    }
  }
}

export function atkinson(data: Uint8ClampedArray, w: number, h: number, palette: Palette): void {
  const cache = new Map<number, [number, number, number]>();
  const err = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) err[i] = data[i];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] === 0) continue;

      const or = clamp(err[i]), og = clamp(err[i + 1]), ob = clamp(err[i + 2]);
      const [nr, ng, nb] = nearest(or, og, ob, palette, cache);
      data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;

      const er = (or - nr) / 8, eg = (og - ng) / 8, eb = (ob - nb) / 8;
      spread(err, w, h, x + 1, y, er, eg, eb, 1);
      spread(err, w, h, x + 2, y, er, eg, eb, 1);
      spread(err, w, h, x - 1, y + 1, er, eg, eb, 1);
      spread(err, w, h, x, y + 1, er, eg, eb, 1);
      spread(err, w, h, x + 1, y + 1, er, eg, eb, 1);
      spread(err, w, h, x, y + 2, er, eg, eb, 1);
    }
  }
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function ordered4x4(data: Uint8ClampedArray, w: number, h: number, palette: Palette): void {
  const cache = new Map<number, [number, number, number]>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] === 0) continue;

      const threshold = (BAYER4[y % 4][x % 4] / 16 - 0.5) * 64;
      const r = clamp(data[i] + threshold);
      const g = clamp(data[i + 1] + threshold);
      const b = clamp(data[i + 2] + threshold);
      const [nr, ng, nb] = nearest(r, g, b, palette, cache);
      data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
    }
  }
}

function nearest(
  r: number, g: number, b: number,
  palette: Palette,
  cache: Map<number, [number, number, number]>
): [number, number, number] {
  const key = r | (g << 8) | (b << 16);
  let c = cache.get(key);
  if (c === undefined) { c = nearestColor(r, g, b, palette); cache.set(key, c); }
  return c;
}

function spread(
  err: Float32Array, w: number, h: number,
  x: number, y: number,
  er: number, eg: number, eb: number,
  factor: number
): void {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const i = (y * w + x) * 4;
  err[i] += er * factor;
  err[i + 1] += eg * factor;
  err[i + 2] += eb * factor;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

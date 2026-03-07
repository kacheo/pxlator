/** Median-cut color quantization on RGBA pixel data. */

// Pixels are packed as r | (g << 8) | (b << 16) in a Uint32Array.
// This avoids allocating one Uint8Array object per pixel.

interface ColorBox {
  pixels: Uint32Array;
  volume: number;
}

function channelRange(pixels: Uint32Array, shift: number): [number, number] {
  let min = 255, max = 0;
  for (let i = 0; i < pixels.length; i++) {
    const v = (pixels[i] >> shift) & 0xff;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

function getVolume(pixels: Uint32Array): number {
  const [rMin, rMax] = channelRange(pixels, 0);
  const [gMin, gMax] = channelRange(pixels, 8);
  const [bMin, bMax] = channelRange(pixels, 16);
  return (rMax - rMin) * (gMax - gMin) * (bMax - bMin);
}

function longestAxis(pixels: Uint32Array): number {
  const [rMin, rMax] = channelRange(pixels, 0);
  const [gMin, gMax] = channelRange(pixels, 8);
  const [bMin, bMax] = channelRange(pixels, 16);
  const rRange = rMax - rMin, gRange = gMax - gMin, bRange = bMax - bMin;
  if (rRange >= gRange && rRange >= bRange) return 0;
  if (gRange >= bRange) return 8;
  return 16;
}

function splitBox(box: ColorBox): [ColorBox, ColorBox] {
  const shift = longestAxis(box.pixels);
  const sorted = box.pixels.slice().sort((a, b) => ((a >> shift) & 0xff) - ((b >> shift) & 0xff));
  const mid = Math.floor(sorted.length / 2);
  const a = sorted.subarray(0, mid);
  const b = sorted.subarray(mid);
  return [
    { pixels: a, volume: getVolume(a) },
    { pixels: b, volume: getVolume(b) },
  ];
}

function averageColor(pixels: Uint32Array): [number, number, number] {
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < pixels.length; i++) {
    r += pixels[i] & 0xff;
    g += (pixels[i] >> 8) & 0xff;
    b += (pixels[i] >> 16) & 0xff;
  }
  const n = pixels.length;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

export type Palette = [number, number, number][];

export function medianCut(data: Uint8ClampedArray, targetColors: number): Palette {
  // Count opaque pixels and pack them into one Uint32Array
  let count = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) count++;
  if (count === 0) return [[0, 0, 0]];

  const packed = new Uint32Array(count);
  let j = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) packed[j++] = data[i] | (data[i + 1] << 8) | (data[i + 2] << 16);
  }

  let boxes: ColorBox[] = [{ pixels: packed, volume: getVolume(packed) }];

  while (boxes.length < targetColors) {
    boxes.sort((a, b) => b.volume - a.volume);
    const largest = boxes.shift()!;
    if (largest.pixels.length < 2) {
      boxes.push(largest);
      break;
    }
    const [a, b] = splitBox(largest);
    boxes.push(a, b);
  }

  return boxes.map((box) => averageColor(box.pixels));
}

export function nearestColor(
  r: number, g: number, b: number,
  palette: Palette
): [number, number, number] {
  let best = palette[0];
  let bestDist = Infinity;
  for (const c of palette) {
    const dr = r - c[0], dg = g - c[1], db = b - c[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  return best;
}

export function applyPalette(data: Uint8ClampedArray, palette: Palette): void {
  const cache = new Map<number, [number, number, number]>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const key = data[i] | (data[i + 1] << 8) | (data[i + 2] << 16);
    let c = cache.get(key);
    if (c === undefined) { c = nearestColor(data[i], data[i + 1], data[i + 2], palette); cache.set(key, c); }
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
  }
}

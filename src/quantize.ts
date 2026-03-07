/** Median-cut color quantization on RGBA pixel data. */

interface ColorBox {
  pixels: Uint8Array[];
  volume: number;
}

function getVolume(pixels: Uint8Array[]): number {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  for (const p of pixels) {
    if (p[3] === 0) continue;
    if (p[0] < rMin) rMin = p[0];
    if (p[0] > rMax) rMax = p[0];
    if (p[1] < gMin) gMin = p[1];
    if (p[1] > gMax) gMax = p[1];
    if (p[2] < bMin) bMin = p[2];
    if (p[2] > bMax) bMax = p[2];
  }
  return (rMax - rMin) * (gMax - gMin) * (bMax - bMin);
}

function longestAxis(pixels: Uint8Array[]): number {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  for (const p of pixels) {
    if (p[3] === 0) continue;
    if (p[0] < rMin) rMin = p[0];
    if (p[0] > rMax) rMax = p[0];
    if (p[1] < gMin) gMin = p[1];
    if (p[1] > gMax) gMax = p[1];
    if (p[2] < bMin) bMin = p[2];
    if (p[2] > bMax) bMax = p[2];
  }
  const rRange = rMax - rMin;
  const gRange = gMax - gMin;
  const bRange = bMax - bMin;
  if (rRange >= gRange && rRange >= bRange) return 0;
  if (gRange >= rRange && gRange >= bRange) return 1;
  return 2;
}

function splitBox(box: ColorBox): [ColorBox, ColorBox] {
  const axis = longestAxis(box.pixels);
  const sorted = box.pixels.slice().sort((a, b) => a[axis] - b[axis]);
  const mid = Math.floor(sorted.length / 2);
  const a = sorted.slice(0, mid);
  const b = sorted.slice(mid);
  return [
    { pixels: a, volume: getVolume(a) },
    { pixels: b, volume: getVolume(b) },
  ];
}

function averageColor(pixels: Uint8Array[]): [number, number, number] {
  let r = 0, g = 0, b = 0, count = 0;
  for (const p of pixels) {
    if (p[3] === 0) continue;
    r += p[0];
    g += p[1];
    b += p[2];
    count++;
  }
  if (count === 0) return [0, 0, 0];
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

export type Palette = [number, number, number][];

export function medianCut(data: Uint8ClampedArray, targetColors: number): Palette {
  const pixels: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += 4) {
    pixels.push(new Uint8Array([data[i], data[i + 1], data[i + 2], data[i + 3]]));
  }

  const opaque = pixels.filter((p) => p[3] > 0);
  if (opaque.length === 0) return [[0, 0, 0]];

  let boxes: ColorBox[] = [{ pixels: opaque, volume: getVolume(opaque) }];

  while (boxes.length < targetColors) {
    // Split the box with the largest volume
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
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

export function applyPalette(data: Uint8ClampedArray, palette: Palette): void {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = nearestColor(data[i], data[i + 1], data[i + 2], palette);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

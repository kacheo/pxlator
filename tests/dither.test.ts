import { describe, it, expect } from "vitest";
import { floydSteinberg, atkinson, ordered4x4 } from "../src/dither";
import { type Palette } from "../src/quantize";

// Build a flat RGBA Uint8ClampedArray from [r,g,b,a] tuples
function pixels(...colors: [number, number, number, number][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(colors.length * 4);
  colors.forEach(([r, g, b, a], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  });
  return data;
}

// Extract [r,g,b] of pixel at index i
function rgb(data: Uint8ClampedArray, i: number): [number, number, number] {
  return [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
}

const BW: Palette = [[0, 0, 0], [255, 255, 255]];

// All dithers should map pixels to palette colors only
function allInPalette(data: Uint8ClampedArray, palette: Palette): boolean {
  for (let i = 0; i < data.length / 4; i++) {
    if (data[i * 4 + 3] === 0) continue;
    const [r, g, b] = rgb(data, i);
    const match = palette.some(([pr, pg, pb]) => pr === r && pg === g && pb === b);
    if (!match) return false;
  }
  return true;
}

describe("floydSteinberg", () => {
  it("maps all pixels to palette colors", () => {
    const data = pixels([128, 128, 128, 255], [64, 64, 64, 255], [200, 200, 200, 255], [30, 30, 30, 255]);
    floydSteinberg(data, 2, 2, BW);
    expect(allInPalette(data, BW)).toBe(true);
  });

  it("skips transparent pixels", () => {
    const data = pixels([128, 128, 128, 0]);
    floydSteinberg(data, 1, 1, BW);
    expect(data[3]).toBe(0);
    // RGB unchanged
    expect([data[0], data[1], data[2]]).toEqual([128, 128, 128]);
  });

  it("maps pure black to black", () => {
    const data = pixels([0, 0, 0, 255]);
    floydSteinberg(data, 1, 1, BW);
    expect(rgb(data, 0)).toEqual([0, 0, 0]);
  });

  it("maps pure white to white", () => {
    const data = pixels([255, 255, 255, 255]);
    floydSteinberg(data, 1, 1, BW);
    expect(rgb(data, 0)).toEqual([255, 255, 255]);
  });
});

describe("atkinson", () => {
  it("maps all pixels to palette colors", () => {
    const data = pixels([100, 100, 100, 255], [200, 200, 200, 255], [50, 50, 50, 255], [150, 150, 150, 255]);
    atkinson(data, 2, 2, BW);
    expect(allInPalette(data, BW)).toBe(true);
  });

  it("skips transparent pixels", () => {
    const data = pixels([128, 128, 128, 0]);
    atkinson(data, 1, 1, BW);
    expect(data[3]).toBe(0);
    expect([data[0], data[1], data[2]]).toEqual([128, 128, 128]);
  });

  it("maps pure black to black", () => {
    const data = pixels([0, 0, 0, 255]);
    atkinson(data, 1, 1, BW);
    expect(rgb(data, 0)).toEqual([0, 0, 0]);
  });

  it("maps pure white to white", () => {
    const data = pixels([255, 255, 255, 255]);
    atkinson(data, 1, 1, BW);
    expect(rgb(data, 0)).toEqual([255, 255, 255]);
  });
});

describe("ordered4x4", () => {
  it("maps all pixels to palette colors", () => {
    // 4x4 grid of mid-gray
    const colors: [number, number, number, number][] = Array(16).fill([128, 128, 128, 255]);
    const data = pixels(...colors);
    ordered4x4(data, 4, 4, BW);
    expect(allInPalette(data, BW)).toBe(true);
  });

  it("skips transparent pixels", () => {
    const data = pixels([128, 128, 128, 0]);
    ordered4x4(data, 1, 1, BW);
    expect(data[3]).toBe(0);
    expect([data[0], data[1], data[2]]).toEqual([128, 128, 128]);
  });

  it("maps pure black to black", () => {
    const data = pixels([0, 0, 0, 255]);
    ordered4x4(data, 1, 1, BW);
    expect(rgb(data, 0)).toEqual([0, 0, 0]);
  });

  it("maps pure white to white", () => {
    const data = pixels([255, 255, 255, 255]);
    ordered4x4(data, 1, 1, BW);
    expect(rgb(data, 0)).toEqual([255, 255, 255]);
  });
});

import { describe, it, expect } from "vitest";
import { medianCut, nearestColor, applyPalette, type Palette } from "../src/quantize";

// Helper: build a flat RGBA Uint8ClampedArray from [r,g,b,a] tuples
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

describe("nearestColor", () => {
  const palette: Palette = [[0, 0, 0], [255, 255, 255], [255, 0, 0]];

  it("returns exact match", () => {
    expect(nearestColor(255, 0, 0, palette)).toEqual([255, 0, 0]);
  });

  it("returns closest color for near-black", () => {
    expect(nearestColor(10, 10, 10, palette)).toEqual([0, 0, 0]);
  });

  it("returns closest color for near-white", () => {
    expect(nearestColor(240, 240, 240, palette)).toEqual([255, 255, 255]);
  });

  it("works with a single-color palette", () => {
    expect(nearestColor(100, 100, 100, [[128, 64, 32]])).toEqual([128, 64, 32]);
  });
});

describe("applyPalette", () => {
  it("maps each opaque pixel to the nearest palette color", () => {
    const data = pixels([10, 10, 10, 255], [245, 245, 245, 255]);
    const palette: Palette = [[0, 0, 0], [255, 255, 255]];
    applyPalette(data, palette);
    expect([data[0], data[1], data[2]]).toEqual([0, 0, 0]);
    expect([data[4], data[5], data[6]]).toEqual([255, 255, 255]);
  });

  it("skips fully transparent pixels", () => {
    const data = pixels([200, 100, 50, 0]);
    const palette: Palette = [[0, 0, 0]];
    applyPalette(data, palette);
    // RGB should be untouched since alpha is 0
    expect([data[0], data[1], data[2]]).toEqual([200, 100, 50]);
  });

  it("preserves alpha channel", () => {
    const data = pixels([10, 10, 10, 128]);
    const palette: Palette = [[0, 0, 0], [255, 255, 255]];
    applyPalette(data, palette);
    expect(data[3]).toBe(128);
  });
});

describe("medianCut", () => {
  it("returns only the source color for a uniform image", () => {
    const data = pixels([100, 150, 200, 255], [100, 150, 200, 255], [100, 150, 200, 255]);
    const palette = medianCut(data, 4);
    // May produce multiple boxes from splitting equal-value pixels, but all average to the same color
    for (const c of palette) {
      expect(c).toEqual([100, 150, 200]);
    }
  });

  it("returns at most targetColors colors", () => {
    // 8 distinct colors, ask for 4
    const data = pixels(
      [255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [255, 255, 0, 255],
      [0, 255, 255, 255], [255, 0, 255, 255], [255, 255, 255, 255], [0, 0, 0, 255],
    );
    const palette = medianCut(data, 4);
    expect(palette.length).toBeLessThanOrEqual(4);
  });

  it("handles fully transparent image", () => {
    const data = pixels([255, 0, 0, 0], [0, 255, 0, 0]);
    const palette = medianCut(data, 4);
    expect(palette).toEqual([[0, 0, 0]]);
  });

  it("each palette entry has values in [0, 255]", () => {
    const data = pixels(
      [10, 20, 30, 255], [200, 180, 160, 255], [50, 100, 150, 255], [220, 30, 80, 255],
    );
    const palette = medianCut(data, 4);
    for (const [r, g, b] of palette) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(255);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    }
  });
});

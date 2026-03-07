import { describe, it, expect } from "vitest";
import { GAMEBOY, NES, PICO8 } from "../src/palettes";

function validColor(c: [number, number, number]): boolean {
  return c.every((v) => v >= 0 && v <= 255);
}

describe("GAMEBOY palette", () => {
  it("has 4 colors", () => expect(GAMEBOY).toHaveLength(4));
  it("all values in [0, 255]", () => expect(GAMEBOY.every(validColor)).toBe(true));
});

describe("NES palette", () => {
  it("has 32 colors", () => expect(NES).toHaveLength(32));
  it("all values in [0, 255]", () => expect(NES.every(validColor)).toBe(true));
});

describe("PICO8 palette", () => {
  it("has 16 colors", () => expect(PICO8).toHaveLength(16));
  it("all values in [0, 255]", () => expect(PICO8.every(validColor)).toBe(true));
});

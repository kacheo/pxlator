import { medianCut, applyPalette, type Palette } from "./quantize";
import { floydSteinberg, atkinson, ordered4x4 } from "./dither";
import { GAMEBOY, NES, PICO8 } from "./palettes";

const dropZone = document.getElementById("drop-zone")!;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const controls = document.getElementById("controls")!;
const canvasWrap = document.getElementById("canvas-wrap")!;
const originalCanvas = document.getElementById("original") as HTMLCanvasElement;
const outputCanvas = document.getElementById("output") as HTMLCanvasElement;
const resSlider = document.getElementById("resolution") as HTMLInputElement;
const resVal = document.getElementById("res-val")!;
const colSlider = document.getElementById("colors") as HTMLInputElement;
const colVal = document.getElementById("col-val")!;
const ditherSelect = document.getElementById("dither") as HTMLSelectElement;
const paletteSelect = document.getElementById("palette") as HTMLSelectElement;
const downloadBtn = document.getElementById("download")!;
const downloadSizeSelect = document.getElementById("download-size") as HTMLSelectElement;
const errorBox = document.getElementById("error")!;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_DIMENSION  = 4096;

let sourceImage: HTMLImageElement | null = null;
let pixelCanvas: HTMLCanvasElement | null = null;

function showError(msg: string) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.classList.add("hidden");
}

// --- File handling ---

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = (e as DragEvent).dataTransfer?.files[0];
  if (file) loadFile(file);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files?.[0]) loadFile(fileInput.files[0]);
});

function loadFile(file: File) {
  clearError();

  if (!file.type.startsWith("image/")) {
    showError("Unsupported file type. Please upload an image (PNG, JPEG, GIF, WebP, etc.).");
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    showError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`);
    return;
  }

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
      URL.revokeObjectURL(url);
      showError(`Image too large (${img.width}×${img.height}px). Maximum dimension is ${MAX_DIMENSION}px.`);
      return;
    }
    sourceImage = img;
    controls.classList.remove("hidden");
    canvasWrap.classList.remove("hidden");
    drawOriginal();
    pixelate();
  };
  img.src = url;
}

// --- Controls ---

resSlider.addEventListener("input", () => {
  resVal.textContent = resSlider.value;
  pixelate();
});
colSlider.addEventListener("input", () => {
  colVal.textContent = colSlider.value;
  pixelate();
});
ditherSelect.addEventListener("change", () => pixelate());
paletteSelect.addEventListener("change", () => {
  // Hide color count when using a preset palette
  const isAuto = paletteSelect.value === "auto";
  colSlider.parentElement!.style.display = isAuto ? "" : "none";
  pixelate();
});

downloadBtn.addEventListener("click", () => {
  if (!pixelCanvas) return;
  const scale = parseInt(downloadSizeSelect.value);
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = pixelCanvas.width * scale;
  exportCanvas.height = pixelCanvas.height * scale;
  const ctx = exportCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pixelCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
  const link = document.createElement("a");
  link.download = `pixelated-${scale}x.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
});

// --- Rendering ---

function drawOriginal() {
  if (!sourceImage) return;
  const maxDim = 400;
  const scale = Math.min(maxDim / sourceImage.width, maxDim / sourceImage.height, 1);
  originalCanvas.width = Math.round(sourceImage.width * scale);
  originalCanvas.height = Math.round(sourceImage.height * scale);
  const ctx = originalCanvas.getContext("2d")!;
  ctx.drawImage(sourceImage, 0, 0, originalCanvas.width, originalCanvas.height);
}

function pixelate() {
  if (!sourceImage) return;

  const res = parseInt(resSlider.value);
  const colorCount = parseInt(colSlider.value);
  const ditherMode = ditherSelect.value;
  const paletteMode = paletteSelect.value;

  // Downscale to target resolution
  const aspect = sourceImage.width / sourceImage.height;
  let smallW: number, smallH: number;
  if (aspect >= 1) {
    smallW = res;
    smallH = Math.max(1, Math.round(res / aspect));
  } else {
    smallH = res;
    smallW = Math.max(1, Math.round(res * aspect));
  }

  // Draw downscaled (bilinear for initial downsample)
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = smallW;
  tmpCanvas.height = smallH;
  const tmpCtx = tmpCanvas.getContext("2d")!;
  tmpCtx.imageSmoothingEnabled = true;
  tmpCtx.imageSmoothingQuality = "medium";
  tmpCtx.drawImage(sourceImage, 0, 0, smallW, smallH);

  const imageData = tmpCtx.getImageData(0, 0, smallW, smallH);

  // Get palette
  let palette: Palette;
  switch (paletteMode) {
    case "gameboy": palette = GAMEBOY; break;
    case "nes": palette = NES; break;
    case "pico8": palette = PICO8; break;
    default: palette = medianCut(imageData.data, colorCount); break;
  }

  // Apply dithering or direct palette mapping
  switch (ditherMode) {
    case "floyd-steinberg":
      floydSteinberg(imageData.data, smallW, smallH, palette);
      break;
    case "atkinson":
      atkinson(imageData.data, smallW, smallH, palette);
      break;
    case "ordered":
      ordered4x4(imageData.data, smallW, smallH, palette);
      break;
    default:
      applyPalette(imageData.data, palette);
      break;
  }

  tmpCtx.putImageData(imageData, 0, 0);
  pixelCanvas = tmpCanvas;

  // Update download size option labels with actual dimensions
  for (const opt of Array.from(downloadSizeSelect.options)) {
    const s = parseInt(opt.value);
    const w = smallW * s, h = smallH * s;
    const label = s === 1 ? "Small" : s === 4 ? "Medium" : "Large";
    opt.textContent = `${label} (${w}×${h}px)`;
  }

  // Upscale with nearest-neighbor for crisp pixels
  const displayScale = Math.min(400 / smallW, 400 / smallH, 16);
  outputCanvas.width = Math.round(smallW * displayScale);
  outputCanvas.height = Math.round(smallH * displayScale);
  const outCtx = outputCanvas.getContext("2d")!;
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(tmpCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
}

const dropZone = document.getElementById("drop-zone")!;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
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
const copyBtn = document.getElementById("copy-btn")!;
const downloadSizeSelect = document.getElementById("download-size") as HTMLSelectElement;
const errorBox = document.getElementById("error")!;
const compareContainer = document.getElementById("compare-container")!;
const compareHandle = document.getElementById("compare-handle")!;
const viewSelect = document.getElementById("view-mode") as HTMLSelectElement;
const spinner = document.getElementById("spinner")!;
const dropHint = document.getElementById("drop-hint")!;
const toast = document.getElementById("toast")!;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_DIMENSION  = 4096;

let sourceImage: HTMLImageElement | null = null;
let sourceFileName = 'image';
let pixelCanvas: HTMLCanvasElement | null = null;
let pendingId = 0;
let pendingW = 0;
let pendingH = 0;
let pendingTmpCanvas: HTMLCanvasElement | null = null;
let debounceTimer = 0;

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

worker.onmessage = (e) => {
  const { id, buffer, palette } = e.data;
  if (id !== pendingId) return;

  const pixels = new Uint8ClampedArray(buffer);
  const imageData = new ImageData(pixels, pendingW, pendingH);
  const tmpCanvas = pendingTmpCanvas!;
  const ctx = tmpCanvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  pixelCanvas = tmpCanvas;

  updateDownloadOptions(pendingW, pendingH);
  renderSwatches(palette as number[][]);

  // Match original canvas pixel dimensions so overlay aligns perfectly
  outputCanvas.width = originalCanvas.width;
  outputCanvas.height = originalCanvas.height;
  const outCtx = outputCanvas.getContext("2d")!;
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(tmpCanvas, 0, 0, outputCanvas.width, outputCanvas.height);

  setProcessing(false);
};

worker.onerror = () => setProcessing(false);

// --- Palette swatches ---

function renderSwatches(palette: number[][]) {
  const container = document.getElementById('palette-swatches')!;
  container.innerHTML = '';
  for (const [r, g, b] of palette) {
    const s = document.createElement('span');
    s.style.background = `rgb(${r},${g},${b})`;
    s.title = `#${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
    container.appendChild(s);
  }
}

// --- Comparison slider ---

let sliderPos = 0.5;

function setSliderPos(clientX: number) {
  const rect = compareContainer.getBoundingClientRect();
  sliderPos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const pct = sliderPos * 100;
  outputCanvas.style.clipPath = `inset(0 0 0 ${pct}%)`;
  compareHandle.style.left = `${pct}%`;
}

viewSelect.addEventListener("change", () => {
  const isSideBySide = viewSelect.value === "side-by-side";
  canvasWrap.classList.toggle("side-by-side", isSideBySide);
  if (isSideBySide) {
    outputCanvas.style.clipPath = "";
  } else {
    outputCanvas.style.clipPath = `inset(0 0 0 ${sliderPos * 100}%)`;
    compareHandle.style.left = `${sliderPos * 100}%`;
  }
});

compareContainer.addEventListener("mousedown", (e) => {
  if (canvasWrap.classList.contains("side-by-side")) return;
  e.preventDefault();
  setSliderPos(e.clientX);
  const onMove = (e: MouseEvent) => setSliderPos(e.clientX);
  const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
});

compareContainer.addEventListener("touchstart", (e) => {
  if (canvasWrap.classList.contains("side-by-side")) return;
  setSliderPos(e.touches[0].clientX);
  const onMove = (e: TouchEvent) => setSliderPos(e.touches[0].clientX);
  const onEnd = () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
  window.addEventListener("touchmove", onMove);
  window.addEventListener("touchend", onEnd);
}, { passive: true });

function setProcessing(active: boolean) {
  if (active) {
    spinner.classList.remove("hidden");
    downloadBtn.setAttribute("disabled", "");
    copyBtn.setAttribute("disabled", "");
  } else {
    spinner.classList.add("hidden");
    downloadBtn.removeAttribute("disabled");
    copyBtn.removeAttribute("disabled");
  }
}

function updateDownloadOptions(w: number, h: number) {
  for (const opt of Array.from(downloadSizeSelect.options)) {
    const s = parseInt(opt.value);
    const label = s === 1 ? "Small" : s === 4 ? "Medium" : "Large";
    opt.textContent = `${label} (${w * s}×${h * s}px)`;
  }
}

function showError(msg: string) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.classList.add("hidden");
}

function showToast(msg: string) {
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2000);
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

document.addEventListener('paste', (e) => {
  const item = Array.from(e.clipboardData?.items ?? [])
    .find(i => i.type.startsWith('image/'));
  if (item) {
    const file = item.getAsFile();
    if (file) loadFile(file);
  }
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

  sourceFileName = file.name.replace(/\.[^.]+$/, '');

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
      URL.revokeObjectURL(url);
      showError(`Image too large (${img.width}×${img.height}px). Maximum dimension is ${MAX_DIMENSION}px.`);
      return;
    }
    sourceImage = img;
    document.querySelectorAll<HTMLElement>('.sb-section.hidden').forEach(s => {
      if (s.id !== 'sec-image') s.classList.remove('hidden');
    });
    dropHint.classList.add('hidden');
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
  const isAuto = paletteSelect.value === "auto";
  (document.getElementById('colors-label') as HTMLElement).style.display = isAuto ? "" : "none";
  pixelate();
});

document.querySelectorAll<HTMLButtonElement>('#res-presets button').forEach(btn => {
  btn.addEventListener('click', () => {
    resSlider.value = btn.dataset.res!;
    resVal.textContent = resSlider.value;
    pixelate();
  });
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
  link.download = `${sourceFileName}-pixel-${scale}x.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
  showToast('Downloaded!');
});

copyBtn.addEventListener('click', () => {
  if (!pixelCanvas) return;
  pixelCanvas.toBlob(async (blob) => {
    if (!blob) return;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast('Copied to clipboard!');
  });
});

// --- Rendering ---

function drawOriginal() {
  if (!sourceImage) return;
  const container = document.getElementById('canvas-area')!;
  const maxDim = Math.min(container.clientWidth, container.clientHeight) || 600;
  const scale = Math.min(maxDim / sourceImage.width, maxDim / sourceImage.height, 1);
  originalCanvas.width = Math.round(sourceImage.width * scale);
  originalCanvas.height = Math.round(sourceImage.height * scale);
  const ctx = originalCanvas.getContext("2d")!;
  ctx.drawImage(sourceImage, 0, 0, originalCanvas.width, originalCanvas.height);
}

function pixelate() {
  if (!sourceImage) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(startProcessing, 30);
}

function startProcessing() {
  if (!sourceImage) return;

  const res = parseInt(resSlider.value);
  const colorCount = parseInt(colSlider.value);
  const ditherMode = ditherSelect.value;
  const paletteMode = paletteSelect.value;

  const aspect = sourceImage.width / sourceImage.height;
  let smallW: number, smallH: number;
  if (aspect >= 1) {
    smallW = res;
    smallH = Math.max(1, Math.round(res / aspect));
  } else {
    smallH = res;
    smallW = Math.max(1, Math.round(res * aspect));
  }

  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = smallW;
  tmpCanvas.height = smallH;
  const tmpCtx = tmpCanvas.getContext("2d")!;
  tmpCtx.imageSmoothingEnabled = true;
  tmpCtx.imageSmoothingQuality = "medium";
  tmpCtx.drawImage(sourceImage, 0, 0, smallW, smallH);

  const imageData = tmpCtx.getImageData(0, 0, smallW, smallH);

  pendingId++;
  pendingW = smallW;
  pendingH = smallH;
  pendingTmpCanvas = tmpCanvas;

  setProcessing(true);
  worker.postMessage({ id: pendingId, buffer: imageData.data.buffer, width: smallW, height: smallH, paletteMode, ditherMode, colorCount }, [imageData.data.buffer]);
}

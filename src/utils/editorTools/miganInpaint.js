import { clamp } from "./canvasHelpers";
import { getSafeOrt } from "../ortSafe";

let ortModulePromise = null;
let miGanSessionPromise = null;

const MI_GAN_MODEL_URL =
  "https://huggingface.co/edgetools/migan/resolve/main/migan_pipeline_v2.onnx";

/* -------------------------------------------------------
 * Device / performance helpers
 * ----------------------------------------------------- */

function getHardwareConcurrency() {
  if (typeof navigator === "undefined") {
    return 4;
  }

  return Math.max(
    1,
    Number(navigator.hardwareConcurrency) || 4
  );
}

function getDeviceTier() {
  const cores = getHardwareConcurrency();

  if (cores <= 2) return "weak";
  if (cores <= 4) return "medium";
  if (cores <= 8) return "strong";

  return "veryStrong";
}

/* -------------------------------------------------------
 * ONNX Runtime
 * ----------------------------------------------------- */

async function getOrt() {
  if (!ortModulePromise) {
    ortModulePromise = getSafeOrt().catch((error) => {
      ortModulePromise = null;
      throw error;
    });
  }

  return ortModulePromise;
}

/* -------------------------------------------------------
 * MI-GAN session
 * ----------------------------------------------------- */

export async function getMiGanSession() {
  if (!miGanSessionPromise) {
    miGanSessionPromise = createMiGanSession();
  }

  try {
    return await miGanSessionPromise;
  } catch (error) {
    miGanSessionPromise = null;
    throw error;
  }
}

async function createMiGanSession() {
  const ort = await getOrt();

  if (!ort) {
    throw new Error("ONNX Runtime could not be loaded.");
  }

  if (ort.env?.wasm) {
    try {
      ort.env.wasm.simd = true;
    } catch {
      // SIMD may be unavailable in some browsers.
    }
  }

  if (ort.env) {
    try {
      ort.env.logLevel = "error";
    } catch {
      // Ignore unsupported property.
    }
  }

  const hasWebGPU =
    typeof navigator !== "undefined" &&
    !!navigator.gpu;

  if (hasWebGPU) {
    try {
      const session =
        await ort.InferenceSession.create(
          MI_GAN_MODEL_URL,
          {
            executionProviders: ["webgpu"],
            graphOptimizationLevel: "all",
            logSeverityLevel: 3,
          }
        );

      console.log("[MI-GAN] WebGPU session ready");

      return session;
    } catch (error) {
      console.warn(
        "[MI-GAN] WebGPU unavailable; falling back to WASM.",
        error
      );
    }
  }

  const session = await ort.InferenceSession.create(
    MI_GAN_MODEL_URL,
    {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
      logSeverityLevel: 3,
    }
  );

  console.log("[MI-GAN] WASM session ready");

  return session;
}

/* -------------------------------------------------------
 * Background preload
 * ----------------------------------------------------- */

export function preloadMiGan() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  return getMiGanSession().catch((error) => {
    console.warn(
      "[MI-GAN] Background warm-up failed. It will retry when AI Object Remove is used.",
      error
    );

    return null;
  });
}

/* -------------------------------------------------------
 * Canvas helpers
 * ----------------------------------------------------- */

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  return canvas;
}

function getCanvasContext(canvas, options = {}) {
  return canvas.getContext("2d", {
    willReadFrequently: true,
    ...options,
  });
}

/* -------------------------------------------------------
 * Expand selected area
 * ----------------------------------------------------- */

function expandAISelectionMask(maskCanvas, radius = 5) {
  const width = maskCanvas.width;
  const height = maskCanvas.height;

  const expanded = createCanvas(width, height);
  const ctx = getCanvasContext(expanded);

  if (!ctx) {
    throw new Error("Could not create expanded AI mask.");
  }

  // Expand the selected region slightly past the object edges.
  ctx.save();
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = radius * 2;
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.restore();

  // Convert the expanded mask to solid white with transparency outside.
  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const selected = pixels[i + 3] > 12;

    pixels[i] = selected ? 255 : 0;
    pixels[i + 1] = selected ? 255 : 0;
    pixels[i + 2] = selected ? 255 : 0;
    pixels[i + 3] = selected ? 255 : 0;
  }

  ctx.putImageData(image, 0, 0);

  return expanded;
}

/* -------------------------------------------------------
 * Working resolution
 * ----------------------------------------------------- */

function getWorkingMaxSize() {
  const tier = getDeviceTier();

  if (tier === "weak") return 640;
  if (tier === "medium") return 768;
  if (tier === "strong") return 896;

  return 1024;
}

function getWorkingSize(width, height) {
  const maxSize = getWorkingMaxSize();
  const longestSide = Math.max(width, height);

  if (longestSide <= maxSize) {
    return { width, height };
  }

  const scale = maxSize / longestSide;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/* -------------------------------------------------------
 * Create working canvases
 * ----------------------------------------------------- */

function createWorkingCanvases(sourceCanvas) {
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;

  const { width, height } = getWorkingSize(
    sourceWidth,
    sourceHeight
  );

  const workingBase = createCanvas(width, height);
  const workingSelectionMask = createCanvas(width, height);
  const workingMask = createCanvas(width, height);

  const baseCtx = getCanvasContext(workingBase);
  const selectionCtx = getCanvasContext(workingSelectionMask);
  const maskCtx = getCanvasContext(workingMask);

  if (!baseCtx || !selectionCtx || !maskCtx) {
    throw new Error("Could not create AI working canvases.");
  }

  baseCtx.imageSmoothingEnabled = true;
  baseCtx.imageSmoothingQuality = "high";

  baseCtx.clearRect(0, 0, width, height);
  baseCtx.drawImage(sourceCanvas, 0, 0, width, height);

  return {
    workingBase,
    workingSelectionMask,
    workingMask,
  };
}

/* -------------------------------------------------------
 * Selection mask -> MI-GAN mask tensor
 * ----------------------------------------------------- */

function maskCanvasToCHWUint8(canvas) {
  const width = canvas.width;
  const height = canvas.height;

  const ctx = getCanvasContext(canvas);

  if (!ctx) {
    throw new Error("Could not read mask canvas.");
  }

  const imageData = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const src = imageData.data;
  const chw = new Uint8Array(width * height);

  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    const selected = src[i + 3] > 0;

    // Selected object = 0 (erase); unselected = 255 (keep).
    chw[p] = selected ? 0 : 255;
  }

  return {
    data: chw,
    width,
    height,
  };
}

/* -------------------------------------------------------
 * Image -> CHW uint8
 * ----------------------------------------------------- */

function canvasToCHWUint8(canvas) {
  const width = canvas.width;
  const height = canvas.height;

  const ctx = getCanvasContext(canvas);

  if (!ctx) {
    throw new Error("Could not read source canvas.");
  }

  const imageData = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const src = imageData.data;
  const pixelCount = width * height;
  const chw = new Uint8Array(pixelCount * 3);

  const redOffset = 0;
  const greenOffset = pixelCount;
  const blueOffset = pixelCount * 2;

  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    chw[redOffset + p] = src[i];
    chw[greenOffset + p] = src[i + 1];
    chw[blueOffset + p] = src[i + 2];
  }

  return {
    data: chw,
    width,
    height,
  };
}

/* -------------------------------------------------------
 * Find model inputs
 * ----------------------------------------------------- */

function findImageInputName(session) {
  const names = session.inputNames || [];

  const exact = names.find(
    (name) => name.toLowerCase() === "image"
  );

  if (exact) return exact;

  const byName = names.find(
    (name) => name.toLowerCase().includes("image")
  );

  return byName || names[0];
}

function findMaskInputName(session) {
  const names = session.inputNames || [];

  const exact = names.find(
    (name) => name.toLowerCase() === "mask"
  );

  if (exact) return exact;

  const byName = names.find(
    (name) => name.toLowerCase().includes("mask")
  );

  return byName || names[1];
}

/* -------------------------------------------------------
 * Tensor output -> canvas
 * ----------------------------------------------------- */

function tensorToCanvas(tensor, width, height) {
  const canvas = createCanvas(width, height);
  const ctx = getCanvasContext(canvas);

  if (!ctx) {
    throw new Error("Could not create AI output canvas.");
  }

  const imageData = ctx.createImageData(width, height);
  const dst = imageData.data;
  const data = tensor.data;
  const dims = tensor.dims || [];

  // NCHW output: [1, 3, H, W].
  if (
    dims.length === 4 &&
    dims[0] === 1 &&
    dims[1] === 3 &&
    dims[2] === height &&
    dims[3] === width
  ) {
    const pixelCount = width * height;
    const rOffset = 0;
    const gOffset = pixelCount;
    const bOffset = pixelCount * 2;

    for (let p = 0; p < pixelCount; p++) {
      let r = Number(data[rOffset + p]);
      let g = Number(data[gOffset + p]);
      let b = Number(data[bOffset + p]);

      if (
        r >= 0 && r <= 1 &&
        g >= 0 && g <= 1 &&
        b >= 0 && b <= 1
      ) {
        r *= 255;
        g *= 255;
        b *= 255;
      }

      const offset = p * 4;

      dst[offset] = clamp(Math.round(r), 0, 255);
      dst[offset + 1] = clamp(Math.round(g), 0, 255);
      dst[offset + 2] = clamp(Math.round(b), 0, 255);
      dst[offset + 3] = 255;
    }
  }

  // NHWC output: [1, H, W, 3].
  else if (
    dims.length === 4 &&
    dims[0] === 1 &&
    dims[1] === height &&
    dims[2] === width &&
    dims[3] === 3
  ) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 3;

        let r = Number(data[p]);
        let g = Number(data[p + 1]);
        let b = Number(data[p + 2]);

        if (
          r >= 0 && r <= 1 &&
          g >= 0 && g <= 1 &&
          b >= 0 && b <= 1
        ) {
          r *= 255;
          g *= 255;
          b *= 255;
        }

        const offset = (y * width + x) * 4;

        dst[offset] = clamp(Math.round(r), 0, 255);
        dst[offset + 1] = clamp(Math.round(g), 0, 255);
        dst[offset + 2] = clamp(Math.round(b), 0, 255);
        dst[offset + 3] = 255;
      }
    }
  } else {
    throw new Error(
      `Unsupported MI-GAN output shape: ${JSON.stringify(dims)}`
    );
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

/* -------------------------------------------------------
 * Composite generated result inside selection
 * ----------------------------------------------------- */

function compositeAIResultOnlyInsideMask(
  baseCanvas,
  generatedCanvas,
  selectionMaskCanvas
) {
  const width = baseCanvas.width;
  const height = baseCanvas.height;

  const finalCanvas = createCanvas(width, height);
  const finalCtx = getCanvasContext(finalCanvas);

  if (!finalCtx) {
    throw new Error("Could not create final composite canvas.");
  }

  // Preserve the original image outside the selected area.
  finalCtx.drawImage(baseCanvas, 0, 0);

  const clippedAI = createCanvas(width, height);
  const clippedCtx = getCanvasContext(clippedAI);

  if (!clippedCtx) {
    throw new Error("Could not create clipped AI canvas.");
  }

  clippedCtx.drawImage(generatedCanvas, 0, 0);

  const featherMask = createCanvas(width, height);
  const featherCtx = getCanvasContext(featherMask);

  if (!featherCtx) {
    throw new Error("Could not create feather mask.");
  }

  const featherRadius = Math.max(
    1,
    Math.min(4, Math.round(Math.min(width, height) / 400))
  );

  featherCtx.save();
  featherCtx.filter = `blur(${featherRadius}px)`;
  featherCtx.drawImage(
    selectionMaskCanvas,
    0,
    0,
    width,
    height
  );
  featherCtx.restore();

  // Clip the generated result to the feathered selection.
  clippedCtx.globalCompositeOperation = "destination-in";
  clippedCtx.drawImage(featherMask, 0, 0);
  clippedCtx.globalCompositeOperation = "source-over";

  finalCtx.drawImage(clippedAI, 0, 0);

  return finalCanvas;
}

/* -------------------------------------------------------
 * Restore working result to original resolution
 * ----------------------------------------------------- */

function restoreToOriginalSize(workingCanvas, width, height) {
  if (
    workingCanvas.width === width &&
    workingCanvas.height === height
  ) {
    return workingCanvas;
  }

  const restored = createCanvas(width, height);
  const ctx = getCanvasContext(restored);

  if (!ctx) {
    throw new Error("Could not restore AI result size.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    workingCanvas,
    0,
    0,
    width,
    height
  );

  return restored;
}

/* -------------------------------------------------------
 * Main local MI-GAN object removal
 * ----------------------------------------------------- */

export async function runLocalAIObjectRemoval({
  sourceCanvas,
  maskCanvas,
  onProgress,
}) {
  if (!sourceCanvas) {
    throw new Error("Source image is required.");
  }

  if (!maskCanvas) {
    throw new Error("Object selection mask is required.");
  }

  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Invalid source image size.");
  }

  const progress = (value) => {
    if (typeof onProgress === "function") {
      onProgress(
        clamp(Number(value) || 0, 0, 100)
      );
    }
  };

  progress(2);

  // Load or reuse the cached MI-GAN session.
  const session = await getMiGanSession();

  progress(10);

  const {
    workingBase,
    workingSelectionMask,
    workingMask,
  } = createWorkingCanvases(sourceCanvas);

  const width = workingBase.width;
  const height = workingBase.height;

  const selectionCtx = getCanvasContext(
    workingSelectionMask
  );

  const modelMaskCtx = getCanvasContext(
    workingMask
  );

  if (!selectionCtx || !modelMaskCtx) {
    throw new Error("Could not prepare AI masks.");
  }

  /*
   * FIX 1:
   * Copy the user's selection to the working-size canvas
   * BEFORE expanding or using the mask.
   */

  selectionCtx.clearRect(0, 0, width, height);

  selectionCtx.drawImage(
    maskCanvas,
    0,
    0,
    width,
    height
  );

  /*
   * FIX 2:
   * Expand the mask before model inference.
   */

  const expandedSelectionMask = expandAISelectionMask(
    workingSelectionMask,
    Math.max(3, Math.round(Math.min(width, height) / 180))
  );

  /*
   * FIX 3:
   * Use the expanded mask for MI-GAN input.
   *
   * Selected object = 0 (erase / inpaint)
   * Everything else = 255 (keep)
   */

  modelMaskCtx.clearRect(0, 0, width, height);

  modelMaskCtx.drawImage(
    expandedSelectionMask,
    0,
    0,
    width,
    height
  );

  const maskImageData = modelMaskCtx.getImageData(
    0,
    0,
    width,
    height
  );

  const maskPixels = maskImageData.data;

  for (let i = 0; i < maskPixels.length; i += 4) {
    const selected = maskPixels[i + 3] > 0;

    if (selected) {
      maskPixels[i] = 0;
      maskPixels[i + 1] = 0;
      maskPixels[i + 2] = 0;
      maskPixels[i + 3] = 255;
    } else {
      maskPixels[i] = 255;
      maskPixels[i + 1] = 255;
      maskPixels[i + 2] = 255;
      maskPixels[i + 3] = 255;
    }
  }

  modelMaskCtx.putImageData(maskImageData, 0, 0);

  progress(18);

  const imageData = canvasToCHWUint8(workingBase);
  const modelMask = maskCanvasToCHWUint8(workingMask);

  progress(25);

  const ort = await getOrt();

  const imageTensor = new ort.Tensor(
    "uint8",
    imageData.data,
    [1, 3, height, width]
  );

  const maskTensor = new ort.Tensor(
    "uint8",
    modelMask.data,
    [1, 1, height, width]
  );

  progress(30);

  const imageInputName = findImageInputName(session);
  const maskInputName = findMaskInputName(session);

  if (!imageInputName) {
    throw new Error("MI-GAN image input was not found.");
  }

  if (!maskInputName) {
    throw new Error("MI-GAN mask input was not found.");
  }

  // Run the inpainting model.
  const outputs = await session.run({
    [imageInputName]: imageTensor,
    [maskInputName]: maskTensor,
  });

  progress(82);

  const outputNames =
    session.outputNames || Object.keys(outputs);

  let outputTensor = null;

  for (const name of outputNames) {
    const candidate = outputs[name];

    if (
      candidate &&
      candidate.data &&
      candidate.dims
    ) {
      outputTensor = candidate;
      break;
    }
  }

  if (!outputTensor) {
    throw new Error("MI-GAN returned no image output.");
  }

  const generated = tensorToCanvas(
    outputTensor,
    width,
    height
  );

  progress(90);

  /*
   * FIX 4:
   * Composite with the expanded selection mask.
   * Do not use the inverted model mask for compositing.
   */

  const result = compositeAIResultOnlyInsideMask(
    workingBase,
    generated,
    expandedSelectionMask
  );

  progress(94);

  const restored = restoreToOriginalSize(
    result,
    sourceWidth,
    sourceHeight
  );

  progress(98);

  if (typeof requestAnimationFrame === "function") {
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }

  progress(100);

  return restored;
}

/* -------------------------------------------------------
 * Build editor selection mask
 * ----------------------------------------------------- */

export function buildAIInpaintMaskCanvas(
  sourceCanvas,
  selectionCanvas
) {
  if (!sourceCanvas) {
    throw new Error("Source canvas is required.");
  }

  if (!selectionCanvas) {
    throw new Error("Selection canvas is required.");
  }

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const maskCanvas = createCanvas(width, height);
  const ctx = getCanvasContext(maskCanvas);

  if (!ctx) {
    throw new Error("Could not create AI selection mask.");
  }

  ctx.clearRect(0, 0, width, height);

  ctx.drawImage(
    selectionCanvas,
    0,
    0,
    width,
    height
  );

  const imageData = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];

    if (alpha > 4) {
      pixels[i] = 255;
      pixels[i + 1] = 255;
      pixels[i + 2] = 255;
      pixels[i + 3] = 255;
    } else {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return maskCanvas;
}
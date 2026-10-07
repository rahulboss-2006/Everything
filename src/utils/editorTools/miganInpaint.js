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

  if (cores <= 2) {
    return "weak";
  }

  if (cores <= 4) {
    return "medium";
  }

  if (cores <= 8) {
    return "strong";
  }

  return "veryStrong";
}

/* -------------------------------------------------------
 * ONNX Runtime
 * ----------------------------------------------------- */

async function getOrt() {
  if (!ortModulePromise) {
    ortModulePromise = getSafeOrt().catch((error) => {
      /*
       * IMPORTANT:
       *
       * If ORT loading fails, do not keep a rejected
       * promise forever. Allow the next AI operation
       * to retry.
       */
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
    /*
     * Never permanently cache a failed session.
     */
    miGanSessionPromise = null;

    throw error;
  }
}

async function createMiGanSession() {
  const ort = await getOrt();

  if (!ort) {
    throw new Error(
      "ONNX Runtime could not be loaded."
    );
  }

  /*
   * ---------------------------------------------------
   * WASM configuration
   * ---------------------------------------------------
   *
   * ortSafe.js already locks:
   *
   *   numThreads = 1
   *   proxy = false
   *
   * Do NOT try to change numThreads here.
   *
   * SIMD is safe and does not require
   * multi-threaded WASM.
   */

  if (ort.env?.wasm) {
    try {
      ort.env.wasm.simd = true;
    } catch {
      /* Keep going if SIMD is unavailable. */
    }
  }

  /*
   * Reduce noisy ONNX Runtime console output.
   */
  if (ort.env) {
    try {
      ort.env.logLevel = "error";
    } catch {
      /* Ignore unsupported logLevel property. */
    }
  }

  /*
   * ---------------------------------------------------
   * Try WebGPU first
   * ---------------------------------------------------
   *
   * WebGPU is attempted only when the browser exposes
   * navigator.gpu.
   *
   * If WebGPU session creation fails, the code
   * automatically falls back to WASM.
   */

  const hasWebGPU =
    typeof navigator !== "undefined" &&
    !!navigator.gpu;

  if (hasWebGPU) {
    try {
      const webGpuSession =
        await ort.InferenceSession.create(
          MI_GAN_MODEL_URL,
          {
            executionProviders: ["webgpu"],
            graphOptimizationLevel: "all",
            logSeverityLevel: 3,
          }
        );

      console.log(
        "[MI-GAN] WebGPU session ready"
      );

      return webGpuSession;
    } catch (webGpuError) {
      console.warn(
        "[MI-GAN] WebGPU unavailable, falling back to WASM.",
        webGpuError
      );
    }
  }

  /*
   * ---------------------------------------------------
   * Reliable WASM fallback
   * ---------------------------------------------------
   */

  const wasmSession =
    await ort.InferenceSession.create(
      MI_GAN_MODEL_URL,
      {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
        logSeverityLevel: 3,
      }
    );

  console.log(
    "[MI-GAN] WASM session ready"
  );

  return wasmSession;
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
  const canvas =
    document.createElement("canvas");

  canvas.width = Math.max(
    1,
    Math.round(width)
  );

  canvas.height = Math.max(
    1,
    Math.round(height)
  );

  return canvas;
}

function getCanvasContext(
  canvas,
  options = {}
) {
  return canvas.getContext(
    "2d",
    {
      willReadFrequently: true,
      ...options,
    }
  );
}

/* -------------------------------------------------------
 * Working resolution
 * ----------------------------------------------------- */

function getWorkingMaxSize() {
  const tier =
    getDeviceTier();

  if (tier === "weak") {
    return 640;
  }

  if (tier === "medium") {
    return 768;
  }

  if (tier === "strong") {
    return 896;
  }

  return 1024;
}

function getWorkingSize(
  width,
  height
) {
  const maxSize =
    getWorkingMaxSize();

  const longestSide =
    Math.max(
      width,
      height
    );

  if (
    longestSide <= maxSize
  ) {
    return {
      width,
      height,
    };
  }

  const scale =
    maxSize /
    longestSide;

  return {
    width: Math.max(
      1,
      Math.round(
        width * scale
      )
    ),

    height: Math.max(
      1,
      Math.round(
        height * scale
      )
    ),
  };
}

/* -------------------------------------------------------
 * Create working canvases
 * ----------------------------------------------------- */

function createWorkingCanvases(
  sourceCanvas
) {
  const sourceWidth =
    sourceCanvas.width;

  const sourceHeight =
    sourceCanvas.height;

  const {
    width,
    height,
  } =
    getWorkingSize(
      sourceWidth,
      sourceHeight
    );

  const workingBase =
    createCanvas(
      width,
      height
    );

  const workingSelectionMask =
    createCanvas(
      width,
      height
    );

  const workingMask =
    createCanvas(
      width,
      height
    );

  const baseCtx =
    getCanvasContext(
      workingBase
    );

  const selectionCtx =
    getCanvasContext(
      workingSelectionMask
    );

  const maskCtx =
    getCanvasContext(
      workingMask
    );

  if (
    !baseCtx ||
    !selectionCtx ||
    !maskCtx
  ) {
    throw new Error(
      "Could not create AI working canvases."
    );
  }

  baseCtx.imageSmoothingEnabled =
    true;

  baseCtx.imageSmoothingQuality =
    "high";

  baseCtx.clearRect(
    0,
    0,
    width,
    height
  );

  baseCtx.drawImage(
    sourceCanvas,
    0,
    0,
    width,
    height
  );

  return {
    workingBase,
    workingSelectionMask,
    workingMask,
  };
}

/* -------------------------------------------------------
 * Selection mask -> MI-GAN mask
 * ----------------------------------------------------- */

function maskCanvasToCHWUint8(
  canvas
) {
  const width =
    canvas.width;

  const height =
    canvas.height;

  const ctx =
    getCanvasContext(
      canvas
    );

  if (!ctx) {
    throw new Error(
      "Could not read mask canvas."
    );
  }

  const imageData =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );

  const src =
    imageData.data;

  const chw =
    new Uint8Array(
      width * height
    );

  for (
    let i = 0, p = 0;
    i < src.length;
    i += 4, p++
  ) {
    const selected =
      src[i + 3] > 0;

    /*
     * Selected object = erase
     * Background       = keep
     */
    chw[p] =
      selected
        ? 0
        : 255;
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

function canvasToCHWUint8(
  canvas
) {
  const width =
    canvas.width;

  const height =
    canvas.height;

  const ctx =
    getCanvasContext(
      canvas
    );

  if (!ctx) {
    throw new Error(
      "Could not read source canvas."
    );
  }

  const imageData =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );

  const src =
    imageData.data;

  const pixelCount =
    width * height;

  const chw =
    new Uint8Array(
      pixelCount * 3
    );

  const redOffset =
    0;

  const greenOffset =
    pixelCount;

  const blueOffset =
    pixelCount * 2;

  for (
    let i = 0, p = 0;
    i < src.length;
    i += 4, p++
  ) {
    chw[
      redOffset + p
    ] = src[i];

    chw[
      greenOffset + p
    ] = src[i + 1];

    chw[
      blueOffset + p
    ] = src[i + 2];
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

function findImageInputName(
  session
) {
  const names =
    session.inputNames || [];

  const exact =
    names.find(
      (name) =>
        name.toLowerCase() ===
        "image"
    );

  if (exact) {
    return exact;
  }

  const byShape =
    names.find(
      (name) =>
        name
          .toLowerCase()
          .includes("image")
    );

  return (
    byShape ||
    names[0]
  );
}

function findMaskInputName(
  session
) {
  const names =
    session.inputNames || [];

  const exact =
    names.find(
      (name) =>
        name.toLowerCase() ===
        "mask"
    );

  if (exact) {
    return exact;
  }

  const byShape =
    names.find(
      (name) =>
        name
          .toLowerCase()
          .includes("mask")
    );

  if (byShape) {
    return byShape;
  }

  return names[1];
}

/* -------------------------------------------------------
 * Tensor output -> canvas
 * ----------------------------------------------------- */

function tensorToCanvas(
  tensor,
  width,
  height
) {
  const canvas =
    createCanvas(
      width,
      height
    );

  const ctx =
    getCanvasContext(
      canvas
    );

  if (!ctx) {
    throw new Error(
      "Could not create AI output canvas."
    );
  }

  const imageData =
    ctx.createImageData(
      width,
      height
    );

  const dst =
    imageData.data;

  const data =
    tensor.data;

  const dims =
    tensor.dims || [];

  /*
   * NCHW:
   *
   * [1, 3, H, W]
   */

  if (
    dims.length === 4 &&
    dims[0] === 1 &&
    dims[1] === 3 &&
    dims[2] === height &&
    dims[3] === width
  ) {
    const pixelCount =
      width * height;

    const rOffset = 0;

    const gOffset =
      pixelCount;

    const bOffset =
      pixelCount * 2;

    for (
      let p = 0;
      p < pixelCount;
      p++
    ) {
      let r =
        Number(
          data[
            rOffset + p
          ]
        );

      let g =
        Number(
          data[
            gOffset + p
          ]
        );

      let b =
        Number(
          data[
            bOffset + p
          ]
        );

      if (
        r >= 0 &&
        r <= 1 &&
        g >= 0 &&
        g <= 1 &&
        b >= 0 &&
        b <= 1
      ) {
        r *= 255;
        g *= 255;
        b *= 255;
      }

      const offset =
        p * 4;

      dst[offset] =
        clamp(
          Math.round(r),
          0,
          255
        );

      dst[offset + 1] =
        clamp(
          Math.round(g),
          0,
          255
        );

      dst[offset + 2] =
        clamp(
          Math.round(b),
          0,
          255
        );

      dst[offset + 3] =
        255;
    }
  }

  /*
   * NHWC:
   *
   * [1, H, W, 3]
   */

  else if (
    dims.length === 4 &&
    dims[0] === 1 &&
    dims[1] === height &&
    dims[2] === width &&
    dims[3] === 3
  ) {
    for (
      let y = 0;
      y < height;
      y++
    ) {
      for (
        let x = 0;
        x < width;
        x++
      ) {
        const p =
          (y * width + x) * 3;

        let r =
          Number(
            data[p]
          );

        let g =
          Number(
            data[p + 1]
          );

        let b =
          Number(
            data[p + 2]
          );

        if (
          r >= 0 &&
          r <= 1 &&
          g >= 0 &&
          g <= 1 &&
          b >= 0 &&
          b <= 1
        ) {
          r *= 255;
          g *= 255;
          b *= 255;
        }

        const offset =
          (y * width + x) * 4;

        dst[offset] =
          clamp(
            Math.round(r),
            0,
            255
          );

        dst[offset + 1] =
          clamp(
            Math.round(g),
            0,
            255
          );

        dst[offset + 2] =
          clamp(
            Math.round(b),
            0,
            255
          );

        dst[offset + 3] =
          255;
      }
    }
  } else {
    throw new Error(
      `Unsupported MI-GAN output shape: ${JSON.stringify(
        dims
      )}`
    );
  }

  ctx.putImageData(
    imageData,
    0,
    0
  );

  return canvas;
}

/* -------------------------------------------------------
 * Final composite
 *
 * Only the selected area receives
 * the generated MI-GAN result.
 * ----------------------------------------------------- */

function compositeAIResultOnlyInsideMask(
  baseCanvas,
  generatedCanvas,
  selectionMaskCanvas
) {
  const width =
    baseCanvas.width;

  const height =
    baseCanvas.height;

  const finalCanvas =
    createCanvas(
      width,
      height
    );

  const finalCtx =
    getCanvasContext(
      finalCanvas
    );

  if (!finalCtx) {
    throw new Error(
      "Could not create final composite canvas."
    );
  }

  /*
   * Start with the original image.
   */
  finalCtx.drawImage(
    baseCanvas,
    0,
    0
  );

  /*
   * Create only one temporary
   * clipped AI canvas.
   */
  const clippedAI =
    createCanvas(
      width,
      height
    );

  const clippedCtx =
    getCanvasContext(
      clippedAI
    );

  if (!clippedCtx) {
    throw new Error(
      "Could not create clipped AI canvas."
    );
  }

  clippedCtx.clearRect(
    0,
    0,
    width,
    height
  );

  /*
   * Draw generated result.
   */
  clippedCtx.drawImage(
    generatedCanvas,
    0,
    0
  );

  /*
   * Keep generated result ONLY
   * inside user's selected area.
   */
  clippedCtx.globalCompositeOperation =
    "destination-in";

  clippedCtx.drawImage(
    selectionMaskCanvas,
    0,
    0,
    width,
    height
  );

  /*
   * Put AI result over original image.
   */
  finalCtx.globalCompositeOperation =
    "source-over";

  finalCtx.drawImage(
    clippedAI,
    0,
    0
  );

  /*
   * Explicitly restore default state.
   */
  finalCtx.globalCompositeOperation =
    "source-over";

  return finalCanvas;
}

/* -------------------------------------------------------
 * Restore working result to original resolution
 * ----------------------------------------------------- */

function restoreToOriginalSize(
  workingCanvas,
  width,
  height
) {
  if (
    workingCanvas.width === width &&
    workingCanvas.height === height
  ) {
    return workingCanvas;
  }

  const restored =
    createCanvas(
      width,
      height
    );

  const ctx =
    getCanvasContext(
      restored
    );

  if (!ctx) {
    throw new Error(
      "Could not restore AI result size."
    );
  }

  ctx.imageSmoothingEnabled =
    true;

  ctx.imageSmoothingQuality =
    "high";

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
    throw new Error(
      "Source image is required."
    );
  }

  if (!maskCanvas) {
    throw new Error(
      "Object selection mask is required."
    );
  }

  const sourceWidth =
    sourceCanvas.width;

  const sourceHeight =
    sourceCanvas.height;

  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new Error(
      "Invalid source image size."
    );
  }

  const progress = (
    value
  ) => {
    if (
      typeof onProgress ===
      "function"
    ) {
      onProgress(
        clamp(
          Number(value) || 0,
          0,
          100
        )
      );
    }
  };

  progress(2);

  /*
   * Get cached MI-GAN session.
   *
   * First call:
   *   load ORT
   *   create WebGPU/WASM session
   *
   * Later calls:
   *   reuse session
   */
  const session =
    await getMiGanSession();

  progress(10);

  /*
   * Create working canvases.
   */
  const {
    workingBase,
    workingSelectionMask,
    workingMask,
  } =
    createWorkingCanvases(
      sourceCanvas
    );

  const width =
    workingBase.width;

  const height =
    workingBase.height;

  const selectionCtx =
    getCanvasContext(
      workingSelectionMask
    );

  const modelMaskCtx =
    getCanvasContext(
      workingMask
    );

  if (
    !selectionCtx ||
    !modelMaskCtx
  ) {
    throw new Error(
      "Could not prepare AI masks."
    );
  }

  /*
   * ---------------------------------------------------
   * ORIGINAL USER SELECTION
   * ---------------------------------------------------
   *
   * alpha > 0 = object to remove
   */

  selectionCtx.clearRect(
    0,
    0,
    width,
    height
  );

  selectionCtx.drawImage(
    maskCanvas,
    0,
    0,
    width,
    height
  );

  /*
   * ---------------------------------------------------
   * MI-GAN MODEL MASK
   * ---------------------------------------------------
   *
   * 0   = erase / inpaint
   * 255 = keep
   */

  modelMaskCtx.clearRect(
    0,
    0,
    width,
    height
  );

  modelMaskCtx.drawImage(
    maskCanvas,
    0,
    0,
    width,
    height
  );

  const maskImageData =
    modelMaskCtx.getImageData(
      0,
      0,
      width,
      height
    );

  const maskPixels =
    maskImageData.data;

  for (
    let i = 0;
    i < maskPixels.length;
    i += 4
  ) {
    const selected =
      maskPixels[i + 3] > 0;

    if (selected) {
      /*
       * Selected object:
       * ERASE / INPAINT
       */
      maskPixels[i] = 0;
      maskPixels[i + 1] = 0;
      maskPixels[i + 2] = 0;
      maskPixels[i + 3] = 255;
    } else {
      /*
       * Everything else:
       * KEEP
       */
      maskPixels[i] = 255;
      maskPixels[i + 1] = 255;
      maskPixels[i + 2] = 255;
      maskPixels[i + 3] = 255;
    }
  }

  modelMaskCtx.putImageData(
    maskImageData,
    0,
    0
  );

  progress(18);

  /*
   * Convert image to CHW uint8.
   */
  const imageData =
    canvasToCHWUint8(
      workingBase
    );

  /*
   * Convert model mask to CHW uint8.
   */
  const modelMask =
    maskCanvasToCHWUint8(
      workingMask
    );

  progress(25);

  const ort =
    await getOrt();

  /*
   * Create input tensors.
   */
  const imageTensor =
    new ort.Tensor(
      "uint8",
      imageData.data,
      [
        1,
        3,
        height,
        width,
      ]
    );

  const maskTensor =
    new ort.Tensor(
      "uint8",
      modelMask.data,
      [
        1,
        1,
        height,
        width,
      ]
    );

  progress(30);

  /*
   * Find model input names.
   */
  const imageInputName =
    findImageInputName(
      session
    );

  const maskInputName =
    findMaskInputName(
      session
    );

  if (!imageInputName) {
    throw new Error(
      "MI-GAN image input was not found."
    );
  }

  if (!maskInputName) {
    throw new Error(
      "MI-GAN mask input was not found."
    );
  }

  /*
   * Run MI-GAN.
   */
  const outputs =
    await session.run({
      [imageInputName]:
        imageTensor,

      [maskInputName]:
        maskTensor,
    });

  progress(82);

  /*
   * Find first usable output tensor.
   */
  const outputNames =
    session.outputNames ||
    Object.keys(outputs);

  let outputTensor =
    null;

  for (
    const name of outputNames
  ) {
    const candidate =
      outputs[name];

    if (
      candidate &&
      candidate.data &&
      candidate.dims
    ) {
      outputTensor =
        candidate;

      break;
    }
  }

  if (!outputTensor) {
    throw new Error(
      "MI-GAN returned no image output."
    );
  }

  /*
   * Convert output tensor to canvas.
   */
  const generated =
    tensorToCanvas(
      outputTensor,
      width,
      height
    );

  progress(90);

  /*
   * IMPORTANT:
   *
   * Use ORIGINAL selection mask.
   *
   * Do not use inverted model mask here.
   */
  const result =
    compositeAIResultOnlyInsideMask(
      workingBase,
      generated,
      workingSelectionMask
    );

  progress(94);

  /*
   * Restore original image resolution.
   */
  const restored =
    restoreToOriginalSize(
      result,
      sourceWidth,
      sourceHeight
    );

  progress(98);

  /*
   * Give browser one frame to paint
   * the completed progress state.
   */
  if (
    typeof requestAnimationFrame ===
    "function"
  ) {
    await new Promise(
      (resolve) =>
        requestAnimationFrame(
          resolve
        )
    );
  }

  progress(100);

  return restored;
}

/* -------------------------------------------------------
 * Build editor selection mask
 *
 * This is the editor mask.
 *
 * selected:
 *   white / alpha 255
 *
 * unselected:
 *   transparent
 *
 * Inversion happens only immediately
 * before MI-GAN inference.
 * ----------------------------------------------------- */

export function buildAIInpaintMaskCanvas(
  sourceCanvas,
  selectionCanvas
) {
  if (!sourceCanvas) {
    throw new Error(
      "Source canvas is required."
    );
  }

  if (!selectionCanvas) {
    throw new Error(
      "Selection canvas is required."
    );
  }

  const width =
    sourceCanvas.width;

  const height =
    sourceCanvas.height;

  const maskCanvas =
    createCanvas(
      width,
      height
    );

  const ctx =
    getCanvasContext(
      maskCanvas
    );

  if (!ctx) {
    throw new Error(
      "Could not create AI selection mask."
    );
  }

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  /*
   * Preserve user's selection.
   */
  ctx.drawImage(
    selectionCanvas,
    0,
    0,
    width,
    height
  );

  /*
   * Normalize selected pixels:
   *
   * selected   = solid white
   * unselected = transparent
   */
  const imageData =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );

  const pixels =
    imageData.data;

  for (
    let i = 0;
    i < pixels.length;
    i += 4
  ) {
    const alpha =
      pixels[i + 3];

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

  ctx.putImageData(
    imageData,
    0,
    0
  );

  return maskCanvas;
}
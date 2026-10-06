import { clamp } from "./canvasHelpers";

let ortModulePromise = null;
let miGanSessionPromise = null;

const MI_GAN_MODEL_URL =
  "https://huggingface.co/edgetools/migan/resolve/main/migan_pipeline_v2.onnx";

function getHardwareConcurrency() {
  if (typeof navigator === "undefined") {
    return 4;
  }

  return Math.max(
    1,
    Number(navigator.hardwareConcurrency) || 4
  );
}

function getDeviceMemory() {
  if (typeof navigator === "undefined") {
    return 0;
  }

  return Number(navigator.deviceMemory) || 0;
}

function isWeakDevice() {
  const cores = getHardwareConcurrency();
  const memory = getDeviceMemory();

  return (
    (memory > 0 && memory <= 4) ||
    cores <= 4
  );
}

function getMiGanMaxDimension() {
  const cores = getHardwareConcurrency();
  const memory = getDeviceMemory();

  /*
   * Fast but still good quality.
   *
   * Weak:
   *   640
   *
   * Medium:
   *   768
   *
   * Strong:
   *   896
   *
   * Very strong:
   *   1024
   */
  if (isWeakDevice()) {
    return 640;
  }

  if (
    (memory >= 8 && cores >= 8) ||
    cores >= 12
  ) {
    return 1024;
  }

  if (cores >= 8) {
    return 896;
  }

  return 768;
}

async function getOrt() {
  if (!ortModulePromise) {
    ortModulePromise = import("onnxruntime-web").catch(
      (error) => {
        ortModulePromise = null;
        throw error;
      }
    );
  }

  return ortModulePromise;
}

function canUseWasmThreads() {
  return (
    typeof window !== "undefined" &&
    window.crossOriginIsolated === true &&
    typeof SharedArrayBuffer !== "undefined"
  );
}

function canUseWebGPU() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.gpu !== "undefined"
  );
}

async function configureWasm(ort) {
  if (!ort?.env?.wasm) {
    return;
  }

  const cores = getHardwareConcurrency();

  if (canUseWasmThreads()) {
    /*
     * More threads are not always faster.
     * 4 is a good browser-safe maximum.
     */
    ort.env.wasm.numThreads = Math.min(
      4,
      Math.max(1, cores)
    );
  } else {
    ort.env.wasm.numThreads = 1;
  }

  ort.env.wasm.simd = true;

  /*
   * Vite serves local ORT WASM files.
   * Never use a remote CDN here.
   */
  ort.env.wasm.wasmPaths = undefined;
}

function getExecutionProviders() {
  /*
   * WebGPU can be considerably faster on supported
   * desktop/mobile GPUs.
   *
   * WASM remains the fallback.
   */
  if (canUseWebGPU()) {
    return ["webgpu", "wasm"];
  }

  return ["wasm"];
}

/* ---------------------------------------------------------
 * MODEL / SESSION
 * --------------------------------------------------------- */

export async function getMiGanSession(onProgress) {
  const ort = await getOrt();

  await configureWasm(ort);

  if (miGanSessionPromise) {
    onProgress?.(
      35,
      "AI model already loaded..."
    );

    return miGanSessionPromise;
  }

  miGanSessionPromise = (async () => {
    onProgress?.(
      5,
      "Downloading AI model..."
    );

    const response = await fetch(
      MI_GAN_MODEL_URL,
      {
        mode: "cors",
        cache: "force-cache",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Could not download AI model (${response.status}).`
      );
    }

    const total =
      Number(
        response.headers.get(
          "content-length"
        )
      ) || 0;

    let modelBuffer;

    if (response.body?.getReader) {
      const reader =
        response.body.getReader();

      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } =
          await reader.read();

        if (done) {
          break;
        }

        if (value) {
          chunks.push(value);
          received += value.byteLength;

          if (total > 0) {
            const percent =
              5 +
              (received / total) * 25;

            onProgress?.(
              Math.min(
                30,
                percent
              ),
              "Downloading AI model..."
            );
          }
        }
      }

      modelBuffer =
        new Uint8Array(received);

      let offset = 0;

      for (const chunk of chunks) {
        modelBuffer.set(
          chunk,
          offset
        );

        offset += chunk.byteLength;
      }

      chunks.length = 0;
    } else {
      modelBuffer =
        new Uint8Array(
          await response.arrayBuffer()
        );

      onProgress?.(
        30,
        "AI model downloaded."
      );
    }

    onProgress?.(
      35,
      "Initializing AI model..."
    );

    let session;

    try {
      session =
        await ort.InferenceSession.create(
          modelBuffer.buffer,
          {
            executionProviders:
              getExecutionProviders(),
            graphOptimizationLevel:
              "all",
          }
        );
    } catch (firstError) {
      /*
       * WebGPU can fail on a browser/GPU/model
       * combination. Never break the feature.
       *
       * Immediately retry with WASM.
       */
      console.warn(
        "MI-GAN WebGPU initialization failed. Falling back to WASM.",
        firstError
      );

      session =
        await ort.InferenceSession.create(
          modelBuffer.buffer,
          {
            executionProviders: [
              "wasm",
            ],
            graphOptimizationLevel:
              "all",
          }
        );
    }

    onProgress?.(
      100,
      "AI model ready."
    );

    return session;
  })().catch((error) => {
    miGanSessionPromise = null;
    throw error;
  });

  return miGanSessionPromise;
}

/* ---------------------------------------------------------
 * CANVAS HELPERS
 * --------------------------------------------------------- */

function createCanvas(
  width,
  height
) {
  const canvas =
    document.createElement(
      "canvas"
    );

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

function createWorkingCanvases(
  sourceCanvas
) {
  const sourceWidth =
    sourceCanvas.width;

  const sourceHeight =
    sourceCanvas.height;

  const maxDimension =
    getMiGanMaxDimension();

  const sourceMax =
    Math.max(
      sourceWidth,
      sourceHeight
    );

  const scale =
    Math.min(
      1,
      maxDimension /
        sourceMax
    );

  const width =
    Math.max(
      1,
      Math.round(
        sourceWidth * scale
      )
    );

  const height =
    Math.max(
      1,
      Math.round(
        sourceHeight * scale
      )
    );

  const workingBase =
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
    workingBase.getContext(
      "2d"
    );

  const maskCtx =
    workingMask.getContext(
      "2d"
    );

  if (!baseCtx || !maskCtx) {
    throw new Error(
      "Could not create MI-GAN working canvases."
    );
  }

  baseCtx.drawImage(
    sourceCanvas,
    0,
    0,
    width,
    height
  );

  return {
    workingBase,
    workingMask,
    scale,
  };
}

function restoreToOriginalSize(
  workingCanvas,
  originalWidth,
  originalHeight
) {
  if (
    workingCanvas.width ===
      originalWidth &&
    workingCanvas.height ===
      originalHeight
  ) {
    return workingCanvas;
  }

  const restored =
    createCanvas(
      originalWidth,
      originalHeight
    );

  const ctx =
    restored.getContext(
      "2d"
    );

  if (!ctx) {
    throw new Error(
      "Could not create restored canvas."
    );
  }

  ctx.drawImage(
    workingCanvas,
    0,
    0,
    originalWidth,
    originalHeight
  );

  return restored;
}

/* ---------------------------------------------------------
 * BUILD AI MASK
 *
 * IMPORTANT:
 * Selection canvas may be painted using a transparent
 * red overlay. We convert ANY meaningful alpha to a
 * fully opaque white inpaint mask.
 * --------------------------------------------------------- */

export function buildAIInpaintMaskCanvas(
  baseCanvas,
  selectionCanvas
) {
  if (
    !baseCanvas ||
    !selectionCanvas
  ) {
    return null;
  }

  const width =
    baseCanvas.width;

  const height =
    baseCanvas.height;

  const mask =
    createCanvas(
      width,
      height
    );

  const maskCtx =
    mask.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
    );

  const selectionCtx =
    selectionCanvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
    );

  if (
    !maskCtx ||
    !selectionCtx
  ) {
    return null;
  }

  maskCtx.clearRect(
    0,
    0,
    width,
    height
  );

  maskCtx.drawImage(
    selectionCanvas,
    0,
    0,
    width,
    height
  );

  const imageData =
    maskCtx.getImageData(
      0,
      0,
      width,
      height
    );

  const data =
    imageData.data;

  /*
   * Do NOT use alpha > 8 here.
   *
   * The editor selection can intentionally be
   * visually transparent.
   *
   * Any alpha > 0 becomes a real mask.
   */
  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    const alpha =
      data[i + 3];

    if (alpha > 0) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    } else {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }

  maskCtx.putImageData(
    imageData,
    0,
    0
  );

  return mask;
}

/* ---------------------------------------------------------
 * RGBA -> CHW
 * --------------------------------------------------------- */

function canvasToCHWUint8(
  canvas
) {
  const width =
    canvas.width;

  const height =
    canvas.height;

  const ctx =
    canvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
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

  const redOffset = 0;
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

function maskCanvasToCHWUint8(
  canvas
) {
  const width =
    canvas.width;

  const height =
    canvas.height;

  const ctx =
    canvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
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
    chw[p] =
      src[i + 3] > 0
        ? 255
        : 0;
  }

  return {
    data: chw,
    width,
    height,
  };
}

/* ---------------------------------------------------------
 * MODEL INPUT DISCOVERY
 * --------------------------------------------------------- */

function findMaskInputName(
  session
) {
  if (
    !session?.inputNames?.length
  ) {
    return null;
  }

  const lower =
    session.inputNames.map(
      (name) =>
        String(name).toLowerCase()
    );

  const index =
    lower.findIndex(
      (name) =>
        name.includes("mask") ||
        name.includes("hole")
    );

  return index >= 0
    ? session.inputNames[index]
    : null;
}

function findImageInputName(
  session
) {
  if (
    !session?.inputNames?.length
  ) {
    return null;
  }

  const maskName =
    findMaskInputName(
      session
    );

  const name =
    session.inputNames.find(
      (inputName) =>
        inputName !==
        maskName
    );

  return (
    name ||
    session.inputNames[0]
  );
}

/* ---------------------------------------------------------
 * OUTPUT
 * --------------------------------------------------------- */

function outputTensorToCanvas(
  tensor,
  width,
  height
) {
  if (!tensor?.data) {
    throw new Error(
      "MI-GAN returned empty output."
    );
  }

  const data =
    tensor.data;

  const expected =
    width *
    height *
    3;

  if (
    data.length <
    expected
  ) {
    throw new Error(
      "MI-GAN output dimensions are invalid."
    );
  }

  const canvas =
    createCanvas(
      width,
      height
    );

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    throw new Error(
      "Could not create MI-GAN output canvas."
    );
  }

  const imageData =
    ctx.createImageData(
      width,
      height
    );

  const dst =
    imageData.data;

  const planeSize =
    width * height;

  for (
    let p = 0;
    p < planeSize;
    p++
  ) {
    const r =
      Number(
        data[p]
      );

    const g =
      Number(
        data[
          planeSize + p
        ]
      );

    const b =
      Number(
        data[
          planeSize * 2 + p
        ]
      );

    dst[p * 4] =
      Math.round(
        clamp(
          r > 1
            ? r
            : r * 255,
          0,
          255
        )
      );

    dst[p * 4 + 1] =
      Math.round(
        clamp(
          g > 1
            ? g
            : g * 255,
          0,
          255
        )
      );

    dst[p * 4 + 2] =
      Math.round(
        clamp(
          b > 1
            ? b
            : b * 255,
          0,
          255
        )
      );

    dst[p * 4 + 3] =
      255;
  }

  ctx.putImageData(
    imageData,
    0,
    0
  );

  return canvas;
}

/* ---------------------------------------------------------
 * COMPOSITE
 * --------------------------------------------------------- */

function compositeAIResultOnlyInsideMask(
  originalCanvas,
  generatedCanvas,
  maskCanvas
) {
  const width =
    originalCanvas.width;

  const height =
    originalCanvas.height;

  const originalCtx =
    originalCanvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
    );

  const generatedCtx =
    generatedCanvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
    );

  const maskCtx =
    maskCanvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
    );

  if (
    !originalCtx ||
    !generatedCtx ||
    !maskCtx
  ) {
    throw new Error(
      "Could not composite the AI object-removal result."
    );
  }

  const original =
    originalCtx.getImageData(
      0,
      0,
      width,
      height
    );

  const generated =
    generatedCtx.getImageData(
      0,
      0,
      width,
      height
    );

  const mask =
    maskCtx.getImageData(
      0,
      0,
      width,
      height
    );

  const output =
    originalCtx.createImageData(
      width,
      height
    );

  output.data.set(
    original.data
  );

  for (
    let i = 0;
    i < output.data.length;
    i += 4
  ) {
    if (
      mask.data[i + 3] > 0
    ) {
      output.data[i] =
        generated.data[i];

      output.data[i + 1] =
        generated.data[i + 1];

      output.data[i + 2] =
        generated.data[i + 2];

      output.data[i + 3] =
        original.data[i + 3];
    }
  }

  originalCtx.putImageData(
    output,
    0,
    0
  );

  return originalCanvas;
}

/* ---------------------------------------------------------
 * LOCAL AI OBJECT REMOVE
 * --------------------------------------------------------- */

export async function runLocalAIObjectRemoval({
  sourceCanvas,
  maskCanvas,
  onProgress,
}) {
  if (
    !sourceCanvas ||
    !maskCanvas
  ) {
    throw new Error(
      "Source image or object mask is missing."
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
      "Invalid source image dimensions."
    );
  }

  onProgress?.(
    1,
    "Loading local AI..."
  );

  const ort =
    await getOrt();

  await configureWasm(
    ort
  );

  onProgress?.(
    3,
    "Loading MI-GAN model..."
  );

  const session =
    await getMiGanSession(
      onProgress
    );

  onProgress?.(
    40,
    "Preparing image..."
  );

  const {
    workingBase,
    workingMask,
  } =
    createWorkingCanvases(
      sourceCanvas
    );

  const workingMaskCtx =
    workingMask.getContext(
      "2d"
    );

  if (!workingMaskCtx) {
    throw new Error(
      "Could not prepare AI mask."
    );
  }

  workingMaskCtx.clearRect(
    0,
    0,
    workingMask.width,
    workingMask.height
  );

  workingMaskCtx.drawImage(
    maskCanvas,
    0,
    0,
    workingMask.width,
    workingMask.height
  );

  /*
   * Make absolutely sure the resized mask
   * remains binary.
   */
  const workingMaskData =
    workingMaskCtx.getImageData(
      0,
      0,
      workingMask.width,
      workingMask.height
    );

  const maskPixels =
    workingMaskData.data;

  for (
    let i = 0;
    i < maskPixels.length;
    i += 4
  ) {
    const active =
      maskPixels[i + 3] > 0;

    if (active) {
      maskPixels[i] = 255;
      maskPixels[i + 1] = 255;
      maskPixels[i + 2] = 255;
      maskPixels[i + 3] = 255;
    } else {
      maskPixels[i] = 0;
      maskPixels[i + 1] = 0;
      maskPixels[i + 2] = 0;
      maskPixels[i + 3] = 0;
    }
  }

  workingMaskCtx.putImageData(
    workingMaskData,
    0,
    0
  );

  onProgress?.(
    48,
    "Preparing AI input..."
  );

  const imageInput =
    canvasToCHWUint8(
      workingBase
    );

  const maskInput =
    maskCanvasToCHWUint8(
      workingMask
    );

  const imageTensor =
    new ort.Tensor(
      "uint8",
      imageInput.data,
      [
        1,
        3,
        imageInput.height,
        imageInput.width,
      ]
    );

  const maskTensor =
    new ort.Tensor(
      "uint8",
      maskInput.data,
      [
        1,
        1,
        maskInput.height,
        maskInput.width,
      ]
    );

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

  const feeds = {
    [imageInputName]:
      imageTensor,
  };

  if (
    maskInputName &&
    maskInputName !==
      imageInputName
  ) {
    feeds[maskInputName] =
      maskTensor;
  }

  onProgress?.(
    55,
    "Running local AI..."
  );

  const outputs =
    await session.run(
      feeds
    );

  onProgress?.(
    88,
    "Processing AI result..."
  );

  const outputNames =
    Object.keys(outputs);

  if (
    !outputNames.length
  ) {
    throw new Error(
      "MI-GAN returned no output."
    );
  }

  const outputTensor =
    outputs[
      outputNames[0]
    ];

  const generated =
    outputTensorToCanvas(
      outputTensor,
      workingBase.width,
      workingBase.height
    );

  const result =
    compositeAIResultOnlyInsideMask(
      workingBase,
      generated,
      workingMask
    );

  onProgress?.(
    94,
    "Restoring original resolution..."
  );

  const restored =
    restoreToOriginalSize(
      result,
      sourceWidth,
      sourceHeight
    );

  onProgress?.(
    100,
    "Object removed successfully."
  );

  return restored;
}

export function getMiGanMaxSize() {
  return getMiGanMaxDimension();
}

export function resetMiGanSession() {
  miGanSessionPromise =
    null;
}

export default {
  getMiGanSession,
  buildAIInpaintMaskCanvas,
  runLocalAIObjectRemoval,
  getMiGanMaxSize,
  resetMiGanSession,
};
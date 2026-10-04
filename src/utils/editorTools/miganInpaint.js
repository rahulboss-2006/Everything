/* =========================================================
   LOCAL AI OBJECT REMOVAL (MI-GAN / ONNX)

   Runs entirely in-browser.
   The image is NOT sent to a server.

   Performance strategy:
   - Reuse the ONNX model session.
   - Use WASM SIMD.
   - Use limited threads on capable isolated browsers.
   - Process AI on a bounded working resolution.
   - Restore the result to the original editor size.
   - Keep the original image untouched outside the mask.
========================================================= */

let ortModulePromise = null;

async function getOrt() {
  if (!ortModulePromise) {
    ortModulePromise = import("onnxruntime-web");
  }

  return ortModulePromise;
}

import { clamp } from "./canvasHelpers";

const MI_GAN_MODEL_URL =
  "https://huggingface.co/edgetools/migan/resolve/main/migan_pipeline_v2.onnx";

/*
 * ---------------------------------------------------------
 * DEVICE / WASM CONFIG
 * ---------------------------------------------------------
 */

const canUseWasmThreads =
  typeof window !== "undefined" &&
  window.crossOriginIsolated === true &&
  typeof window.SharedArrayBuffer !==
    "undefined";

function getHardwareConcurrency() {
  try {
    return Number(
      navigator.hardwareConcurrency || 4
    );
  } catch {
    return 4;
  }
}

function isWeakDevice() {
  try {
    const cores =
      getHardwareConcurrency();

    const memory =
      Number(navigator.deviceMemory || 0);

    if (memory > 0 && memory <= 4) {
      return true;
    }

    if (cores <= 4) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/*
 * MI-GAN becomes extremely expensive when a huge
 * 4K/8K canvas is converted into a tensor.
 *
 * Keep AI processing bounded while preserving the
 * original editor resolution for the final output.
 */
function getMiGanMaxDimension() {
  if (isWeakDevice()) {
    return 768;
  }

  const cores =
    getHardwareConcurrency();

  if (cores <= 6) {
    return 896;
  }

  return 1024;
}

/*
 * Configure ONNX only once.
 */
let wasmConfigured = false;

async function configureWasm() {
  if (wasmConfigured) {
    return;
  }

  const ort = await getOrt();

  /*
   * Weak/non-isolated browsers:
   * one WASM thread is safest.
   *
   * Isolated browsers:
   * use at most 4 threads.
   */
  ort.env.wasm.numThreads =
    canUseWasmThreads
      ? Math.min(
          4,
          getHardwareConcurrency()
        )
      : 1;

  ort.env.wasm.simd = true;

  /*
   * Let the installed onnxruntime-web package
   * resolve its own WASM files.
   *
   * Do NOT mix CDN WASM files with the bundled runtime.
   */
  ort.env.wasm.wasmPaths =
    undefined;

  wasmConfigured = true;
}

/*
 * ---------------------------------------------------------
 * SESSION
 * ---------------------------------------------------------
 */

let miGanSessionPromise = null;

export async function getMiGanSession(
  onProgress
) {
  const ort = await getOrt();
  await configureWasm();

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

    const reader =
      response.body?.getReader();

    const chunks = [];

    let received = 0;

    if (reader) {
      while (true) {
        const {
          done,
          value,
        } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          chunks.push(value);

          received +=
            value.byteLength;

          if (total > 0) {
            const percent =
              5 +
              (received / total) *
                25;

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
    } else {
      const buffer =
        await response.arrayBuffer();

      const chunk =
        new Uint8Array(buffer);

      chunks.push(chunk);

      received =
        chunk.byteLength;

      onProgress?.(
        30,
        "AI model downloaded."
      );
    }

    /*
     * Combine chunks without repeatedly reallocating
     * the entire model buffer.
     */
    const modelBuffer =
      new Uint8Array(received);

    let offset = 0;

    for (const chunk of chunks) {
      modelBuffer.set(
        chunk,
        offset
      );

      offset +=
        chunk.byteLength;
    }

    /*
     * Release references as soon as possible.
     */
    chunks.length = 0;

    onProgress?.(
      35,
      "Initializing AI model..."
    );

    /*
     * WASM is deliberately used for maximum browser
     * compatibility.
     */
    const executionProviders = [
      "wasm",
    ];

    return ort.InferenceSession.create(
      modelBuffer.buffer,
      {
        executionProviders,
        graphOptimizationLevel:
          "all",
      }
    );
  })().catch((error) => {
    miGanSessionPromise = null;

    throw error;
  });

  return miGanSessionPromise;
}

/*
 * ---------------------------------------------------------
 * CANVAS HELPERS
 * ---------------------------------------------------------
 */

function createCanvas(
  width,
  height
) {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  return canvas;
}

/*
 * Create bounded AI working canvases.
 *
 * The original canvas remains untouched.
 */
function createWorkingCanvases(
  baseCanvas,
  maskCanvas
) {
  const originalWidth =
    baseCanvas.width;

  const originalHeight =
    baseCanvas.height;

  const maxDimension =
    getMiGanMaxDimension();

  const largest =
    Math.max(
      originalWidth,
      originalHeight
    );

  /*
   * No resize needed for already-small images.
   */
  if (largest <= maxDimension) {
    return {
      base: baseCanvas,
      mask: maskCanvas,
      width: originalWidth,
      height: originalHeight,
      scale: 1,
    };
  }

  const scale =
    maxDimension / largest;

  const width = Math.max(
    1,
    Math.round(
      originalWidth * scale
    )
  );

  const height = Math.max(
    1,
    Math.round(
      originalHeight * scale
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
      "Could not create AI working canvases."
    );
  }

  /*
   * Image smoothing gives the AI a cleaner resized
   * input without changing the original image.
   */
  baseCtx.imageSmoothingEnabled =
    true;

  baseCtx.imageSmoothingQuality =
    "high";

  baseCtx.drawImage(
    baseCanvas,
    0,
    0,
    width,
    height
  );

  /*
   * IMPORTANT:
   * Mask must remain binary.
   */
  maskCtx.imageSmoothingEnabled =
    false;

  maskCtx.drawImage(
    maskCanvas,
    0,
    0,
    width,
    height
  );

  return {
    base: workingBase,
    mask: workingMask,
    width,
    height,
    scale,
  };
}

/*
 * Resize AI result back to the original editor size.
 */
function restoreToOriginalSize(
  processedCanvas,
  originalCanvas
) {
  if (
    processedCanvas.width ===
      originalCanvas.width &&
    processedCanvas.height ===
      originalCanvas.height
  ) {
    return processedCanvas;
  }

  const restored =
    createCanvas(
      originalCanvas.width,
      originalCanvas.height
    );

  const ctx =
    restored.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Could not restore AI result to original size."
    );
  }

  ctx.imageSmoothingEnabled =
    true;

  ctx.imageSmoothingQuality =
    "high";

  ctx.drawImage(
    processedCanvas,
    0,
    0,
    originalCanvas.width,
    originalCanvas.height
  );

  return restored;
}

/*
 * ---------------------------------------------------------
 * MASK
 * ---------------------------------------------------------
 */

export function buildAIInpaintMaskCanvas(
  baseCanvas,
  editedCanvas,
  explicitSelectionCanvas = null,
  brushSize = 40
) {
  const maskCanvas =
    createCanvas(
      baseCanvas.width,
      baseCanvas.height
    );

  const maskCtx =
    maskCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!maskCtx) {
    throw new Error(
      "Could not create the AI object mask."
    );
  }

  if (explicitSelectionCanvas) {
    const selectionCtx =
      explicitSelectionCanvas.getContext(
        "2d",
        {
          willReadFrequently: true,
        }
      );

    if (!selectionCtx) {
      throw new Error(
        "Could not read the AI object selection."
      );
    }

    const selection =
      selectionCtx.getImageData(
        0,
        0,
        explicitSelectionCanvas.width,
        explicitSelectionCanvas.height
      );

    const output =
      maskCtx.createImageData(
        baseCanvas.width,
        baseCanvas.height
      );

    for (
      let i = 0;
      i < output.data.length;
      i += 4
    ) {
      const selected =
        selection.data[i + 3] >
        4;

      const value =
        selected ? 0 : 255;

      output.data[i] =
        value;

      output.data[i + 1] =
        value;

      output.data[i + 2] =
        value;

      output.data[i + 3] =
        255;
    }

    maskCtx.putImageData(
      output,
      0,
      0
    );
  } else {
    const baseCtx =
      baseCanvas.getContext(
        "2d",
        {
          willReadFrequently: true,
        }
      );

    const editedCtx =
      editedCanvas.getContext(
        "2d",
        {
          willReadFrequently: true,
        }
      );

    if (!baseCtx || !editedCtx) {
      throw new Error(
        "Could not create the AI object mask."
      );
    }

    const baseData =
      baseCtx.getImageData(
        0,
        0,
        baseCanvas.width,
        baseCanvas.height
      );

    const editedData =
      editedCtx.getImageData(
        0,
        0,
        editedCanvas.width,
        editedCanvas.height
      );

    const maskData =
      maskCtx.createImageData(
        baseCanvas.width,
        baseCanvas.height
      );

    for (
      let i = 0;
      i < baseData.data.length;
      i += 4
    ) {
      const erase =
        baseData.data[i + 3] >
          8 &&
        baseData.data[i + 3] -
          editedData.data[i + 3] >
          18;

      const value =
        erase ? 0 : 255;

      maskData.data[i] =
        value;

      maskData.data[i + 1] =
        value;

      maskData.data[i + 2] =
        value;

      maskData.data[i + 3] =
        255;
    }

    maskCtx.putImageData(
      maskData,
      0,
      0
    );
  }

  /*
   * Expand selection slightly.
   */
  const expansion =
    clamp(
      Math.round(
        brushSize *
          (baseCanvas.width /
            1000) *
          0.055
      ),
      1,
      14
    );

  if (expansion > 0) {
    const expandedCanvas =
      createCanvas(
        maskCanvas.width,
        maskCanvas.height
      );

    const expandedCtx =
      expandedCanvas.getContext(
        "2d",
        {
          willReadFrequently: true,
        }
      );

    if (expandedCtx) {
      expandedCtx.fillStyle =
        "#ffffff";

      expandedCtx.fillRect(
        0,
        0,
        expandedCanvas.width,
        expandedCanvas.height
      );

      expandedCtx.filter =
        `blur(${expansion}px)`;

      expandedCtx.drawImage(
        maskCanvas,
        0,
        0
      );

      expandedCtx.filter =
        "none";

      const blurred =
        expandedCtx.getImageData(
          0,
          0,
          expandedCanvas.width,
          expandedCanvas.height
        );

      for (
        let i = 0;
        i < blurred.data.length;
        i += 4
      ) {
        const erase =
          blurred.data[i] <
          245;

        const value =
          erase ? 0 : 255;

        blurred.data[i] =
          value;

        blurred.data[i + 1] =
          value;

        blurred.data[i + 2] =
          value;

        blurred.data[i + 3] =
          255;
      }

      expandedCtx.putImageData(
        blurred,
        0,
        0
      );

      return expandedCanvas;
    }
  }

  return maskCanvas;
}

/*
 * ---------------------------------------------------------
 * TENSOR <-> CANVAS
 * ---------------------------------------------------------
 */

export function canvasToCHWUint8(
  sourceCanvas
) {
  const width =
    sourceCanvas.width;

  const height =
    sourceCanvas.height;

  const ctx =
    sourceCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!ctx) {
    throw new Error(
      "Could not read the editor image."
    );
  }

  const data =
    ctx.getImageData(
      0,
      0,
      width,
      height
    ).data;

  const chw =
    new Uint8Array(
      3 * width * height
    );

  const planeSize =
    width * height;

  /*
   * Keep the conversion loop simple.
   */
  for (
    let i = 0, p = 0;
    i < data.length;
    i += 4, p += 1
  ) {
    chw[p] =
      data[i];

    chw[
      planeSize + p
    ] =
      data[i + 1];

    chw[
      planeSize * 2 + p
    ] =
      data[i + 2];
  }

  return {
    data: chw,
    width,
    height,
  };
}

export function maskCanvasToCHWUint8(
  maskCanvas
) {
  const width =
    maskCanvas.width;

  const height =
    maskCanvas.height;

  const ctx =
    maskCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!ctx) {
    throw new Error(
      "Could not read the AI mask."
    );
  }

  const data =
    ctx.getImageData(
      0,
      0,
      width,
      height
    ).data;

  const chw =
    new Uint8Array(
      width * height
    );

  for (
    let i = 0, p = 0;
    i < data.length;
    i += 4, p += 1
  ) {
    chw[p] =
      data[i];
  }

  return {
    data: chw,
    width,
    height,
  };
}

export function outputTensorToCanvas(
  outputTensor,
  width,
  height
) {
  const output =
    outputTensor?.data;

  if (!output) {
    throw new Error(
      "AI model returned no image data."
    );
  }

  const canvas =
    createCanvas(
      width,
      height
    );

  const ctx =
    canvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!ctx) {
    throw new Error(
      "Could not create the AI result canvas."
    );
  }

  const imageData =
    ctx.createImageData(
      width,
      height
    );

  const planeSize =
    width * height;

  for (
    let p = 0;
    p < planeSize;
    p += 1
  ) {
    const i = p * 4;

    imageData.data[i] =
      clamp(
        Math.round(
          output[p]
        ),
        0,
        255
      );

    imageData.data[i + 1] =
      clamp(
        Math.round(
          output[
            planeSize + p
          ]
        ),
        0,
        255
      );

    imageData.data[i + 2] =
      clamp(
        Math.round(
          output[
            planeSize * 2 + p
          ]
        ),
        0,
        255
      );

    imageData.data[i + 3] =
      255;
  }

  ctx.putImageData(
    imageData,
    0,
    0
  );

  return canvas;
}

/*
 * ---------------------------------------------------------
 * COMPOSITE
 * ---------------------------------------------------------
 */

export function compositeAIResultOnlyInsideMask(
  originalCanvas,
  generatedCanvas,
  maskCanvas
) {
  const width =
    originalCanvas.width;

  const height =
    originalCanvas.height;

  const maskCtx =
    maskCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!maskCtx) {
    throw new Error(
      "Could not composite the AI object-removal result."
    );
  }

  const mask =
    maskCtx.getImageData(
      0,
      0,
      width,
      height
    );

  const alphaCanvas =
    createCanvas(
      width,
      height
    );

  const alphaCtx =
    alphaCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!alphaCtx) {
    throw new Error(
      "Could not create the AI blend mask."
    );
  }

  const alpha =
    alphaCtx.createImageData(
      width,
      height
    );

  /*
   * MI-GAN:
   * 0   = erase
   * 255 = keep
   */
  for (
    let i = 0;
    i < mask.data.length;
    i += 4
  ) {
    const replace =
      255 -
      mask.data[i];

    alpha.data[i] =
      255;

    alpha.data[i + 1] =
      255;

    alpha.data[i + 2] =
      255;

    alpha.data[i + 3] =
      replace;
  }

  alphaCtx.putImageData(
    alpha,
    0,
    0
  );

  /*
   * Tiny feather.
   */
  const featherCanvas =
    createCanvas(
      width,
      height
    );

  const featherCtx =
    featherCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!featherCtx) {
    throw new Error(
      "Could not create the AI feather mask."
    );
  }

  featherCtx.filter =
    "blur(1.5px)";

  featherCtx.drawImage(
    alphaCanvas,
    0,
    0
  );

  featherCtx.filter =
    "none";

  /*
   * Generated result only inside mask.
   */
  const generatedMasked =
    createCanvas(
      width,
      height
    );

  const gmCtx =
    generatedMasked.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!gmCtx) {
    throw new Error(
      "Could not prepare the AI composite."
    );
  }

  gmCtx.drawImage(
    generatedCanvas,
    0,
    0
  );

  gmCtx.globalCompositeOperation =
    "destination-in";

  gmCtx.drawImage(
    featherCanvas,
    0,
    0
  );

  /*
   * Original everywhere.
   * Generated pixels only inside mask.
   */
  const finalCanvas =
    createCanvas(
      width,
      height
    );

  const finalCtx =
    finalCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!finalCtx) {
    throw new Error(
      "Could not create final AI image."
    );
  }

  finalCtx.drawImage(
    originalCanvas,
    0,
    0
  );

  finalCtx.drawImage(
    generatedMasked,
    0,
    0
  );

  return finalCanvas;
}

/*
 * ---------------------------------------------------------
 * RUN MI-GAN
 * ---------------------------------------------------------
 */

export async function runLocalAIObjectRemoval(
  baseCanvas,
  maskCanvas,
  onProgress
) {
  const ort = await getOrt();
  /*
   * Load/reuse model session.
   */
  const session =
    await getMiGanSession(
      onProgress
    );

  onProgress?.(
    45,
    "Preparing AI image..."
  );

  /*
   * IMPORTANT PERFORMANCE STEP:
   *
   * Do not send a huge 4K/8K canvas directly
   * to the WASM model.
   *
   * The original image stays untouched.
   */
  const working =
    createWorkingCanvases(
      baseCanvas,
      maskCanvas
    );

  onProgress?.(
    50,
    working.scale < 1
      ? "Optimizing image for this device..."
      : "Preparing object mask..."
  );

  const image =
    canvasToCHWUint8(
      working.base
    );

  const mask =
    maskCanvasToCHWUint8(
      working.mask
    );

  /*
   * Tensor creation.
   */
  const imageTensor =
    new ort.Tensor(
      "uint8",
      image.data,
      [
        1,
        3,
        image.height,
        image.width,
      ]
    );

  const maskTensor =
    new ort.Tensor(
      "uint8",
      mask.data,
      [
        1,
        1,
        mask.height,
        mask.width,
      ]
    );

  const feeds = {};

  const inputNames =
    session.inputNames || [];

  const imageInput =
    inputNames.find(
      (name) =>
        /image|input/i.test(
          name
        )
    ) ||
    inputNames[0];

  const maskInput =
    inputNames.find(
      (name) =>
        /mask/i.test(
          name
        )
    ) ||
    inputNames[1];

  if (
    !imageInput ||
    !maskInput
  ) {
    throw new Error(
      "The AI inpainting model inputs could not be detected."
    );
  }

  feeds[imageInput] =
    imageTensor;

  feeds[maskInput] =
    maskTensor;

  /*
   * MI-GAN inference.
   *
   * This is the expensive section.
   */
  onProgress?.(
    55,
    "AI is reconstructing the background..."
  );

  let simulated = 55;

  const progressTimer =
    setInterval(() => {
      /*
       * Never pretend it is finished.
       */
      simulated =
        Math.min(
          92,
          simulated + 0.5
        );

      onProgress?.(
        simulated,
        "AI is reconstructing the background..."
      );
    }, 180);

  let results;

  try {
    results =
      await session.run(
        feeds
      );
  } finally {
    clearInterval(
      progressTimer
    );
  }

  onProgress?.(
    94,
    "Preparing AI result..."
  );

  const outputName =
    (
      session.outputNames ||
      []
    ).find(
      (name) =>
        /result|output|image/i.test(
          name
        )
    ) ||
    session.outputNames?.[0];

  const outputTensor =
    outputName
      ? results[
          outputName
        ]
      : Object.values(
          results
        )[0];

  if (!outputTensor) {
    throw new Error(
      "The AI inpainting model returned no result."
    );
  }

  const generatedCanvas =
    outputTensorToCanvas(
      outputTensor,
      image.width,
      image.height
    );

  onProgress?.(
    96,
    "Blending the repaired scenery..."
  );

  /*
   * Composite at working resolution.
   */
  const processedCanvas =
    compositeAIResultOnlyInsideMask(
      working.base,
      generatedCanvas,
      working.mask
    );

  /*
   * Restore to the original editor size.
   *
   * This keeps the rest of the editor's expected
   * canvas dimensions unchanged.
   */
  const finalCanvas =
    restoreToOriginalSize(
      processedCanvas,
      baseCanvas
    );

  onProgress?.(
    100,
    "Object removed successfully."
  );

  return finalCanvas;
}






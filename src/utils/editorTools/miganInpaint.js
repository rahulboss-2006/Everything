/* =========================================================
   LOCAL AI OBJECT REMOVAL (MI-GAN / ONNX)
   Runs in-browser. The image is NOT sent to a server.
========================================================= */

import * as ort from "onnxruntime-web";
import { clamp } from "./canvasHelpers";

const MI_GAN_MODEL_URL =
  "https://huggingface.co/edgetools/migan/resolve/main/migan_pipeline_v2.onnx";

let miGanSessionPromise = null;

export async function getMiGanSession(onProgress) {
  if (miGanSessionPromise) {
    onProgress?.(35, "Loading AI model...");
    return miGanSessionPromise;
  }

  miGanSessionPromise = (async () => {
    /*
      Do not mix WASM files from a CDN with the JS runtime bundled by the
      installed `onnxruntime-web` package (version mismatch causes errors such
      as `_OrtGetInputName is not a function`). Let ONNX Runtime Web resolve
      its own bundled WASM files.
    */
    ort.env.wasm.numThreads = Math.min(
      4,
      Math.max(1, navigator.hardwareConcurrency || 2)
    );
    ort.env.wasm.simd = true;
    ort.env.wasm.wasmPaths = undefined;

    // WASM keeps the MI-GAN path stable on browsers with partial WebGPU support.
    const executionProviders = ["wasm"];

    onProgress?.(5, "Downloading AI model...");

    const response = await fetch(MI_GAN_MODEL_URL, {
      mode: "cors",
      cache: "force-cache",
    });

    if (!response.ok) {
      throw new Error(`Could not download AI model (${response.status}).`);
    }

    const total = Number(response.headers.get("content-length")) || 0;
    const reader = response.body?.getReader();
    const chunks = [];
    let received = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          if (total > 0) {
            const percent = 5 + (received / total) * 25;
            onProgress?.(Math.min(30, percent), "Downloading AI model...");
          }
        }
      }
    } else {
      const buffer = await response.arrayBuffer();
      chunks.push(new Uint8Array(buffer));
      received = buffer.byteLength;
      onProgress?.(30, "AI model downloaded.");
    }

    const modelBuffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      modelBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    onProgress?.(35, "Initializing AI model...");

    return ort.InferenceSession.create(modelBuffer.buffer, {
      executionProviders,
      graphOptimizationLevel: "all",
    });
  })().catch((error) => {
    miGanSessionPromise = null;
    throw error;
  });

  return miGanSessionPromise;
}

/* ---------------------------------------------------------
   MASK
--------------------------------------------------------- */

export function buildAIInpaintMaskCanvas(
  baseCanvas,
  editedCanvas,
  explicitSelectionCanvas = null,
  brushSize = 40
) {
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = baseCanvas.width;
  maskCanvas.height = baseCanvas.height;

  const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });

  if (!maskCtx) throw new Error("Could not create the AI object mask.");

  if (explicitSelectionCanvas) {
    const selectionCtx = explicitSelectionCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!selectionCtx) {
      throw new Error("Could not read the AI object selection.");
    }
    const selection = selectionCtx.getImageData(
      0,
      0,
      explicitSelectionCanvas.width,
      explicitSelectionCanvas.height
    );
    const output = maskCtx.createImageData(baseCanvas.width, baseCanvas.height);
    for (let i = 0; i < output.data.length; i += 4) {
      // A single brush dot is ~8/255 alpha, so the threshold must be below that.
      const selected = selection.data[i + 3] > 4;
      const value = selected ? 0 : 255;
      output.data[i] = value;
      output.data[i + 1] = value;
      output.data[i + 2] = value;
      output.data[i + 3] = 255;
    }
    maskCtx.putImageData(output, 0, 0);
  } else {
    const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true });
    const editedCtx = editedCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!baseCtx || !editedCtx) {
      throw new Error("Could not create the AI object mask.");
    }
    const baseData = baseCtx.getImageData(
      0,
      0,
      baseCanvas.width,
      baseCanvas.height
    );
    const editedData = editedCtx.getImageData(
      0,
      0,
      editedCanvas.width,
      editedCanvas.height
    );
    const maskData = maskCtx.createImageData(
      baseCanvas.width,
      baseCanvas.height
    );
    for (let i = 0; i < baseData.data.length; i += 4) {
      const erase =
        baseData.data[i + 3] > 8 &&
        baseData.data[i + 3] - editedData.data[i + 3] > 18;
      const value = erase ? 0 : 255;
      maskData.data[i] = value;
      maskData.data[i + 1] = value;
      maskData.data[i + 2] = value;
      maskData.data[i + 3] = 255;
    }
    maskCtx.putImageData(maskData, 0, 0);
  }

  // Expand the selection slightly so the object's edge/halo is also
  // reconstructed. A blurred binary mask is thresholded back to a clean
  // MI-GAN mask; much faster than per-pixel dilation on large photos.
  const expansion = clamp(
    Math.round(brushSize * (baseCanvas.width / 1000) * 0.055),
    1,
    14
  );

  if (expansion > 0) {
    const expandedCanvas = document.createElement("canvas");
    expandedCanvas.width = maskCanvas.width;
    expandedCanvas.height = maskCanvas.height;
    const expandedCtx = expandedCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (expandedCtx) {
      expandedCtx.fillStyle = "#ffffff";
      expandedCtx.fillRect(0, 0, expandedCanvas.width, expandedCanvas.height);
      expandedCtx.filter = `blur(${expansion}px)`;
      expandedCtx.drawImage(maskCanvas, 0, 0);
      expandedCtx.filter = "none";

      const blurred = expandedCtx.getImageData(
        0,
        0,
        expandedCanvas.width,
        expandedCanvas.height
      );

      for (let i = 0; i < blurred.data.length; i += 4) {
        const erase = blurred.data[i] < 245;
        const value = erase ? 0 : 255;
        blurred.data[i] = value;
        blurred.data[i + 1] = value;
        blurred.data[i + 2] = value;
        blurred.data[i + 3] = 255;
      }

      expandedCtx.putImageData(blurred, 0, 0);
      return expandedCanvas;
    }
  }

  return maskCanvas;
}

/* ---------------------------------------------------------
   TENSOR <-> CANVAS
--------------------------------------------------------- */

export function canvasToCHWUint8(sourceCanvas) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) throw new Error("Could not read the editor image.");

  const data = ctx.getImageData(0, 0, width, height).data;
  const chw = new Uint8Array(3 * width * height);
  const planeSize = width * height;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    chw[p] = data[i];
    chw[planeSize + p] = data[i + 1];
    chw[planeSize * 2 + p] = data[i + 2];
  }

  return { data: chw, width, height };
}

export function maskCanvasToCHWUint8(maskCanvas) {
  const width = maskCanvas.width;
  const height = maskCanvas.height;
  const ctx = maskCanvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) throw new Error("Could not read the AI mask.");

  const data = ctx.getImageData(0, 0, width, height).data;
  const chw = new Uint8Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    chw[p] = data[i];
  }

  return { data: chw, width, height };
}

export function outputTensorToCanvas(outputTensor, width, height) {
  const output = outputTensor?.data;
  if (!output) throw new Error("AI model returned no image data.");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create the AI result canvas.");

  const imageData = ctx.createImageData(width, height);
  const planeSize = width * height;

  for (let p = 0; p < planeSize; p += 1) {
    const i = p * 4;
    imageData.data[i] = clamp(Math.round(output[p]), 0, 255);
    imageData.data[i + 1] = clamp(Math.round(output[planeSize + p]), 0, 255);
    imageData.data[i + 2] = clamp(
      Math.round(output[planeSize * 2 + p]),
      0,
      255
    );
    imageData.data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/* ---------------------------------------------------------
   COMPOSITE
--------------------------------------------------------- */

export function compositeAIResultOnlyInsideMask(
  originalCanvas,
  generatedCanvas,
  maskCanvas
) {
  const width = originalCanvas.width;
  const height = originalCanvas.height;

  const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });

  if (!maskCtx) {
    throw new Error("Could not composite the AI object-removal result.");
  }

  const mask = maskCtx.getImageData(0, 0, width, height);
  const alphaCanvas = document.createElement("canvas");
  alphaCanvas.width = width;
  alphaCanvas.height = height;
  const alphaCtx = alphaCanvas.getContext("2d");

  if (!alphaCtx) throw new Error("Could not create the AI blend mask.");

  const alpha = alphaCtx.createImageData(width, height);

  // MI-GAN: 0 = erase, 255 = keep. Convert to a replacement alpha.
  for (let i = 0; i < mask.data.length; i += 4) {
    const replace = 255 - mask.data[i];
    alpha.data[i] = 255;
    alpha.data[i + 1] = 255;
    alpha.data[i + 2] = 255;
    alpha.data[i + 3] = replace;
  }

  alphaCtx.putImageData(alpha, 0, 0);

  // Tiny feather to remove hard seams.
  const featherCanvas = document.createElement("canvas");
  featherCanvas.width = width;
  featherCanvas.height = height;
  const featherCtx = featherCanvas.getContext("2d");

  if (!featherCtx) throw new Error("Could not create the AI feather mask.");

  featherCtx.filter = "blur(1.5px)";
  featherCtx.drawImage(alphaCanvas, 0, 0);
  featherCtx.filter = "none";

  const generatedMasked = document.createElement("canvas");
  generatedMasked.width = width;
  generatedMasked.height = height;
  const gmCtx = generatedMasked.getContext("2d");

  if (!gmCtx) throw new Error("Could not prepare the AI composite.");

  gmCtx.drawImage(generatedCanvas, 0, 0);
  gmCtx.globalCompositeOperation = "destination-in";
  gmCtx.drawImage(featherCanvas, 0, 0);

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = width;
  finalCanvas.height = height;
  const finalCtx = finalCanvas.getContext("2d");

  if (!finalCtx) throw new Error("Could not create final AI image.");

  // Exact original everywhere, generated pixels only inside the mask.
  finalCtx.drawImage(originalCanvas, 0, 0);
  finalCtx.drawImage(generatedMasked, 0, 0);

  return finalCanvas;
}

/* ---------------------------------------------------------
   RUN
--------------------------------------------------------- */

export async function runLocalAIObjectRemoval(
  baseCanvas,
  maskCanvas,
  onProgress
) {
  const session = await getMiGanSession(onProgress);
  onProgress?.(45, "Preparing object mask...");

  const image = canvasToCHWUint8(baseCanvas);
  const mask = maskCanvasToCHWUint8(maskCanvas);

  const imageTensor = new ort.Tensor("uint8", image.data, [
    1,
    3,
    image.height,
    image.width,
  ]);

  const maskTensor = new ort.Tensor("uint8", mask.data, [
    1,
    1,
    mask.height,
    mask.width,
  ]);

  const feeds = {};
  const inputNames = session.inputNames || [];

  const imageInput =
    inputNames.find((name) => /image|input/i.test(name)) || inputNames[0];
  const maskInput =
    inputNames.find((name) => /mask/i.test(name)) || inputNames[1];

  if (!imageInput || !maskInput) {
    throw new Error("The AI inpainting model inputs could not be detected.");
  }

  feeds[imageInput] = imageTensor;
  feeds[maskInput] = maskTensor;

  onProgress?.(55, "AI is reconstructing the background...");

  let simulated = 55;
  const progressTimer = setInterval(() => {
    simulated = Math.min(92, simulated + 1);
    onProgress?.(simulated, "AI is reconstructing the background...");
  }, 120);

  let results;
  try {
    results = await session.run(feeds);
  } finally {
    clearInterval(progressTimer);
  }

  onProgress?.(95, "Blending the repaired scenery...");

  const outputName =
    (session.outputNames || []).find((name) =>
      /result|output|image/i.test(name)
    ) || session.outputNames?.[0];

  const outputTensor = outputName
    ? results[outputName]
    : Object.values(results)[0];

  if (!outputTensor) {
    throw new Error("The AI inpainting model returned no result.");
  }

  const generatedCanvas = outputTensorToCanvas(
    outputTensor,
    image.width,
    image.height
  );

  const finalCanvas = compositeAIResultOnlyInsideMask(
    baseCanvas,
    generatedCanvas,
    maskCanvas
  );

  onProgress?.(100, "Object removed successfully.");
  return finalCanvas;
}

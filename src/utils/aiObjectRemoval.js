/* =========================================================
   aiObjectRemoval.js
   AI OBJECT REMOVAL / MI-GAN INPAINTING

   IMPORTANT
   ----------
   ONNX Runtime MUST be loaded through ortSafe.js.

   This prevents this file from bypassing the global ORT
   safety configuration:

     numThreads = 1
     proxy      = false
     simd       = true

   This is important for GitHub Pages where worker/proxy
   based WASM execution can be unreliable.
========================================================= */

import { getSafeOrt } from "./ortSafe";


/* =========================================================
   ONNX RUNTIME LOADER
========================================================= */

let ortModulePromise = null;

async function getOrt() {
  if (!ortModulePromise) {
    ortModulePromise =
      getSafeOrt().catch((error) => {
        /*
         * Do not permanently cache a failed ORT load.
         *
         * If the first attempt fails because an asset
         * temporarily fails to load, the next AI operation
         * can retry.
         */
        ortModulePromise = null;

        throw error;
      });
  }

  return ortModulePromise;
}


/* =========================================================
   HELPERS
========================================================= */

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );
}


/* =========================================================
   CANVAS -> BLOB
========================================================= */

export async function canvasToBlob(
  sourceCanvas,
  type = "image/png",
  quality = 1
) {
  return new Promise(
    (resolve, reject) => {
      if (!sourceCanvas) {
        reject(
          new Error(
            "Source canvas is missing."
          )
        );

        return;
      }

      sourceCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Could not create image data."
              )
            );

            return;
          }

          resolve(blob);
        },
        type,
        quality
      );
    }
  );
}


/* =========================================================
   CANVAS -> CHW UINT8
========================================================= */

export function canvasToCHWUint8(
  sourceCanvas
) {
  if (!sourceCanvas) {
    throw new Error(
      "Editor canvas is missing."
    );
  }

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

  const planeSize =
    width * height;

  const chw =
    new Uint8Array(
      3 * planeSize
    );

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


/* =========================================================
   MASK CANVAS -> CHW UINT8
========================================================= */

export function maskCanvasToCHWUint8(
  maskCanvas
) {
  if (!maskCanvas) {
    throw new Error(
      "AI mask canvas is missing."
    );
  }

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


/* =========================================================
   BUILD AI INPAINT MASK

   MI-GAN MASK:
   0   = remove / generate
   255 = keep
========================================================= */

export function buildAIInpaintMaskCanvas(
  baseCanvas,
  explicitSelectionCanvas = null,
  brushSize = 40
) {
  if (!baseCanvas) {
    throw new Error(
      "Base image canvas is missing."
    );
  }

  const maskCanvas =
    document.createElement(
      "canvas"
    );

  maskCanvas.width =
    baseCanvas.width;

  maskCanvas.height =
    baseCanvas.height;

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


  /* -------------------------------------------------------
     EXPLICIT BRUSH SELECTION
  ------------------------------------------------------- */

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
        maskCanvas.width,
        maskCanvas.height
      );

    /*
      Brush selection:
      alpha > 10 = selected object

      selected     = 0
      everything   = 255
    */

    for (
      let i = 0;
      i < output.data.length;
      i += 4
    ) {
      const selected =
        selection.data[i + 3] >
        10;

      const value =
        selected
          ? 0
          : 255;

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
    /*
      No explicit selection.
      Keep everything.
    */

    maskCtx.fillStyle =
      "#ffffff";

    maskCtx.fillRect(
      0,
      0,
      maskCanvas.width,
      maskCanvas.height
    );
  }


  /* -------------------------------------------------------
     SLIGHT MASK EXPANSION

     Helps remove object edges / halo.
  ------------------------------------------------------- */

  const expansion =
    clamp(
      Math.round(
        brushSize *
        (
          maskCanvas.width /
          1000
        ) *
        0.055
      ),
      1,
      14
    );

  if (expansion <= 0) {
    return maskCanvas;
  }

  const expandedCanvas =
    document.createElement(
      "canvas"
    );

  expandedCanvas.width =
    maskCanvas.width;

  expandedCanvas.height =
    maskCanvas.height;

  const expandedCtx =
    expandedCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!expandedCtx) {
    return maskCanvas;
  }

  /*
    White background = keep
    Black area = remove
  */

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
      erase
        ? 0
        : 255;

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


/* =========================================================
   OUTPUT TENSOR -> CANVAS

   Expected MI-GAN output:

     [1, 3, H, W]

   R plane
   G plane
   B plane
========================================================= */

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
    document.createElement(
      "canvas"
    );

  canvas.width =
    width;

  canvas.height =
    height;

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
    const i =
      p * 4;

    let r =
      Number(
        output[p]
      );

    let g =
      Number(
        output[
          planeSize + p
        ]
      );

    let b =
      Number(
        output[
          planeSize * 2 + p
        ]
      );

    /*
     * Some ONNX models return normalized
     * floating point values [0, 1].
     *
     * Others return [0, 255].
     */
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

    imageData.data[i] =
      clamp(
        Math.round(r),
        0,
        255
      );

    imageData.data[i + 1] =
      clamp(
        Math.round(g),
        0,
        255
      );

    imageData.data[i + 2] =
      clamp(
        Math.round(b),
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


/* =========================================================
   COMPOSITE AI RESULT

   IMPORTANT:
   Original image remains untouched.

   AI generated image is inserted ONLY
   inside selected/removal area.
========================================================= */

export function compositeAIResultOnlyInsideMask(
  originalCanvas,
  generatedCanvas,
  maskCanvas
) {
  if (
    !originalCanvas ||
    !generatedCanvas ||
    !maskCanvas
  ) {
    throw new Error(
      "AI composite canvases are missing."
    );
  }

  const width =
    originalCanvas.width;

  const height =
    originalCanvas.height;


  /* -------------------------------------------------------
     READ MASK
  ------------------------------------------------------- */

  const maskCtx =
    maskCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!maskCtx) {
    throw new Error(
      "Could not read the AI blend mask."
    );
  }

  const mask =
    maskCtx.getImageData(
      0,
      0,
      width,
      height
    );


  /* -------------------------------------------------------
     CREATE ALPHA MASK

     MI-GAN:
     0   = erase
     255 = keep

     Composite:
     255 - mask = generated alpha
  ------------------------------------------------------- */

  const alphaCanvas =
    document.createElement(
      "canvas"
    );

  alphaCanvas.width =
    width;

  alphaCanvas.height =
    height;

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


  /* -------------------------------------------------------
     FEATHER EDGE
  ------------------------------------------------------- */

  const featherCanvas =
    document.createElement(
      "canvas"
    );

  featherCanvas.width =
    width;

  featherCanvas.height =
    height;

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


  /* -------------------------------------------------------
     MASK GENERATED AI IMAGE
  ------------------------------------------------------- */

  const generatedMasked =
    document.createElement(
      "canvas"
    );

  generatedMasked.width =
    width;

  generatedMasked.height =
    height;

  const generatedCtx =
    generatedMasked.getContext(
      "2d"
    );

  if (!generatedCtx) {
    throw new Error(
      "Could not prepare the AI composite."
    );
  }

  generatedCtx.drawImage(
    generatedCanvas,
    0,
    0
  );

  generatedCtx.globalCompositeOperation =
    "destination-in";

  generatedCtx.drawImage(
    featherCanvas,
    0,
    0
  );

  generatedCtx.globalCompositeOperation =
    "source-over";


  /* -------------------------------------------------------
     FINAL IMAGE

     Original stays exactly as it was.
     Generated scenery goes only into mask.
  ------------------------------------------------------- */

  const finalCanvas =
    document.createElement(
      "canvas"
    );

  finalCanvas.width =
    width;

  finalCanvas.height =
    height;

  const finalCtx =
    finalCanvas.getContext(
      "2d"
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


/* =========================================================
   RUN LOCAL MI-GAN
========================================================= */

export async function runLocalAIObjectRemoval({
  baseCanvas,
  maskCanvas,
  getMiGanSession,
  onProgress,
}) {
  /*
   * IMPORTANT:
   *
   * This now always goes through ortSafe.js.
   *
   * No direct:
   *
   *   import("onnxruntime-web")
   *
   * exists in this file.
   */
  const ort =
    await getOrt();

  if (!baseCanvas) {
    throw new Error(
      "Base image is missing."
    );
  }

  if (!maskCanvas) {
    throw new Error(
      "Object mask is missing."
    );
  }

  if (
    typeof getMiGanSession !==
    "function"
  ) {
    throw new Error(
      "MI-GAN session loader is missing."
    );
  }


  /* -------------------------------------------------------
     LOAD MODEL
  ------------------------------------------------------- */

  const session =
    await getMiGanSession(
      onProgress
    );


  /* -------------------------------------------------------
     PREPARE IMAGE + MASK
  ------------------------------------------------------- */

  onProgress?.(
    45,
    "Preparing object mask..."
  );

  const image =
    canvasToCHWUint8(
      baseCanvas
    );

  const mask =
    maskCanvasToCHWUint8(
      maskCanvas
    );


  /* -------------------------------------------------------
     CREATE ONNX TENSORS
  ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     DETECT INPUT NAMES
  ------------------------------------------------------- */

  const feeds = {};

  const inputNames =
    session.inputNames ||
    [];

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


  /* -------------------------------------------------------
     RUN AI
  ------------------------------------------------------- */

  onProgress?.(
    55,
    "AI is reconstructing the background..."
  );

  let simulated =
    55;

  const progressTimer =
    setInterval(
      () => {
        simulated =
          Math.min(
            92,
            simulated + 1
          );

        onProgress?.(
          simulated,
          "AI is reconstructing the background..."
        );
      },
      120
    );

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


  /* -------------------------------------------------------
     GET OUTPUT
  ------------------------------------------------------- */

  onProgress?.(
    95,
    "Blending the repaired scenery..."
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


  /* -------------------------------------------------------
     OUTPUT -> CANVAS
  ------------------------------------------------------- */

  const generatedCanvas =
    outputTensorToCanvas(
      outputTensor,
      image.width,
      image.height
    );


  /* -------------------------------------------------------
     COMPOSITE ONLY SELECTED AREA
  ------------------------------------------------------- */

  const finalCanvas =
    compositeAIResultOnlyInsideMask(
      baseCanvas,
      generatedCanvas,
      maskCanvas
    );


  /* -------------------------------------------------------
     COMPLETE
  ------------------------------------------------------- */

  onProgress?.(
    100,
    "Object removed successfully."
  );

  return finalCanvas;
}


/* =========================================================
   VALIDATE BRUSH SELECTION
========================================================= */

export function hasAIObjectSelection(
  selectionCanvas
) {
  if (!selectionCanvas) {
    return false;
  }

  const ctx =
    selectionCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!ctx) {
    return false;
  }

  const data =
    ctx.getImageData(
      0,
      0,
      selectionCanvas.width,
      selectionCanvas.height
    );

  let selectedPixels =
    0;

  for (
    let i = 3;
    i < data.data.length;
    i += 4
  ) {
    if (
      data.data[i] >
      10
    ) {
      selectedPixels += 1;

      if (
        selectedPixels >
        20
      ) {
        return true;
      }
    }
  }

  return false;
}
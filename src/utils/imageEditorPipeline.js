/* =========================================================
   IMAGE EDITOR PIPELINE
   ---------------------------------------------------------
   Order:

   Original Image
        ↓
   Adjustments
        ↓
   Rotation / Flip / Offset
        ↓
   Effects
        ↓
   Visible Output Canvas

   IMPORTANT:
   - Main visible canvas is NEVER used as an effect source.
   - Every effect gets a fresh off-screen canvas.
   - Adjustment values use editor state semantics:
       0 = normal
      -100 = minimum
      +100 = maximum
========================================================= */

import {
  EFFECT_PRESETS,
} from "./editorEffects";


/* =========================================================
   HELPERS
========================================================= */

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


/* =========================================================
   EFFECT LIST
========================================================= */

function getEffectList() {

  if (
    Array.isArray(
      EFFECT_PRESETS
    )
  ) {
    return EFFECT_PRESETS;
  }


  if (
    EFFECT_PRESETS &&
    typeof EFFECT_PRESETS === "object"
  ) {

    return Object.values(
      EFFECT_PRESETS
    ).flatMap(
      (value) => {

        if (
          Array.isArray(value)
        ) {
          return value;
        }

        if (
          value &&
          typeof value === "object"
        ) {
          return [value];
        }

        return [];
      }
    );
  }


  return [];
}


/* =========================================================
   GET EFFECT PRESET
========================================================= */

function getEffectPreset(
  effectId
) {

  if (
    !effectId ||
    effectId === "Preview"
  ) {
    return null;
  }


  const effects =
    getEffectList();


  return (
    effects.find(
      (effect) =>
        effect &&
        effect.id === effectId
    ) || null
  );
}


/* =========================================================
   EFFECT FILTER
========================================================= */

function getEffectFilter(
  effect
) {

  if (!effect) {
    return "none";
  }


  /* -------------------------------------------------------
     Direct CSS filter
  ------------------------------------------------------- */

  if (
    typeof effect.filter === "string" &&
    effect.filter.trim()
  ) {
    return effect.filter.trim();
  }


  const filters = [];


  /* -------------------------------------------------------
     Brightness
     Supports both:
       1.2
       120
  ------------------------------------------------------- */

  if (
    typeof effect.brightness === "number"
  ) {

    const value =
      effect.brightness;

    filters.push(
      `brightness(${
        Math.abs(value) > 3
          ? `${value}%`
          : value
      })`
    );
  }


  /* -------------------------------------------------------
     Contrast
  ------------------------------------------------------- */

  if (
    typeof effect.contrast === "number"
  ) {

    const value =
      effect.contrast;

    filters.push(
      `contrast(${
        Math.abs(value) > 3
          ? `${value}%`
          : value
      })`
    );
  }


  /* -------------------------------------------------------
     Saturation
  ------------------------------------------------------- */

  if (
    typeof effect.saturation === "number"
  ) {

    const value =
      effect.saturation;

    filters.push(
      `saturate(${
        Math.abs(value) > 3
          ? `${value}%`
          : value
      })`
    );
  }


  /* -------------------------------------------------------
     Grayscale
  ------------------------------------------------------- */

  if (
    typeof effect.grayscale === "number"
  ) {

    const value =
      effect.grayscale;


    filters.push(
      `grayscale(${
        value > 1
          ? `${clamp(
              value,
              0,
              100
            )}%`
          : clamp(
              value,
              0,
              1
            )
      })`
    );
  }


  /* -------------------------------------------------------
     Sepia
  ------------------------------------------------------- */

  if (
    typeof effect.sepia === "number"
  ) {

    const value =
      effect.sepia;


    filters.push(
      `sepia(${
        value > 1
          ? `${clamp(
              value,
              0,
              100
            )}%`
          : clamp(
              value,
              0,
              1
            )
      })`
    );
  }


  /* -------------------------------------------------------
     Invert
  ------------------------------------------------------- */

  if (
    typeof effect.invert === "number"
  ) {

    const value =
      effect.invert;


    filters.push(
      `invert(${
        value > 1
          ? `${clamp(
              value,
              0,
              100
            )}%`
          : clamp(
              value,
              0,
              1
            )
      })`
    );
  }


  /* -------------------------------------------------------
     Hue Rotate
  ------------------------------------------------------- */

  if (
    typeof effect.hueRotate === "number"
  ) {

    filters.push(
      `hue-rotate(${
        effect.hueRotate
      }deg)`
    );
  }


  /* -------------------------------------------------------
     Blur
  ------------------------------------------------------- */

  if (
    typeof effect.blur === "number"
  ) {

    filters.push(
      `blur(${
        Math.max(
          0,
          effect.blur
        )
      }px)`
    );
  }


  /* -------------------------------------------------------
     Opacity
  ------------------------------------------------------- */

  if (
    typeof effect.opacity === "number"
  ) {

    const value =
      effect.opacity;


    filters.push(
      `opacity(${
        value > 1
          ? `${clamp(
              value,
              0,
              100
            )}%`
          : clamp(
              value,
              0,
              1
            )
      })`
    );
  }


  return filters.length
    ? filters.join(" ")
    : "none";
}


/* =========================================================
   REUSED SCRATCH CANVAS
   Allocating a new full-size canvas on every slider tick is slow
   and floods the garbage collector. One canvas is reused.
========================================================= */

let scratchCanvas = null;

function getScratchCanvas(width, height) {
  if (!scratchCanvas) {
    scratchCanvas = document.createElement("canvas");
  }

  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  if (scratchCanvas.width !== w) scratchCanvas.width = w;
  if (scratchCanvas.height !== h) scratchCanvas.height = h;

  return scratchCanvas;
}


/* =========================================================
   COMBINED EFFECT FILTER
   All selected effects are merged into ONE CSS filter list and
   applied in a single draw (was: one new canvas per effect).
========================================================= */

function getCombinedEffectFilter(selectedEffects) {
  if (!Array.isArray(selectedEffects)) return "none";

  const parts = [];

  for (const effectId of selectedEffects) {
    if (!effectId || effectId === "Preview") continue;

    const filter = getEffectFilter(getEffectPreset(effectId));

    if (filter && filter !== "none") parts.push(filter);
  }

  return parts.length ? parts.join(" ") : "none";
}

/* =========================================================
   SAFE OFF-SCREEN CANVAS
========================================================= */

function createCanvas(
  width,
  height
) {

  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    Math.max(
      1,
      Math.round(width)
    );


  canvas.height =
    Math.max(
      1,
      Math.round(height)
    );


  return canvas;
}


/* =========================================================
   PREPARE CONTEXT
========================================================= */

function prepareContext(
  ctx
) {

  if (!ctx) {
    return;
  }


  ctx.imageSmoothingEnabled =
    true;


  try {

    ctx.imageSmoothingQuality =
      "high";

  } catch {
    // Older browsers
  }
}


/* =========================================================
   EDITOR ADJUSTMENT FILTER
   ---------------------------------------------------------
   IMPORTANT:

   Editor state:
       brightness 0  = normal
       contrast   0  = normal
       saturation 0  = normal

   Therefore:
       0   → 100%
       +20 → 120%
       -20 → 80%
========================================================= */

function getAdjustmentFilter({
  brightness = 0,
  contrast = 0,
  saturation = 0,
}) {

  const safeBrightness =
    Number.isFinite(
      Number(brightness)
    )
      ? Number(brightness)
      : 0;


  const safeContrast =
    Number.isFinite(
      Number(contrast)
    )
      ? Number(contrast)
      : 0;


  const safeSaturation =
    Number.isFinite(
      Number(saturation)
    )
      ? Number(saturation)
      : 0;


  return [
    `brightness(${
      Math.max(
        0,
        100 + safeBrightness
      )
    }%)`,

    `contrast(${
      Math.max(
        0,
        100 + safeContrast
      )
    }%)`,

    `saturate(${
      Math.max(
        0,
        100 + safeSaturation
      )
    }%)`,
  ].join(" ");
}


/* =========================================================
   DRAW BASE IMAGE
========================================================= */

function drawBaseImage({
  image,

  brightness,
  contrast,
  saturation,

  rotation,

  flipX,
  flipY,

  imageOffset,
}) {

  if (!image) {

    throw new Error(
      "Image is required."
    );
  }


  const sourceWidth =
    Math.max(
      1,
      Math.round(
        image.naturalWidth ||
        image.videoWidth ||
        image.width ||
        1
      )
    );


  const sourceHeight =
    Math.max(
      1,
      Math.round(
        image.naturalHeight ||
        image.videoHeight ||
        image.height ||
        1
      )
    );


  const normalizedRotation =
    (
      (Number(rotation) || 0) %
      360 +
      360
    ) % 360;


  const isQuarterTurn =
    normalizedRotation === 90 ||
    normalizedRotation === 270;


  const outputWidth =
    isQuarterTurn
      ? sourceHeight
      : sourceWidth;


  const outputHeight =
    isQuarterTurn
      ? sourceWidth
      : sourceHeight;


  const canvas = getScratchCanvas(outputWidth, outputHeight);


  const ctx =
    canvas.getContext(
      "2d",
      {
        alpha: true,
      }
    );


  if (!ctx) {

    throw new Error(
      "Could not create canvas context."
    );
  }


  prepareContext(ctx);


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  /*
   * Apply adjustments only here.
   * The visible canvas is not involved.
   */

  ctx.filter =
    getAdjustmentFilter({
      brightness,
      contrast,
      saturation,
    });


  ctx.save();


  ctx.translate(
    canvas.width / 2,
    canvas.height / 2
  );


  if (
    normalizedRotation !== 0
  ) {

    ctx.rotate(
      normalizedRotation *
        Math.PI /
        180
    );
  }


  ctx.scale(
    flipX ? -1 : 1,
    flipY ? -1 : 1
  );


  const offsetX =
    Number(
      imageOffset?.x
    ) || 0;


  const offsetY =
    Number(
      imageOffset?.y
    ) || 0;


  try {

    ctx.drawImage(
      image,

      -sourceWidth / 2 +
        offsetX,

      -sourceHeight / 2 +
        offsetY,

      sourceWidth,
      sourceHeight
    );

  } finally {

    ctx.restore();

    ctx.filter =
      "none";
  }


  return canvas;
}


/* =========================================================
   APPLY ONE EFFECT
   ---------------------------------------------------------
   Every effect gets a completely new canvas.
========================================================= */

function applyEffect(
  sourceCanvas,
  effect
) {

  if (!sourceCanvas) {
    return null;
  }


  if (!effect) {
    return sourceCanvas;
  }


  const outputCanvas =
    createCanvas(
      sourceCanvas.width,
      sourceCanvas.height
    );


  const ctx =
    outputCanvas.getContext(
      "2d",
      {
        alpha: true,
      }
    );


  if (!ctx) {

    throw new Error(
      "Could not create effect canvas context."
    );
  }


  prepareContext(ctx);


  ctx.clearRect(
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  );


  const filter =
    getEffectFilter(
      effect
    );


  try {

    ctx.filter =
      filter || "none";


    ctx.drawImage(
      sourceCanvas,
      0,
      0,
      outputCanvas.width,
      outputCanvas.height
    );

  } finally {

    ctx.filter =
      "none";
  }


  return outputCanvas;
}


/* =========================================================
   APPLY EFFECTS SEQUENTIALLY
========================================================= */



/* =========================================================
   COPY FINAL RESULT
   ---------------------------------------------------------
   IMPORTANT:
   We preserve the existing output canvas
   element. Only its drawing buffer is updated.
========================================================= */

function copyCanvas(sourceCanvas, outputCanvas, filter = "none") {

  if (
    !sourceCanvas ||
    !outputCanvas
  ) {
    return;
  }


  const width =
    sourceCanvas.width;


  const height =
    sourceCanvas.height;


  /*
   * Only update dimensions when
   * actually necessary.
   */

  if (
    outputCanvas.width !== width
  ) {

    outputCanvas.width =
      width;
  }


  if (
    outputCanvas.height !== height
  ) {

    outputCanvas.height =
      height;
  }


  const ctx =
    outputCanvas.getContext(
      "2d",
      {
        alpha: true,
      }
    );


  if (!ctx) {

    throw new Error(
      "Could not create output canvas context."
    );
  }


  prepareContext(ctx);


  ctx.clearRect(
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  );


  ctx.filter = filter || "none";


  ctx.drawImage(
    sourceCanvas,
    0,
    0,
    width,
    height
  );


  ctx.filter =
    "none";
}


/* =========================================================
   MAIN RENDER FUNCTION
========================================================= */

export function renderImageEdits({
  image,

  /*
   * IMPORTANT:
   * Defaults MUST be 0 because ImageEditor
   * stores adjustment state as 0 = normal.
   */

  brightness = 0,
  contrast = 0,
  saturation = 0,

  rotation = 0,

  flipX = false,
  flipY = false,

  imageOffset = {
    x: 0,
    y: 0,
  },

  selectedEffects = [],

  outputCanvas,
}) {

  if (!image) {
    return;
  }


  if (!outputCanvas) {

    throw new Error(
      "outputCanvas is required."
    );
  }


  /* -------------------------------------------------------
     STEP 1
     Image + adjustments + transform
  ------------------------------------------------------- */

  const baseCanvas =
    drawBaseImage({

      image,

      brightness,
      contrast,
      saturation,

      rotation,

      flipX,
      flipY,

      imageOffset,
    });


  /* -------------------------------------------------------
     STEP 2
     Effects
  ------------------------------------------------------- */

  const effectFilter = getCombinedEffectFilter(selectedEffects);


  /* -------------------------------------------------------
     STEP 3
     Copy final result to visible canvas
  ------------------------------------------------------- */

  copyCanvas(baseCanvas, outputCanvas, effectFilter);
}


/* =========================================================
   CANVAS → BLOB
========================================================= */

export function canvasToBlob(
  canvas,
  type = "image/png",
  quality = 1
) {

  return new Promise(
    (resolve, reject) => {

      if (!canvas) {

        reject(
          new Error(
            "Canvas is required."
          )
        );

        return;
      }


      try {

        canvas.toBlob(
          (blob) => {

            if (!blob) {

              reject(
                new Error(
                  "Canvas could not be converted to Blob."
                )
              );

              return;
            }


            resolve(blob);
          },

          type,

          quality
        );

      } catch (error) {

        reject(error);
      }
    }
  );
}


/* =========================================================
   CANVAS → FILE
========================================================= */

export async function canvasToFile(
  canvas,
  fileName = "edited-image.png",
  type = "image/png",
  quality = 1
) {

  const blob =
    await canvasToBlob(
      canvas,
      type,
      quality
    );


  return new File(
    [blob],
    fileName,
    {
      type:
        blob.type ||
        type,
    }
  );
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  renderImageEdits,
  canvasToBlob,
  canvasToFile,
};
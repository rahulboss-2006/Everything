/* =========================================================
   IMAGE EDITOR PIPELINE
   ---------------------------------------------------------
   EDIT MODE:
      Original Image
           ↓
      Preview Resolution
           ↓
      Adjustments
           ↓
      Rotation / Flip / Offset
           ↓
      Effects
           ↓
      Visible Output Canvas

   APPLY / EXPORT:
      Original Image
           ↓
      Full Resolution
           ↓
      Adjustments
           ↓
      Rotation / Flip / Offset
           ↓
      Effects
           ↓
      PNG Export

   IMPORTANT:
   - Preview rendering can use renderScale < 1.
   - Final rendering uses renderScale = 1.
   - Original image is never modified.
   - Visible canvas is never used as an effect source.
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
========================================================= */

let scratchCanvas = null;

function getScratchCanvas(
  width,
  height
) {
  if (!scratchCanvas) {
    scratchCanvas =
      document.createElement(
        "canvas"
      );
  }

  const w =
    Math.max(
      1,
      Math.round(width)
    );

  const h =
    Math.max(
      1,
      Math.round(height)
    );

  if (
    scratchCanvas.width !== w
  ) {
    scratchCanvas.width = w;
  }

  if (
    scratchCanvas.height !== h
  ) {
    scratchCanvas.height = h;
  }

  return scratchCanvas;
}


/* =========================================================
   PING CANVASES
========================================================= */

const FILTERS_PER_PASS = 3;

let pingCanvases = [
  null,
  null,
];

function getPingCanvas(
  index,
  width,
  height
) {
  if (!pingCanvases[index]) {
    pingCanvases[index] =
      document.createElement(
        "canvas"
      );
  }

  const canvas =
    pingCanvases[index];

  if (
    canvas.width !== width
  ) {
    canvas.width = width;
  }

  if (
    canvas.height !== height
  ) {
    canvas.height = height;
  }

  return canvas;
}


function getEffectFilterList(
  selectedEffects
) {
  if (
    !Array.isArray(
      selectedEffects
    )
  ) {
    return [];
  }

  const list = [];

  for (
    const effectId of selectedEffects
  ) {
    if (
      !effectId ||
      effectId === "Preview"
    ) {
      continue;
    }

    const filter =
      getEffectFilter(
        getEffectPreset(
          effectId
        )
      );

    if (
      filter &&
      filter !== "none"
    ) {
      list.push(filter);
    }
  }

  return list;
}


/* =========================================================
   EFFECT PASSES
========================================================= */

function runEffectPasses(
  baseCanvas,
  selectedEffects
) {
  const filters =
    getEffectFilterList(
      selectedEffects
    );

  if (
    filters.length === 0
  ) {
    return {
      source: baseCanvas,
      lastFilter: "none",
    };
  }

  const chunks = [];

  for (
    let i = 0;
    i < filters.length;
    i += FILTERS_PER_PASS
  ) {
    chunks.push(
      filters
        .slice(
          i,
          i + FILTERS_PER_PASS
        )
        .join(" ")
    );
  }

  let source =
    baseCanvas;

  for (
    let i = 0;
    i < chunks.length - 1;
    i++
  ) {
    const dest =
      getPingCanvas(
        i % 2,
        baseCanvas.width,
        baseCanvas.height
      );

    const ctx =
      dest.getContext(
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

    ctx.filter = "none";

    ctx.clearRect(
      0,
      0,
      dest.width,
      dest.height
    );

    ctx.filter =
      chunks[i];

    try {
      ctx.drawImage(
        source,
        0,
        0,
        dest.width,
        dest.height
      );
    } finally {
      ctx.filter =
        "none";
    }

    source = dest;
  }

  return {
    source,
    lastFilter:
      chunks[
        chunks.length - 1
      ],
  };
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
   ---------------------------------------------------------
   renderScale:

      1
        = original/full resolution

      0.5
        = 50%

      1280 / source max side
        = editor preview resolution
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

  renderScale = 1,
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


  /* -------------------------------------------------------
     SAFE SCALE
  ------------------------------------------------------- */

  const safeRenderScale =
    clamp(
      Number(renderScale) || 1,
      0.05,
      1
    );


  const normalizedRotation =
    (
      (
        Number(rotation) || 0
      ) %
        360 +
      360
    ) % 360;


  const isQuarterTurn =
    normalizedRotation === 90 ||
    normalizedRotation === 270;


  const fullOutputWidth =
    isQuarterTurn
      ? sourceHeight
      : sourceWidth;

  const fullOutputHeight =
    isQuarterTurn
      ? sourceWidth
      : sourceHeight;


  const outputWidth =
    Math.max(
      1,
      Math.round(
        fullOutputWidth *
          safeRenderScale
      )
    );

  const outputHeight =
    Math.max(
      1,
      Math.round(
        fullOutputHeight *
          safeRenderScale
      )
    );


  const canvas =
    getScratchCanvas(
      outputWidth,
      outputHeight
    );


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


  /* -------------------------------------------------------
     ADJUSTMENTS
  ------------------------------------------------------- */

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


  const scaledSourceWidth =
    sourceWidth *
    safeRenderScale;

  const scaledSourceHeight =
    sourceHeight *
    safeRenderScale;


  const scaledOffsetX =
    offsetX *
    safeRenderScale;

  const scaledOffsetY =
    offsetY *
    safeRenderScale;


  try {
    ctx.drawImage(
      image,

      -scaledSourceWidth / 2 +
        scaledOffsetX,

      -scaledSourceHeight / 2 +
        scaledOffsetY,

      scaledSourceWidth,
      scaledSourceHeight
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
   COPY FINAL RESULT
========================================================= */

function copyCanvas(
  sourceCanvas,
  outputCanvas,
  filter = "none"
) {
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


  ctx.filter =
    filter || "none";


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

  /*
   * IMPORTANT:
   *
   * renderScale = 1
   *     Full-resolution render.
   *
   * renderScale < 1
   *     Fast editor preview.
   */
  renderScale = 1,
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

      renderScale,
    });


  /* -------------------------------------------------------
     STEP 2
     Effects
  ------------------------------------------------------- */

  const {
    source: effectSource,
    lastFilter,
  } =
    runEffectPasses(
      baseCanvas,
      selectedEffects
    );


  /* -------------------------------------------------------
     STEP 3
     Copy final result
  ------------------------------------------------------- */

  copyCanvas(
    effectSource,
    outputCanvas,
    lastFilter
  );
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
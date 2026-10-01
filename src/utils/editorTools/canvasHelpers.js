export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getBaseName(file) {
  return file?.name?.replace(/\.[^/.]+$/, "") || "image";
}

export function makePngFile(blob, baseName, suffix) {
  return new File([blob], `${baseName}-${suffix}.png`, {
    type: "image/png",
    lastModified: Date.now(),
  });
}

export function canvasToBlob(sourceCanvas, type = "image/png", quality = 1) {
  return new Promise((resolve, reject) => {
    sourceCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not create image data."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

export function canvasToDataURLSafe(sourceCanvas) {
  try {
    return sourceCanvas?.toDataURL("image/png") || "";
  } catch {
    return "";
  }
}

export function dataURLToCanvas(dataURL) {
  if (!dataURL) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}

export function captureStandardObjectMask(baseCanvas, editedCanvas) {
  if (!baseCanvas || !editedCanvas) return "";
  const mask = document.createElement("canvas");
  mask.width = baseCanvas.width;
  mask.height = baseCanvas.height;
  const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true });
  const editCtx = editedCanvas.getContext("2d", { willReadFrequently: true });
  const maskCtx = mask.getContext("2d", { willReadFrequently: true });
  if (!baseCtx || !editCtx || !maskCtx) return "";
  const base = baseCtx.getImageData(0, 0, baseCanvas.width, baseCanvas.height);
  const edited = editCtx.getImageData(
    0,
    0,
    editedCanvas.width,
    editedCanvas.height
  );
  const out = maskCtx.createImageData(mask.width, mask.height);
  for (let i = 0; i < base.data.length; i += 4) {
    const removed = base.data[i + 3] - edited.data[i + 3] > 18;
    out.data[i] = 255;
    out.data[i + 1] = 0;
    out.data[i + 2] = 0;
    out.data[i + 3] = removed ? 255 : 0;
  }
  maskCtx.putImageData(out, 0, 0);
  return mask.toDataURL("image/png");
}

/* Pointer -> canvas pixel coordinates (unclamped) */
export function getCanvasPoint(canvas, event) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

/* Pointer -> canvas pixel coordinates (clamped inside the canvas) */
export function getClampedCanvasPoint(canvas, event) {
  const point = getCanvasPoint(canvas, event);
  if (!point) return null;
  return {
    x: clamp(point.x, 0, canvas.width),
    y: clamp(point.y, 0, canvas.height),
  };
}


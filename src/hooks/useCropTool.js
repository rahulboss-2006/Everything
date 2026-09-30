import { useRef, useState } from "react";
import { loadImage } from "../utils/imageEditor";
import {
  canvasToBlob,
  clamp,
  getBaseName,
  getCanvasPoint,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";
import { CROP_PRESETS, DEFAULT_CROP_BOX, MIN_CROP_SIZE } from "../components/editor/constants";

export default function useCropTool({
  cropMode,
  objectMode,
  canvasRef,
  previewRef,
  setActiveTool,
  editorControlsDisabled,
  applying,
  setApplying,
  removingBackground,
  imageOffset,
  setImageOffset,
  setZoom,
  workingFile,
  setWorkingFile,
  setImage,
  layers,
  resetLiveEdits,
}) {
  const cropDraggingRef = useRef(false);
  const cropResizeRef = useRef(null);
  const cropStartRef = useRef(null);
  const cropImageDraggingRef = useRef(false);
  const cropImageDragStartRef = useRef(null);
  const cropInitialImageOffsetRef = useRef({ x: 0, y: 0 });

  const [cropBox, setCropBox] = useState(DEFAULT_CROP_BOX);
  const [cropPreset, setCropPreset] = useState("free");
  const [isCtrlDragging, setIsCtrlDragging] = useState(false);
  const [isCropHovering, setIsCropHovering] = useState(false);

  /* ---------- start / cancel ---------- */

  function startCrop() {
    if (editorControlsDisabled) return;

    cropInitialImageOffsetRef.current = { ...imageOffset };

    setCropBox(DEFAULT_CROP_BOX);
    setCropPreset("free");
    setZoom(100);
    setIsCtrlDragging(false);
    setActiveTool("crop");
  }

  function cancelCrop() {
    setImageOffset(cropInitialImageOffsetRef.current);

    cropDraggingRef.current = false;
    cropResizeRef.current = null;
    cropStartRef.current = null;
    cropImageDraggingRef.current = false;
    cropImageDragStartRef.current = null;

    setZoom(100);
    setIsCtrlDragging(false);
    setActiveTool(null);
  }

  function resetCrop() {
    setCropBox(DEFAULT_CROP_BOX);
    setCropPreset("free");
  }

  /* ---------- preset ---------- */

  function handleCropPreset(presetId) {
    const preset = CROP_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    setCropPreset(presetId);

    if (!preset.ratio) return;

    let width = cropBox.width;
    let height = width / preset.ratio;

    if (height > 100) {
      height = 100;
      width = height * preset.ratio;
    }

    setCropBox({
      x: (100 - width) / 2,
      y: (100 - height) / 2,
      width,
      height,
    });
  }

  /* ---------- Ctrl + drag: move the image ---------- */

  function handleCropImagePointerDown(event) {
    if (!cropMode || !event.ctrlKey) return;

    event.preventDefault();
    event.stopPropagation();

    const point = getCanvasPoint(canvasRef.current, event);
    if (!point) return;

    cropImageDraggingRef.current = true;
    setIsCtrlDragging(true);

    cropImageDragStartRef.current = {
      pointerX: point.x,
      pointerY: point.y,
      offsetX: imageOffset.x,
      offsetY: imageOffset.y,
    };

    cropDraggingRef.current = false;
    cropResizeRef.current = null;
    cropStartRef.current = null;

    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {}
  }

  function handleCropImagePointerUp(event) {
    cropImageDraggingRef.current = false;
    cropImageDragStartRef.current = null;
    setIsCtrlDragging(false);

    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {}
  }

  /* ---------- pointer down ---------- */

  function handleCropPointerDown(event) {
    if (!cropMode || applying || removingBackground || objectMode) return;

    if (event.ctrlKey) {
      handleCropImagePointerDown(event);
      return;
    }

    event.preventDefault();

    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    const handle = event.target.closest?.("[data-handle]")?.dataset?.handle;

    const point = { x: event.clientX, y: event.clientY };

    if (handle) {
      cropResizeRef.current = handle;

      cropStartRef.current = {
        pointerX: point.x,
        pointerY: point.y,
        box: { ...cropBox },
      };

      cropDraggingRef.current = false;
    } else if (event.target.closest?.("[data-crop-box]")) {
      cropDraggingRef.current = true;

      cropStartRef.current = {
        pointerX: point.x,
        pointerY: point.y,
        box: { ...cropBox },
      };
    } else {
      return;
    }

    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {}
  }

  /* ---------- pointer move ---------- */

  function handleCropPointerMove(event) {
    if (cropImageDraggingRef.current) {
      const point = getCanvasPoint(canvasRef.current, event);
      if (!point) return;

      const start = cropImageDragStartRef.current;
      if (!start) return;

      setImageOffset({
        x: start.offsetX + point.x - start.pointerX,
        y: start.offsetY + point.y - start.pointerY,
      });

      return;
    }

    if (!cropStartRef.current) return;

    event.preventDefault();

    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    const start = cropStartRef.current;

    const dx = ((event.clientX - start.pointerX) / rect.width) * 100;
    const dy = ((event.clientY - start.pointerY) / rect.height) * 100;

    const original = start.box;

    if (cropResizeRef.current) {
      const handle = cropResizeRef.current;

      let left = original.x;
      let top = original.y;
      let right = original.x + original.width;
      let bottom = original.y + original.height;

      if (handle.includes("w")) {
        left = clamp(original.x + dx, 0, right - MIN_CROP_SIZE);
      }

      if (handle.includes("e")) {
        right = clamp(
          original.x + original.width + dx,
          left + MIN_CROP_SIZE,
          100
        );
      }

      if (handle.includes("n")) {
        top = clamp(original.y + dy, 0, bottom - MIN_CROP_SIZE);
      }

      if (handle.includes("s")) {
        bottom = clamp(
          original.y + original.height + dy,
          top + MIN_CROP_SIZE,
          100
        );
      }

      let width = right - left;
      let height = bottom - top;

      const preset = CROP_PRESETS.find((item) => item.id === cropPreset);

      if (preset?.ratio) {
        const ratio = preset.ratio;

        if (handle.includes("e") || handle.includes("w")) {
          height = width / ratio;
        } else {
          width = height * ratio;
        }

        width = Math.min(width, 100);
        height = Math.min(height, 100);

        if (handle.includes("w")) {
          left = original.x + original.width - width;
        }

        if (handle.includes("n")) {
          top = original.y + original.height - height;
        }

        if (handle.includes("e") && !handle.includes("w")) {
          left = original.x;
        }

        if (handle.includes("s") && !handle.includes("n")) {
          top = original.y;
        }
      }

      setCropBox({
        x: clamp(left, 0, 100 - width),
        y: clamp(top, 0, 100 - height),
        width: clamp(width, MIN_CROP_SIZE, 100),
        height: clamp(height, MIN_CROP_SIZE, 100),
      });

      return;
    }

    if (cropDraggingRef.current) {
      const x = clamp(original.x + dx, 0, 100 - original.width);
      const y = clamp(original.y + dy, 0, 100 - original.height);

      setCropBox({ ...original, x, y });
    }
  }

  /* ---------- pointer up ---------- */

  function handleCropPointerUp(event) {
    handleCropImagePointerUp(event);

    cropDraggingRef.current = false;
    cropResizeRef.current = null;
    cropStartRef.current = null;

    setIsCtrlDragging(false);
  }

  /* ---------- apply ---------- */

  async function applyCrop() {
    const canvas = canvasRef.current;
    const preview = previewRef.current;

    if (!canvas || !preview || applying) return;

    try {
      setApplying(true);

      const sourceWidth = canvas.width;
      const sourceHeight = canvas.height;

      const cropX = Math.round((cropBox.x / 100) * sourceWidth);
      const cropY = Math.round((cropBox.y / 100) * sourceHeight);

      const cropWidth = Math.max(
        1,
        Math.round((cropBox.width / 100) * sourceWidth)
      );
      const cropHeight = Math.max(
        1,
        Math.round((cropBox.height / 100) * sourceHeight)
      );

      const safeWidth = Math.max(1, Math.min(cropWidth, sourceWidth - cropX));
      const safeHeight = Math.max(
        1,
        Math.min(cropHeight, sourceHeight - cropY)
      );

      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = safeWidth;
      outputCanvas.height = safeHeight;

      const ctx = outputCanvas.getContext("2d");

      if (!ctx) throw new Error("Could not create crop canvas.");

      ctx.drawImage(
        canvas,
        cropX,
        cropY,
        safeWidth,
        safeHeight,
        0,
        0,
        safeWidth,
        safeHeight
      );

      const blob = await canvasToBlob(outputCanvas, "image/png", 1);

      const newFile = makePngFile(blob, getBaseName(workingFile), "cropped");

      const newImage = await loadImage(newFile);

      if (!newImage) throw new Error("Could not load cropped image.");

      const summary = `Cropped to ${safeWidth} × ${safeHeight}px`;

      layers.addToolLayer({
        type: "crop",
        name: "Crop",
        detail: `${safeWidth} × ${safeHeight}px`,
        beforeFile: workingFile,
        summary,
      });

      setWorkingFile(newFile);
      setImage(newImage);

      resetLiveEdits();

      layers.addAppliedAction(summary);

      setActiveTool(null);
    } catch (error) {
      console.error("Crop failed:", error);
      alert(error?.message || "Crop failed.");
    } finally {
      setApplying(false);
    }
  }

  return {
    cropBox,
    cropPreset,
    isCtrlDragging,
    isCropHovering,
    setIsCropHovering,
    startCrop,
    cancelCrop,
    resetCrop,
    handleCropPreset,
    handleCropPointerDown,
    handleCropPointerMove,
    handleCropPointerUp,
    applyCrop,
  };
}

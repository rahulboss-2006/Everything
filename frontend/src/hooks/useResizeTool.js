import { useRef, useState } from "react";
import { loadImage } from "../utils/imageEditor";
import {
  canvasToBlob,
  clamp,
  getBaseName,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";

export default function useResizeTool({
  canvasRef,
  previewRef,
  zoomAreaRef,
  image,
  workingFile,
  setWorkingFile,
  setImage,
  editorControlsDisabled,
  applying,
  setApplying,
  setShowEffects,
  setZoom,
  setImageOffset,
  setActiveTool,
  resetLiveEdits,
  layers,
}) {
  const resizePreviewScaleRef = useRef(1);
  const resizeBaseStageRef = useRef({ width: 0, height: 0 });
  const resizeRndRatioRef = useRef(1);

  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [resizeLockRatio, setResizeLockRatio] = useState(true);
  const [resizeOriginalRatio, setResizeOriginalRatio] = useState(1);
  const [resizeUnit, setResizeUnit] = useState("pixels");
  const [resizeResolution, setResizeResolution] = useState(96);
  const [resizeResample, setResizeResample] = useState(true);
  const [resizeOriginalWidth, setResizeOriginalWidth] = useState(0);
  const [resizeOriginalHeight, setResizeOriginalHeight] = useState(0);
  const [resizeStageSize, setResizeStageSize] = useState({
    width: 0,
    height: 0,
  });
  const [resizeFrame, setResizeFrame] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [resizePreviewSrc, setResizePreviewSrc] = useState("");
  const [resizeActiveDirection, setResizeActiveDirection] = useState(null);

  // Called whenever a new working image is loaded.
  function setOriginalSize(width, height) {
    setResizeWidth(width);
    setResizeHeight(height);
    setResizeOriginalWidth(width);
    setResizeOriginalHeight(height);
    setResizeOriginalRatio(width / height);
  }

  /* ---------- unit helpers ---------- */

  function getPixelValue(value, unit, dimension) {
    const original =
      dimension === "width" ? resizeOriginalWidth : resizeOriginalHeight;

    const numeric = Number(value);

    if (!Number.isFinite(numeric)) return 1;

    if (unit === "percent") return (original * numeric) / 100;
    if (unit === "inches") return numeric * resizeResolution;
    if (unit === "cm") return (numeric * resizeResolution) / 2.54;

    return numeric;
  }

  function getDisplayValue(value, unit, dimension) {
    if (!Number.isFinite(Number(value))) return "";

    const original =
      dimension === "width" ? resizeOriginalWidth : resizeOriginalHeight;

    if (unit === "percent") {
      if (!original) return "";
      return Number(((value / original) * 100).toFixed(2));
    }

    if (unit === "inches") {
      return Number((value / resizeResolution).toFixed(2));
    }

    if (unit === "cm") {
      return Number(((value / resizeResolution) * 2.54).toFixed(2));
    }

    return Math.round(value);
  }

  function updateResizeDimensions(pixelWidth, pixelHeight) {
    const width = Math.max(1, Math.round(Number(pixelWidth)));
    const height = Math.max(1, Math.round(Number(pixelHeight)));

    setResizeWidth(width);
    setResizeHeight(height);

    const stageWidth =
      resizeBaseStageRef.current.width || resizeStageSize.width;

    const stageHeight =
      resizeBaseStageRef.current.height || resizeStageSize.height;

    if (stageWidth <= 0 || stageHeight <= 0) return;

    const scale = Math.max(
      0.01,
      Math.min(1, stageWidth / width, stageHeight / height)
    );

    resizePreviewScaleRef.current = scale;

    const visualWidth = width * scale;
    const visualHeight = height * scale;

    setResizeFrame({
      left: Math.max(0, (stageWidth - visualWidth) / 2),
      top: Math.max(0, (stageHeight - visualHeight) / 2),
      width: visualWidth,
      height: visualHeight,
    });
  }

  /* ---------- start ---------- */

  function startResize() {
    if (editorControlsDisabled) return;

    const canvas = canvasRef.current;
    const stage = zoomAreaRef.current || previewRef.current;

    if (!canvas || !stage) return;

    setShowEffects(false);
    setZoom(100);
    setImageOffset({ x: 0, y: 0 });

    const sourceWidth =
      canvas.width || image?.naturalWidth || image?.width || 1;

    const sourceHeight =
      canvas.height || image?.naturalHeight || image?.height || 1;

    const stageRect = stage.getBoundingClientRect();

    const stageWidth = Math.max(120, stageRect.width);
    const stageHeight = Math.max(120, stageRect.height);

    resizeBaseStageRef.current = { width: stageWidth, height: stageHeight };

    setResizeStageSize({ width: stageWidth, height: stageHeight });

    setResizeOriginalWidth(sourceWidth);
    setResizeOriginalHeight(sourceHeight);
    setResizeOriginalRatio(sourceWidth / sourceHeight);

    resizeRndRatioRef.current = Math.max(0.01, sourceWidth / sourceHeight);

    setResizeWidth(sourceWidth);
    setResizeHeight(sourceHeight);

    setResizeUnit("pixels");
    setResizeResolution(96);
    setResizeLockRatio(true);
    setResizeResample(true);

    try {
      setResizePreviewSrc(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error("Resize preview failed:", error);
      return;
    }

    const scale = Math.max(
      0.01,
      Math.min(1, stageWidth / sourceWidth, stageHeight / sourceHeight)
    );

    resizePreviewScaleRef.current = scale;

    const visualWidth = sourceWidth * scale;
    const visualHeight = sourceHeight * scale;

    setResizeFrame({
      left: (stageWidth - visualWidth) / 2,
      top: (stageHeight - visualHeight) / 2,
      width: visualWidth,
      height: visualHeight,
    });

    setActiveTool("resize");
  }

  /* ---------- inputs ---------- */

  function handleResizeWidthChange(event) {
    const value = Number(event.target.value);

    if (!Number.isFinite(value) || value <= 0) return;

    const pixelWidth = getPixelValue(value, resizeUnit, "width");

    updateResizeDimensions(pixelWidth, resizeHeight);
  }

  function handleResizeHeightChange(event) {
    const value = Number(event.target.value);

    if (!Number.isFinite(value) || value <= 0) return;

    const pixelHeight = getPixelValue(value, resizeUnit, "height");

    updateResizeDimensions(resizeWidth, pixelHeight);
  }

  function handleResizeUnitChange(event) {
    setResizeUnit(event.target.value);
  }

  function handleResolutionChange(event) {
    const value = Number(event.target.value);

    if (!Number.isFinite(value)) return;

    setResizeResolution(clamp(value, 1, 2400));
  }

  function resetResizeDimensions() {
    if (!resizeOriginalWidth || !resizeOriginalHeight) return;

    resizeRndRatioRef.current = Math.max(0.01, resizeOriginalRatio);

    updateResizeDimensions(resizeOriginalWidth, resizeOriginalHeight);

    setResizeLockRatio(true);
  }

  function clearResizeState() {
    setResizeFrame({ left: 0, top: 0, width: 0, height: 0 });
    setResizePreviewSrc("");
    setResizeStageSize({ width: 0, height: 0 });

    resizeBaseStageRef.current = { width: 0, height: 0 };
    resizePreviewScaleRef.current = 1;
    resizeRndRatioRef.current = 1;
  }

  function cancelResize() {
    clearResizeState();
    setActiveTool(null);
  }

  /* ---------- apply ---------- */

  async function applyResize() {
    const canvas = canvasRef.current;

    if (!canvas || resizeWidth < 1 || resizeHeight < 1 || applying) return;

    try {
      setApplying(true);

      const outputWidth = Math.max(1, Math.round(resizeWidth));
      const outputHeight = Math.max(1, Math.round(resizeHeight));

      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;

      const ctx = outputCanvas.getContext("2d");

      if (!ctx) throw new Error("Could not create resize canvas.");

      ctx.clearRect(0, 0, outputWidth, outputHeight);

      ctx.imageSmoothingEnabled = resizeResample;
      ctx.imageSmoothingQuality = resizeResample ? "high" : "low";

      ctx.drawImage(
        canvas,
        0,
        0,
        canvas.width,
        canvas.height,
        0,
        0,
        outputWidth,
        outputHeight
      );

      const blob = await canvasToBlob(outputCanvas, "image/png", 1);

      const newFile = makePngFile(blob, getBaseName(workingFile), "resized");

      const newImage = await loadImage(newFile);

      if (!newImage) throw new Error("Could not load resized image.");

      const summary = `Resized to ${outputWidth.toLocaleString()} × ${outputHeight.toLocaleString()} px`;

      layers.addToolLayer({
        type: "resize",
        name: "Resize",
        detail: `${outputWidth.toLocaleString()} × ${outputHeight.toLocaleString()} px`,
        beforeFile: workingFile,
        summary,
      });

      setWorkingFile(newFile);
      setImage(newImage);

      resetLiveEdits();

      layers.addAppliedAction(summary);

      clearResizeState();

      setActiveTool(null);
    } catch (error) {
      console.error("Resize failed:", error);
      alert(error?.message || "Resize failed.");
    } finally {
      setApplying(false);
    }
  }

  return {
    resizeWidth,
    resizeHeight,
    resizeUnit,
    resizeResolution,
    resizeResample,
    resizeLockRatio,
    resizeStageSize,
    resizeFrame,
    resizePreviewSrc,
    resizeActiveDirection,
    resizeRndRatioRef,
    resizePreviewScaleRef,

    setResizeLockRatio,
    setResizeResample,
    setResizeFrame,
    setResizeWidth,
    setResizeHeight,
    setResizeActiveDirection,

    setOriginalSize,
    getDisplayValue,
    startResize,
    handleResizeWidthChange,
    handleResizeHeightChange,
    handleResizeUnitChange,
    handleResolutionChange,
    resetResizeDimensions,
    clearResizeState,
    cancelResize,
    applyResize,
  };
}

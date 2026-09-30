import { useRef, useState } from "react";
import { loadImage } from "../utils/imageEditor";
import {
  canvasToBlob,
  canvasToDataURLSafe,
  captureStandardObjectMask,
  dataURLToCanvas,
  getBaseName,
  getClampedCanvasPoint,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";
import {
  buildAIInpaintMaskCanvas,
  runLocalAIObjectRemoval,
} from "../utils/editorTools/miganInpaint";

const DEFAULT_AI_LABEL = "Preparing AI Object Remove...";

/* Standard object remove (eraser) + AI object remove (MI-GAN). */
export default function useObjectRemove({
  objectMode,
  aiObjectMode,
  canvasRef,
  setActiveTool,
  workingFile,
  setWorkingFile,
  setImage,
  removingBackground,
  objectApplying,
  setObjectApplying,
  resetImageDrag,
  resetLiveEdits,
  setShowEffects,
  setShowLayers,
  layers,
}) {
  const objectDrawingRef = useRef(false);
  const objectBaseCanvasRef = useRef(null);
  const objectLastPointRef = useRef(null);
  const aiObjectMaskCanvasRef = useRef(null);
  const aiObjectOverlayCanvasRef = useRef(null);

  const [objectBrushSize, setObjectBrushSize] = useState(40);
  const [aiModelLoading, setAiModelLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProgressLabel, setAiProgressLabel] = useState(DEFAULT_AI_LABEL);
  const [objectRemovalMode, setObjectRemovalMode] = useState("standard");

  /* ---------- session helpers ---------- */

  function snapshotObjectBaseCanvas() {
    const canvas = canvasRef.current;

    if (canvas) {
      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = canvas.width;
      baseCanvas.height = canvas.height;

      const baseCtx = baseCanvas.getContext("2d");

      if (baseCtx) {
        baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
        baseCtx.drawImage(canvas, 0, 0);
        objectBaseCanvasRef.current = baseCanvas;
      }
    }
  }

  // Used by the global Reset.
  function resetObjectState() {
    objectBaseCanvasRef.current = null;
    objectDrawingRef.current = false;
    objectLastPointRef.current = null;
    aiObjectMaskCanvasRef.current = null;
    aiObjectOverlayCanvasRef.current = null;
    setObjectRemovalMode("standard");
  }

  function handleObjectRemove() {
    if (!workingFile || removingBackground || objectApplying) return;

    setShowEffects(false);
    setObjectRemovalMode("standard");

    resetImageDrag();

    snapshotObjectBaseCanvas();

    objectDrawingRef.current = false;
    objectLastPointRef.current = null;

    setActiveTool("object");
  }

  function handleAIObjectRemove() {
    if (!workingFile || removingBackground || objectApplying) return;

    setShowEffects(false);
    setObjectRemovalMode("ai");

    resetImageDrag();

    snapshotObjectBaseCanvas();

    objectDrawingRef.current = false;
    objectLastPointRef.current = null;
    ensureAIObjectMaskCanvas();
    clearAIObjectMask();
    setActiveTool("ai-object");
  }

  function cancelObjectRemove() {
    const canvas = canvasRef.current;
    const baseCanvas = objectBaseCanvasRef.current;

    if (canvas && baseCanvas) {
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseCanvas, 0, 0);
      }
    }

    objectDrawingRef.current = false;
    objectLastPointRef.current = null;
    objectBaseCanvasRef.current = null;

    setObjectRemovalMode("standard");
    setActiveTool(null);
  }

  /* ---------- standard eraser ---------- */

  function eraseObjectDot(x, y) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = canvas.width / 1000;
    const radius = Math.max(5, (objectBrushSize * scale) / 2);

    const gradient = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);

    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.65, "rgba(0,0,0,0.92)");
    gradient.addColorStop(0.88, "rgba(0,0,0,0.45)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function eraseObjectLine(from, to) {
    if (!from || !to) return;

    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const step = Math.max(2, objectBrushSize / 4);
    const count = Math.max(1, Math.ceil(distance / step));

    for (let i = 0; i <= count; i += 1) {
      const progress = i / count;
      eraseObjectDot(
        from.x + (to.x - from.x) * progress,
        from.y + (to.y - from.y) * progress
      );
    }
  }

  /* ---------- AI brush (mask painting) ---------- */

  function ensureAIObjectMaskCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    let mask = aiObjectMaskCanvasRef.current;
    if (!mask || mask.width !== canvas.width || mask.height !== canvas.height) {
      mask = document.createElement("canvas");
      mask.width = canvas.width;
      mask.height = canvas.height;
      aiObjectMaskCanvasRef.current = mask;
    }

    const overlay = aiObjectOverlayCanvasRef.current;
    if (overlay) {
      if (overlay.width !== canvas.width) overlay.width = canvas.width;
      if (overlay.height !== canvas.height) overlay.height = canvas.height;
    }

    return mask;
  }

  function clearAIObjectMask() {
    const mask = aiObjectMaskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, mask.width, mask.height);

    const overlay = aiObjectOverlayCanvasRef.current;
    const overlayCtx = overlay?.getContext("2d");
    if (overlay && overlayCtx) {
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    }
  }

  function paintAIObjectDot(x, y) {
    const mask = ensureAIObjectMaskCanvas();
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;
    const radius = Math.max(5, objectBrushSize / 2);
    const paint = (targetCtx) => {
      targetCtx.save();
      targetCtx.fillStyle = "rgba(255, 0, 0, 0.03)";
      targetCtx.beginPath();
      targetCtx.arc(x, y, radius, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();
    };

    paint(ctx);

    const overlay = aiObjectOverlayCanvasRef.current;
    const overlayCtx = overlay?.getContext("2d");
    if (overlay && overlayCtx) paint(overlayCtx);
  }

  function paintAIObjectLine(from, to) {
    if (!from || !to) return;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const step = Math.max(2, objectBrushSize / 4);
    const count = Math.max(1, Math.ceil(distance / step));
    for (let i = 0; i <= count; i += 1) {
      const progress = i / count;
      paintAIObjectDot(
        from.x + (to.x - from.x) * progress,
        from.y + (to.y - from.y) * progress
      );
    }
  }

  /* ---------- pointer handlers ---------- */

  function handleObjectPointerDown(event) {
    if (!objectMode || removingBackground || objectApplying) return;

    event.preventDefault();

    const point = getClampedCanvasPoint(canvasRef.current, event);
    if (!point) return;

    objectDrawingRef.current = true;
    objectLastPointRef.current = point;

    if (aiObjectMode) {
      paintAIObjectDot(point.x, point.y);
    } else {
      eraseObjectDot(point.x, point.y);
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleObjectPointerMove(event) {
    if (!objectDrawingRef.current || !objectMode) return;

    event.preventDefault();

    const point = getClampedCanvasPoint(canvasRef.current, event);
    if (!point) return;

    const previous = objectLastPointRef.current;

    if (previous) {
      if (aiObjectMode) {
        paintAIObjectLine(previous, point);
      } else {
        eraseObjectLine(previous, point);
      }
    } else if (aiObjectMode) {
      paintAIObjectDot(point.x, point.y);
    } else {
      eraseObjectDot(point.x, point.y);
    }

    objectLastPointRef.current = point;
  }

  function handleObjectPointerUp(event) {
    objectDrawingRef.current = false;
    objectLastPointRef.current = null;

    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {}
  }

  /* ---------- edit an existing object layer ---------- */

  async function editObjectLayer(layerId) {
    const layer = layers.objectLayersRef.current.find(
      (item) => item.id === layerId
    );
    if (!layer || !layer.beforeFile) return;

    try {
      setShowLayers(false);
      setShowEffects(false);
      const restoredImage = await loadImage(layer.beforeFile);
      if (!restoredImage) throw new Error("Could not restore object layer.");

      setWorkingFile(layer.beforeFile);
      setImage(restoredImage);
      resetLiveEdits();

      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = restoredImage.naturalWidth || restoredImage.width;
      baseCanvas.height = restoredImage.naturalHeight || restoredImage.height;
      const baseCtx = baseCanvas.getContext("2d");
      if (baseCtx) baseCtx.drawImage(restoredImage, 0, 0);
      objectBaseCanvasRef.current = baseCanvas;

      if (layer.type === "ai-object") {
        const mask = await dataURLToCanvas(layer.maskDataURL);
        const target = document.createElement("canvas");
        target.width = baseCanvas.width;
        target.height = baseCanvas.height;
        const targetCtx = target.getContext("2d");
        if (targetCtx && mask) {
          targetCtx.drawImage(mask, 0, 0, target.width, target.height);
        }
        aiObjectMaskCanvasRef.current = target;

        const overlay = document.createElement("canvas");
        overlay.width = baseCanvas.width;
        overlay.height = baseCanvas.height;
        const overlayCtx = overlay.getContext("2d");
        if (overlayCtx && mask) {
          overlayCtx.drawImage(mask, 0, 0, overlay.width, overlay.height);
        }
        aiObjectOverlayCanvasRef.current = overlay;

        setObjectRemovalMode("ai");
        setActiveTool("ai-object");
      } else {
        const mask = await dataURLToCanvas(layer.maskDataURL);
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = baseCanvas.width;
          canvas.height = baseCanvas.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(baseCanvas, 0, 0);
            if (mask) {
              ctx.save();
              ctx.globalCompositeOperation = "destination-out";
              ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
              ctx.restore();
            }
          }
        }
        setObjectRemovalMode("standard");
        setActiveTool("object");
      }

      // Remove this operation AND every later object/tool layer (they are stale).
      layers.pruneLayersFrom(layer.seq || 0);
      layers.rebuildAppliedEdits();
    } catch (error) {
      console.error("Object layer edit failed:", error);
      alert(error?.message || "Could not edit this object removal layer.");
    }
  }

  /* ---------- apply: AI ---------- */

  async function applyAIObjectRemove() {
    const canvas = canvasRef.current;
    const baseCanvas = objectBaseCanvasRef.current;

    if (!canvas || !baseCanvas || objectApplying) return;

    try {
      setObjectApplying(true);
      setAiModelLoading(true);
      setAiProgress(1);
      setAiProgressLabel(DEFAULT_AI_LABEL);

      const selectionCanvas = aiObjectMaskCanvasRef.current;
      if (!selectionCanvas) {
        throw new Error("Brush over the object before pressing Apply.");
      }
      const selectionCtx = selectionCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!selectionCtx) throw new Error("Could not read the object selection.");
      const selectionData = selectionCtx.getImageData(
        0,
        0,
        selectionCanvas.width,
        selectionCanvas.height
      );
      let selectedPixels = 0;
      for (let i = 3; i < selectionData.data.length; i += 4) {
        if (selectionData.data[i] > 4) {
          selectedPixels += 1;
          if (selectedPixels > 20) break;
        }
      }
      if (selectedPixels === 0) {
        throw new Error("Brush over the object before pressing Apply.");
      }

      const maskCanvas = buildAIInpaintMaskCanvas(
        baseCanvas,
        canvas,
        selectionCanvas,
        objectBrushSize
      );

      const aiCanvas = await runLocalAIObjectRemoval(
        baseCanvas,
        maskCanvas,
        (progress, label) => {
          setAiProgress(progress);
          setAiProgressLabel(label);
        }
      );

      const resultBlob = await canvasToBlob(aiCanvas, "image/png", 1);

      const newFile = makePngFile(
        resultBlob,
        getBaseName(workingFile),
        "ai-object-removed"
      );

      const newImage = await loadImage(newFile);

      if (!newImage) throw new Error("Could not load the AI-generated image.");

      const beforeFile = workingFile;
      const maskDataURL = canvasToDataURLSafe(selectionCanvas);

      // AI object removal lives in objectLayers (editable), not toolLayers.
      layers.addObjectLayer({
        type: "ai-object",
        name: "AI Object Remove",
        summary: "AI object removed",
        beforeFile,
        maskDataURL,
      });

      setWorkingFile(newFile);
      setImage(newImage);

      resetLiveEdits();

      layers.addAppliedAction("AI object removed");

      objectDrawingRef.current = false;
      objectLastPointRef.current = null;
      objectBaseCanvasRef.current = null;
      clearAIObjectMask();
      setObjectRemovalMode("standard");
      setActiveTool(null);
    } catch (error) {
      console.error("AI object removal failed:", error);

      alert(
        error?.message ||
          "AI object removal failed. Make sure the browser supports WebAssembly/WebGPU and the model can be downloaded."
      );
    } finally {
      setAiModelLoading(false);
      setAiProgress(0);
      setAiProgressLabel(DEFAULT_AI_LABEL);
      setObjectApplying(false);
    }
  }

  /* ---------- apply: standard / router ---------- */

  async function applyObjectRemove() {
    if (objectRemovalMode === "ai") {
      await applyAIObjectRemove();
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas || objectApplying) return;

    try {
      setObjectApplying(true);

      const blob = await canvasToBlob(canvas, "image/png", 1);

      const newFile = makePngFile(
        blob,
        getBaseName(workingFile),
        "object-removed"
      );

      const newImage = await loadImage(newFile);

      if (!newImage) throw new Error("Could not load object-removed image.");

      const beforeFile = workingFile;
      const maskDataURL = captureStandardObjectMask(
        objectBaseCanvasRef.current,
        canvas
      );

      layers.addObjectLayer({
        type: "object",
        name: "Object Remove",
        summary: "Object removed",
        beforeFile,
        maskDataURL,
      });

      setWorkingFile(newFile);
      setImage(newImage);

      resetLiveEdits();

      layers.addAppliedAction("Object removed");

      objectDrawingRef.current = false;
      objectLastPointRef.current = null;
      objectBaseCanvasRef.current = null;
      setObjectRemovalMode("standard");
      setActiveTool(null);
    } catch (error) {
      console.error("Object removal failed:", error);
      alert(error?.message || "Object removal failed.");
    } finally {
      setObjectApplying(false);
    }
  }

  return {
    // refs shared with other hooks / canvas
    objectDrawingRef,
    objectBaseCanvasRef,
    aiObjectOverlayCanvasRef,

    // state
    objectBrushSize,
    setObjectBrushSize,
    aiModelLoading,
    aiProgress,
    aiProgressLabel,

    // actions
    handleObjectRemove,
    handleAIObjectRemove,
    cancelObjectRemove,
    applyObjectRemove,
    editObjectLayer,
    resetObjectState,

    // pointer handlers
    handleObjectPointerDown,
    handleObjectPointerMove,
    handleObjectPointerUp,
  };
}

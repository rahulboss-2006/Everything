import { useEffect, useRef, useState } from "react";

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

/*
 * MI-GAN is loaded lazily.
 *
 * This keeps the editor initial bundle small while allowing the
 * model/session to start loading as soon as AI Object Remove opens.
 */
let miganModulePromise = null;

async function getMiGanModule() {
  if (!miganModulePromise) {
    miganModulePromise = import(
      "../utils/editorTools/miganInpaint"
    ).catch((error) => {
      miganModulePromise = null;
      throw error;
    });
  }

  return miganModulePromise;
}

const DEFAULT_AI_LABEL =
  "Preparing AI Object Remove...";

/*
 * Standard object remove + local MI-GAN AI object remove.
 *
 * IMPORTANT:
 * This hook intentionally preserves the API expected by ImageEditor.jsx.
 */
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
  /*
   * ---------------------------------------------------------
   * REFS
   * ---------------------------------------------------------
   */

  const objectDrawingRef =
    useRef(false);

  const objectBaseCanvasRef =
    useRef(null);

  const objectLastPointRef =
    useRef(null);

  const aiObjectMaskCanvasRef =
    useRef(null);

  const aiObjectOverlayCanvasRef =
    useRef(null);

  const lastAIResultFileRef =
    useRef(null);

  /*
   * ---------------------------------------------------------
   * STATE
   * ---------------------------------------------------------
   */

  const [
    objectBrushSize,
    setObjectBrushSize,
  ] = useState(40);

  const [
    aiModelLoading,
    setAiModelLoading,
  ] = useState(false);

  const [
    aiProgress,
    setAiProgress,
  ] = useState(0);

  const [
    aiProgressLabel,
    setAiProgressLabel,
  ] = useState(
    DEFAULT_AI_LABEL
  );

  const [
    objectRemovalMode,
    setObjectRemovalMode,
  ] = useState("standard");

  const [
    aiObjectRemoved,
    setAiObjectRemoved,
  ] = useState(false);

  /*
   * ---------------------------------------------------------
   * KEEP SUCCESS STATE
   * ---------------------------------------------------------
   */

  useEffect(() => {
  if (
    lastAIResultFileRef.current &&
    workingFile !==
      lastAIResultFileRef.current
  ) {
    lastAIResultFileRef.current = null;
    setAiObjectRemoved(false);
  }

  /*
   * PRELOAD MI-GAN immediately when the image
   * changes.
   *
   * This is intentionally background work.
   * The editor UI does not wait for it.
   */
  if (!workingFile) {
    return;
  }

  let cancelled = false;

  const warmup = async () => {
    try {
      const module =
        await getMiGanModule();

      if (
        cancelled ||
        !module ||
        typeof module.getMiGanSession !==
          "function"
      ) {
        return;
      }

      /*
       * Do not show model-loading UI just because
       * background warmup is happening.
       *
       * The user should continue editing normally.
       */
      await module.getMiGanSession();
    } catch (error) {
      if (!cancelled) {
        console.warn(
          "MI-GAN background warm-up failed. It will retry when AI Object Remove is used.",
          error
        );
      }
    }
  };

  /*
   * Let the current image render first.
   * Then start AI preparation.
   */
  const timer =
    window.setTimeout(
      warmup,
      80
    );

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}, [workingFile]);

  /*
   * ---------------------------------------------------------
   * SNAPSHOT BASE IMAGE
   * ---------------------------------------------------------
   */

  function snapshotObjectBaseCanvas() {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const baseCanvas =
      document.createElement(
        "canvas"
      );

    baseCanvas.width =
      canvas.width;

    baseCanvas.height =
      canvas.height;

    const baseCtx =
      baseCanvas.getContext("2d");

    if (!baseCtx) return;

    baseCtx.clearRect(
      0,
      0,
      baseCanvas.width,
      baseCanvas.height
    );

    baseCtx.drawImage(
      canvas,
      0,
      0
    );

    objectBaseCanvasRef.current =
      baseCanvas;
  }

  /*
   * ---------------------------------------------------------
   * RESET OBJECT STATE
   * ---------------------------------------------------------
   */

  function resetObjectState() {
    objectBaseCanvasRef.current =
      null;

    objectDrawingRef.current =
      false;

    objectLastPointRef.current =
      null;

    aiObjectMaskCanvasRef.current =
      null;

    aiObjectOverlayCanvasRef.current =
      null;

    setObjectRemovalMode(
      "standard"
    );

    lastAIResultFileRef.current =
      null;

    setAiObjectRemoved(false);

    setAiProgress(0);

    setAiProgressLabel(
      DEFAULT_AI_LABEL
    );

    setAiModelLoading(false);
  }

  /*
   * ---------------------------------------------------------
   * STANDARD OBJECT REMOVE OPEN
   * ---------------------------------------------------------
   */

  function handleObjectRemove() {
    if (
      !workingFile ||
      removingBackground ||
      objectApplying
    ) {
      return;
    }

    setShowEffects(false);

    setObjectRemovalMode(
      "standard"
    );

    resetImageDrag();

    snapshotObjectBaseCanvas();

    objectDrawingRef.current =
      false;

    objectLastPointRef.current =
      null;

    setActiveTool("object");
  }

  /*
   * ---------------------------------------------------------
   * AI OBJECT REMOVE OPEN
   * ---------------------------------------------------------
   */

  function handleAIObjectRemove() {
    if (
      !workingFile ||
      removingBackground ||
      objectApplying ||
      aiObjectRemoved
    ) {
      return;
    }

    setShowEffects(false);

    setObjectRemovalMode("ai");

    resetImageDrag();

    snapshotObjectBaseCanvas();

    objectDrawingRef.current =
      false;

    objectLastPointRef.current =
      null;

    ensureAIObjectMaskCanvas();

    clearAIObjectMask();

    setActiveTool("ai-object");

    /*
     * Start MI-GAN loading immediately.
     *
     * We intentionally do not directly import getMiGanSession.
     * The current MI-GAN module is lazy-loaded first.
     */
    void preloadMiGan();
  }

  /*
   * ---------------------------------------------------------
   * MI-GAN PRELOAD
   * ---------------------------------------------------------
   */

  async function preloadMiGan() {
    try {
      setAiModelLoading(true);

      setAiProgress(1);

      setAiProgressLabel(
        "Loading AI model..."
      );

      const module =
        await getMiGanModule();

      if (
        !module ||
        typeof module.getMiGanSession !==
          "function"
      ) {
        throw new Error(
          "MI-GAN session loader is unavailable."
        );
      }

      await module.getMiGanSession(
        (progress, message) => {
          if (
            Number.isFinite(
              Number(progress)
            )
          ) {
            setAiProgress(
              Math.max(
                1,
                Math.min(
                  99,
                  Number(progress)
                )
              )
            );
          }

          if (message) {
            setAiProgressLabel(
              message
            );
          }
        }
      );

      setAiProgress(
        100
      );

      setAiProgressLabel(
        "AI model ready."
      );
    } catch (error) {
      console.warn(
        "AI Object Remove model preload failed; it will retry on Apply.",
        error
      );

      setAiProgress(0);

      setAiProgressLabel(
        DEFAULT_AI_LABEL
      );
    } finally {
      setAiModelLoading(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * CANCEL
   * ---------------------------------------------------------
   */

  function cancelObjectRemove() {
    const canvas =
      canvasRef.current;

    const baseCanvas =
      objectBaseCanvasRef.current;

    if (
      canvas &&
      baseCanvas
    ) {
      const ctx =
        canvas.getContext("2d");

      if (ctx) {
        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.drawImage(
          baseCanvas,
          0,
          0
        );
      }
    }

    objectDrawingRef.current =
      false;

    objectLastPointRef.current =
      null;

    objectBaseCanvasRef.current =
      null;

    clearAIObjectMask();

    setObjectRemovalMode(
      "standard"
    );

    setActiveTool(null);
  }

  /*
   * ---------------------------------------------------------
   * STANDARD ERASER
   * ---------------------------------------------------------
   */

  function eraseObjectDot(
    x,
    y
  ) {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const scale =
      canvas.width / 1000;

    const radius =
      Math.max(
        5,
        (objectBrushSize * scale) /
          2
      );

    const gradient =
      ctx.createRadialGradient(
        x,
        y,
        radius * 0.1,
        x,
        y,
        radius
      );

    gradient.addColorStop(
      0,
      "rgba(0,0,0,1)"
    );

    gradient.addColorStop(
      0.65,
      "rgba(0,0,0,0.92)"
    );

    gradient.addColorStop(
      0.88,
      "rgba(0,0,0,0.45)"
    );

    gradient.addColorStop(
      1,
      "rgba(0,0,0,0)"
    );

    ctx.save();

    ctx.globalCompositeOperation =
      "destination-out";

    ctx.fillStyle =
      gradient;

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  function eraseObjectLine(
    from,
    to
  ) {
    if (!from || !to) return;

    const distance =
      Math.hypot(
        to.x - from.x,
        to.y - from.y
      );

    const step =
      Math.max(
        2,
        objectBrushSize / 4
      );

    const count =
      Math.max(
        1,
        Math.ceil(
          distance / step
        )
      );

    for (
      let i = 0;
      i <= count;
      i += 1
    ) {
      const progress =
        i / count;

      eraseObjectDot(
        from.x +
          (to.x - from.x) *
            progress,
        from.y +
          (to.y - from.y) *
            progress
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * AI MASK
   * ---------------------------------------------------------
   */

  function ensureAIObjectMaskCanvas() {
    const canvas =
      canvasRef.current;

    if (!canvas) return null;

    let mask =
      aiObjectMaskCanvasRef.current;

    if (
      !mask ||
      mask.width !==
        canvas.width ||
      mask.height !==
        canvas.height
    ) {
      mask =
        document.createElement(
          "canvas"
        );

      mask.width =
        canvas.width;

      mask.height =
        canvas.height;

      aiObjectMaskCanvasRef.current =
        mask;
    }

    const overlay =
      aiObjectOverlayCanvasRef.current;

    if (overlay) {
      if (
        overlay.width !==
        canvas.width
      ) {
        overlay.width =
          canvas.width;
      }

      if (
        overlay.height !==
        canvas.height
      ) {
        overlay.height =
          canvas.height;
      }
    }

    return mask;
  }

  function clearAIObjectMask() {
    const mask =
      aiObjectMaskCanvasRef.current;

    if (mask) {
      const ctx =
        mask.getContext("2d");

      if (ctx) {
        ctx.clearRect(
          0,
          0,
          mask.width,
          mask.height
        );
      }
    }

    const overlay =
      aiObjectOverlayCanvasRef.current;

    if (overlay) {
      const overlayCtx =
        overlay.getContext(
          "2d"
        );

      if (overlayCtx) {
        overlayCtx.clearRect(
          0,
          0,
          overlay.width,
          overlay.height
        );
      }
    }
  }

  function paintAIObjectDot(x, y) {
  const mask = ensureAIObjectMaskCanvas();

  if (!mask) return;

  const ctx = mask.getContext("2d");

  if (!ctx) return;

  const radius = Math.max(
    5,
    objectBrushSize / 2
  );

  /*
   * IMPORTANT:
   * The actual AI mask must be opaque.
   *
   * Previously this was 0.03 alpha.
   * 0.03 * 255 = 7.65, while the old
   * mask builder required alpha > 8.
   *
   * Result: almost empty mask -> MI-GAN
   * received no object selection.
   */
  ctx.save();

  ctx.fillStyle =
    "rgba(255, 255, 255, 1)";

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    radius,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();

  /*
   * Visual overlay is separate.
   */
  const overlay =
    aiObjectOverlayCanvasRef.current;

  const overlayCtx =
    overlay?.getContext("2d");

  if (
    overlay &&
    overlayCtx
  ) {
    overlayCtx.save();

    overlayCtx.fillStyle =
      "rgba(255, 0, 0, 0.18)";

    overlayCtx.beginPath();

    overlayCtx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    overlayCtx.fill();

    overlayCtx.restore();
  }
}

  function paintAIObjectLine(
    from,
    to
  ) {
    if (!from || !to) return;

    const distance =
      Math.hypot(
        to.x - from.x,
        to.y - from.y
      );

    const step =
      Math.max(
        2,
        objectBrushSize / 4
      );

    const count =
      Math.max(
        1,
        Math.ceil(
          distance / step
        )
      );

    for (
      let i = 0;
      i <= count;
      i += 1
    ) {
      const progress =
        i / count;

      paintAIObjectDot(
        from.x +
          (to.x - from.x) *
            progress,
        from.y +
          (to.y - from.y) *
            progress
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * POINTER DOWN
   * ---------------------------------------------------------
   */

  function handleObjectPointerDown(
    event
  ) {
    if (
      !objectMode ||
      removingBackground ||
      objectApplying
    ) {
      return;
    }

    event.preventDefault();

    const point =
      getClampedCanvasPoint(
        canvasRef.current,
        event
      );

    if (!point) return;

    objectDrawingRef.current =
      true;

    objectLastPointRef.current =
      point;

    if (aiObjectMode) {
      paintAIObjectDot(
        point.x,
        point.y
      );
    } else {
      eraseObjectDot(
        point.x,
        point.y
      );
    }

    event.currentTarget.setPointerCapture?.(
      event.pointerId
    );
  }

  /*
   * ---------------------------------------------------------
   * POINTER MOVE
   * ---------------------------------------------------------
   */

  function handleObjectPointerMove(
    event
  ) {
    if (
      !objectDrawingRef.current ||
      !objectMode
    ) {
      return;
    }

    event.preventDefault();

    const point =
      getClampedCanvasPoint(
        canvasRef.current,
        event
      );

    if (!point) return;

    const previous =
      objectLastPointRef.current;

    if (previous) {
      if (aiObjectMode) {
        paintAIObjectLine(
          previous,
          point
        );
      } else {
        eraseObjectLine(
          previous,
          point
        );
      }
    } else if (
      aiObjectMode
    ) {
      paintAIObjectDot(
        point.x,
        point.y
      );
    } else {
      eraseObjectDot(
        point.x,
        point.y
      );
    }

    objectLastPointRef.current =
      point;
  }

  /*
   * ---------------------------------------------------------
   * POINTER UP
   * ---------------------------------------------------------
   */

  function handleObjectPointerUp(
    event
  ) {
    objectDrawingRef.current =
      false;

    objectLastPointRef.current =
      null;

    try {
      event.currentTarget.releasePointerCapture?.(
        event.pointerId
      );
    } catch {}
  }

  /*
   * ---------------------------------------------------------
   * EDIT EXISTING OBJECT LAYER
   * ---------------------------------------------------------
   */

  async function editObjectLayer(
    layerId
  ) {
    const layer =
      layers?.objectLayersRef?.current?.find(
        (item) =>
          item.id === layerId
      );

    if (
      !layer ||
      !layer.beforeFile
    ) {
      return;
    }

    try {
      setShowLayers(false);

      setShowEffects(false);

      const restoredImage =
        await loadImage(
          layer.beforeFile
        );

      if (!restoredImage) {
        throw new Error(
          "Could not restore object layer."
        );
      }

      setWorkingFile(
        layer.beforeFile
      );

      setImage(
        restoredImage
      );

      resetLiveEdits();

      const baseCanvas =
        document.createElement(
          "canvas"
        );

      baseCanvas.width =
        restoredImage.naturalWidth ||
        restoredImage.width;

      baseCanvas.height =
        restoredImage.naturalHeight ||
        restoredImage.height;

      const baseCtx =
        baseCanvas.getContext(
          "2d"
        );

      if (baseCtx) {
        baseCtx.drawImage(
          restoredImage,
          0,
          0
        );
      }

      objectBaseCanvasRef.current =
        baseCanvas;

      if (
        layer.type ===
        "ai-object"
      ) {
        const mask =
          await dataURLToCanvas(
            layer.maskDataURL
          );

        const target =
          document.createElement(
            "canvas"
          );

        target.width =
          baseCanvas.width;

        target.height =
          baseCanvas.height;

        const targetCtx =
          target.getContext(
            "2d"
          );

        if (
          targetCtx &&
          mask
        ) {
          targetCtx.drawImage(
            mask,
            0,
            0,
            target.width,
            target.height
          );
        }

        aiObjectMaskCanvasRef.current =
          target;

        const overlay =
          document.createElement(
            "canvas"
          );

        overlay.width =
          baseCanvas.width;

        overlay.height =
          baseCanvas.height;

        const overlayCtx =
          overlay.getContext(
            "2d"
          );

        if (
          overlayCtx &&
          mask
        ) {
          overlayCtx.drawImage(
            mask,
            0,
            0,
            overlay.width,
            overlay.height
          );
        }

        aiObjectOverlayCanvasRef.current =
          overlay;

        setObjectRemovalMode(
          "ai"
        );

        setActiveTool(
          "ai-object"
        );
      } else {
        const mask =
          await dataURLToCanvas(
            layer.maskDataURL
          );

        const canvas =
          canvasRef.current;

        if (canvas) {
          canvas.width =
            baseCanvas.width;

          canvas.height =
            baseCanvas.height;

          const ctx =
            canvas.getContext(
              "2d"
            );

          if (ctx) {
            ctx.clearRect(
              0,
              0,
              canvas.width,
              canvas.height
            );

            ctx.drawImage(
              baseCanvas,
              0,
              0
            );

            if (mask) {
              ctx.save();

              ctx.globalCompositeOperation =
                "destination-out";

              ctx.drawImage(
                mask,
                0,
                0,
                canvas.width,
                canvas.height
              );

              ctx.restore();
            }
          }
        }

        setObjectRemovalMode(
          "standard"
        );

        setActiveTool(
          "object"
        );
      }

      layers.pruneLayersFrom(
        layer.seq || 0
      );

      layers.rebuildAppliedEdits();
    } catch (error) {
      console.error(
        "Object layer edit failed:",
        error
      );

      alert(
        error?.message ||
          "Could not edit this object removal layer."
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * APPLY AI
   * ---------------------------------------------------------
   */

  async function applyAIObjectRemove() {
    const canvas =
      canvasRef.current;

    const baseCanvas =
      objectBaseCanvasRef.current;

    if (
      !canvas ||
      !baseCanvas ||
      objectApplying
    ) {
      return;
    }

    try {
      setObjectApplying(true);

      setAiModelLoading(true);

      setAiProgress(1);

      setAiProgressLabel(
        DEFAULT_AI_LABEL
      );

      /*
       * Make sure current MI-GAN module/session
       * is ready before processing.
       */
      const module =
        await getMiGanModule();

      if (
        !module ||
        typeof module.buildAIInpaintMaskCanvas !==
          "function" ||
        typeof module.runLocalAIObjectRemoval !==
          "function"
      ) {
        throw new Error(
          "MI-GAN object removal functions are unavailable."
        );
      }

      if (
        typeof module.getMiGanSession !==
        "function"
      ) {
        throw new Error(
          "MI-GAN session loader is unavailable."
        );
      }

      /*
       * Ensure the session is ready.
       *
       * If handleAIObjectRemove() already started it,
       * this uses the same cached session promise.
       */
      await module.getMiGanSession(
        (
          progress,
          message
        ) => {
          if (
            Number.isFinite(
              Number(progress)
            )
          ) {
            setAiProgress(
              Math.max(
                1,
                Math.min(
                  90,
                  Number(progress)
                )
              )
            );
          }

          if (message) {
            setAiProgressLabel(
              message
            );
          }
        }
      );

      const selectionCanvas =
        aiObjectMaskCanvasRef.current;

      if (!selectionCanvas) {
        throw new Error(
          "Brush over the object before pressing Apply."
        );
      }

      /*
       * Check whether the user actually painted.
       */
      const selectionCtx =
        selectionCanvas.getContext(
          "2d",
          {
            willReadFrequently:
              true,
          }
        );

      if (!selectionCtx) {
        throw new Error(
          "Could not read the object selection."
        );
      }

      const selectionData =
        selectionCtx.getImageData(
          0,
          0,
          selectionCanvas.width,
          selectionCanvas.height
        );

      let selectedPixels = 0;

      for (
        let i = 3;
        i <
        selectionData.data.length;
        i += 4
      ) {
        if (
          selectionData.data[i] >
          4
        ) {
          selectedPixels += 1;

          if (
            selectedPixels >
            20
          ) {
            break;
          }
        }
      }

      if (
        selectedPixels === 0
      ) {
        throw new Error(
          "Brush over the object before pressing Apply."
        );
      }

      setAiProgress(
        15
      );

      setAiProgressLabel(
        "Preparing object mask..."
      );

      /*
       * Current MI-GAN implementation accepts the
       * source canvas and selection canvas.
       */
      const maskCanvas =
        module.buildAIInpaintMaskCanvas(
          baseCanvas,
          selectionCanvas
        );

      if (!maskCanvas) {
        throw new Error(
          "Could not create the AI object mask."
        );
      }

      setAiProgress(
        20
      );

      setAiProgressLabel(
        "Running local AI..."
      );

      /*
       * Current MI-GAN API uses an options object.
       */
      const aiCanvas =
        await module.runLocalAIObjectRemoval(
          {
            sourceCanvas:
              baseCanvas,

            maskCanvas,

            onProgress: (
              progress,
              label
            ) => {
              const numericProgress =
                Number(progress);

              if (
                Number.isFinite(
                  numericProgress
                )
              ) {
                setAiProgress(
                  Math.max(
                    20,
                    Math.min(
                      99,
                      numericProgress
                    )
                  )
                );
              }

              if (label) {
                setAiProgressLabel(
                  label
                );
              }
            },
          }
        );

      if (!aiCanvas) {
        throw new Error(
          "AI object removal did not return an image."
        );
      }

      setAiProgress(
        95
      );

      setAiProgressLabel(
        "Creating final image..."
      );

      const resultBlob =
        await canvasToBlob(
          aiCanvas,
          "image/png",
          1
        );

      if (!resultBlob) {
        throw new Error(
          "Could not create the AI output image."
        );
      }

      const newFile =
        makePngFile(
          resultBlob,
          getBaseName(
            workingFile
          ),
          "ai-object-removed"
        );

      const newImage =
        await loadImage(
          newFile
        );

      if (!newImage) {
        throw new Error(
          "Could not load the AI-generated image."
        );
      }

      const beforeFile =
        workingFile;

      const maskDataURL =
        canvasToDataURLSafe(
          selectionCanvas
        );

      /*
       * AI object removal belongs to objectLayers
       * because it must remain editable.
       */
      if (
        layers?.addObjectLayer
      ) {
        layers.addObjectLayer({
          type: "ai-object",
          name:
            "AI Object Remove",
          summary:
            "AI object removed",
          beforeFile,
          maskDataURL,
        });
      }

      lastAIResultFileRef.current =
        newFile;

      setAiObjectRemoved(
        true
      );

      setWorkingFile(
        newFile
      );

      setImage(
        newImage
      );

      resetLiveEdits();

      if (
        layers?.addAppliedAction
      ) {
        layers.addAppliedAction(
          "AI object removed"
        );
      }

      objectDrawingRef.current =
        false;

      objectLastPointRef.current =
        null;

      objectBaseCanvasRef.current =
        null;

      clearAIObjectMask();

      setAiProgress(
        100
      );

      setAiProgressLabel(
        "Object removed successfully."
      );

      /*
       * Keep successful AI state but leave
       * object mode closed.
       */
      setObjectRemovalMode(
        "standard"
      );

      setActiveTool(
        null
      );
    } catch (error) {
      console.error(
        "AI object removal failed:",
        error
      );

      alert(
        error?.message ||
          "AI object removal failed. Make sure the browser supports WebAssembly and the model can be downloaded."
      );
    } finally {
      setAiModelLoading(
        false
      );

      setObjectApplying(
        false
      );

      /*
       * Do not immediately destroy the successful
       * 100% progress state before React can render it.
       */
      window.setTimeout(() => {
        setAiProgress(
          0
        );

        setAiProgressLabel(
          DEFAULT_AI_LABEL
        );
      }, 700);
    }
  }

  /*
   * ---------------------------------------------------------
   * APPLY STANDARD / ROUTER
   * ---------------------------------------------------------
   */

  async function applyObjectRemove() {
    if (
      objectRemovalMode ===
      "ai"
    ) {
      await applyAIObjectRemove();
      return;
    }

    const canvas =
      canvasRef.current;

    if (
      !canvas ||
      objectApplying
    ) {
      return;
    }

    try {
      setObjectApplying(
        true
      );

      const blob =
        await canvasToBlob(
          canvas,
          "image/png",
          1
        );

      if (!blob) {
        throw new Error(
          "Could not create object-removed image."
        );
      }

      const newFile =
        makePngFile(
          blob,
          getBaseName(
            workingFile
          ),
          "object-removed"
        );

      const newImage =
        await loadImage(
          newFile
        );

      if (!newImage) {
        throw new Error(
          "Could not load object-removed image."
        );
      }

      const beforeFile =
        workingFile;

      const maskDataURL =
        captureStandardObjectMask(
          objectBaseCanvasRef.current,
          canvas
        );

      if (
        layers?.addObjectLayer
      ) {
        layers.addObjectLayer({
          type: "object",
          name:
            "Object Remove",
          summary:
            "Object removed",
          beforeFile,
          maskDataURL,
        });
      }

      setWorkingFile(
        newFile
      );

      setImage(
        newImage
      );

      resetLiveEdits();

      if (
        layers?.addAppliedAction
      ) {
        layers.addAppliedAction(
          "Object removed"
        );
      }

      objectDrawingRef.current =
        false;

      objectLastPointRef.current =
        null;

      objectBaseCanvasRef.current =
        null;

      setObjectRemovalMode(
        "standard"
      );

      setActiveTool(
        null
      );
    } catch (error) {
      console.error(
        "Object removal failed:",
        error
      );

      alert(
        error?.message ||
          "Object removal failed."
      );
    } finally {
      setObjectApplying(
        false
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * CLEANUP
   * ---------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      objectDrawingRef.current =
        false;

      objectLastPointRef.current =
        null;

      objectBaseCanvasRef.current =
        null;

      aiObjectMaskCanvasRef.current =
        null;

      aiObjectOverlayCanvasRef.current =
        null;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * PUBLIC API
   * ---------------------------------------------------------
   */

  return {
    /*
     * refs shared with EditorCanvas
     */
    objectDrawingRef,

    objectBaseCanvasRef,

    aiObjectOverlayCanvasRef,

    /*
     * state
     */
    objectBrushSize,

    setObjectBrushSize,

    aiModelLoading,

    aiProgress,

    aiProgressLabel,

    /*
     * compatibility with current ImageEditor
     */
    aiProgressText:
      aiProgressLabel,

    aiObjectRemoved,

    objectRemovalMode,

    setObjectRemovalMode,

    /*
     * actions
     */
    handleObjectRemove,

    handleAIObjectRemove,

    cancelObjectRemove,

    applyObjectRemove,

    editObjectLayer,

    resetObjectState,

    /*
     * pointer handlers
     */
    handleObjectPointerDown,

    handleObjectPointerMove,

    handleObjectPointerUp,

    /*
     * direct helpers
     */
    ensureAIObjectMaskCanvas,

    clearAIObjectMask,

    preloadMiGan,
  };
}
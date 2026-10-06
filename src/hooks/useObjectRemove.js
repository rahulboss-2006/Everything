import { useCallback, useEffect, useRef, useState } from "react";

import {
  canvasToBlob,
  captureStandardObjectMask,
} from "../utils/editorTools/canvasHelpers";

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

export default function useObjectRemove({
  workingFile,
  image,
  setImage,
  setWorkingFile,
  layers,
  removingBackground,
  setShowEffects,
  resetImageDrag,
  setActiveTool,
}) {
  const [objectRemovalMode, setObjectRemovalMode] = useState(null);

  const [objectBrushSize, setObjectBrushSize] = useState(50);

  const [objectApplying, setObjectApplying] = useState(false);

  const [aiObjectRemoved, setAiObjectRemoved] = useState(false);

  const [standardObjectRemoved, setStandardObjectRemoved] =
    useState(false);

  const [aiProgress, setAiProgress] = useState(0);

  const [aiProgressText, setAiProgressText] = useState("");

  const objectDrawingRef = useRef(false);
  const objectLastPointRef = useRef(null);

  const objectBaseCanvasRef = useRef(null);
  const aiObjectMaskCanvasRef = useRef(null);

  /*
   * ---------------------------------------------------------
   * OBJECT BASE CANVAS
   * ---------------------------------------------------------
   */

  const snapshotObjectBaseCanvas = useCallback(() => {
    if (!image) return null;

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    if (!width || !height) return null;

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    ctx.clearRect(0, 0, width, height);

    ctx.drawImage(
      image,
      0,
      0,
      width,
      height
    );

    objectBaseCanvasRef.current = canvas;

    return canvas;
  }, [image]);

  /*
   * ---------------------------------------------------------
   * AI MASK CANVAS
   * ---------------------------------------------------------
   */

  const ensureAIObjectMaskCanvas = useCallback(() => {
    if (!image) return null;

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    if (!width || !height) return null;

    const current = aiObjectMaskCanvasRef.current;

    if (
      current &&
      current.width === width &&
      current.height === height
    ) {
      return current;
    }

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    aiObjectMaskCanvasRef.current = canvas;

    return canvas;
  }, [image]);

  /*
   * ---------------------------------------------------------
   * CLEAR AI MASK
   * ---------------------------------------------------------
   */

  const clearAIObjectMask = useCallback(() => {
    const canvas = ensureAIObjectMaskCanvas();

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, [ensureAIObjectMaskCanvas]);

  /*
   * ---------------------------------------------------------
   * CLEANUP
   * ---------------------------------------------------------
   */

  const cleanupObjectState = useCallback(() => {
    objectDrawingRef.current = false;
    objectLastPointRef.current = null;

    setObjectRemovalMode(null);

    setAiProgress(0);
    setAiProgressText("");

    clearAIObjectMask();
  }, [clearAIObjectMask]);

  /*
   * ---------------------------------------------------------
   * MI-GAN PRELOAD
   *
   * Lazy-loads the MI-GAN module and immediately starts
   * loading/warming the inference session.
   * ---------------------------------------------------------
   */

  const preloadMiGan = useCallback(() => {
    return getMiGanModule()
      .then(({ getMiGanSession }) => {
        if (typeof getMiGanSession !== "function") {
          throw new Error(
            "MI-GAN session loader is unavailable."
          );
        }

        return getMiGanSession();
      })
      .catch((error) => {
        console.warn(
          "AI Object Remove model preload failed; it will retry on Apply.",
          error
        );

        return null;
      });
  }, []);

  /*
   * ---------------------------------------------------------
   * OPEN AI OBJECT REMOVE
   * ---------------------------------------------------------
   */

  const handleAIObjectRemove = useCallback(() => {
    if (
      !workingFile ||
      removingBackground ||
      objectApplying
    ) {
      return;
    }

    setAiObjectRemoved(false);
    setStandardObjectRemoved(false);

    setShowEffects(false);

    setObjectRemovalMode("ai");

    resetImageDrag();

    snapshotObjectBaseCanvas();

    objectDrawingRef.current = false;
    objectLastPointRef.current = null;

    ensureAIObjectMaskCanvas();
    clearAIObjectMask();

    setActiveTool("ai-object");

    /*
     * Start MI-GAN loading immediately.
     *
     * This means the model starts loading as soon as
     * AI Object Remove is opened instead of waiting
     * until Apply.
     */
    void preloadMiGan();
  }, [
    workingFile,
    removingBackground,
    objectApplying,
    setShowEffects,
    resetImageDrag,
    snapshotObjectBaseCanvas,
    ensureAIObjectMaskCanvas,
    clearAIObjectMask,
    setActiveTool,
    preloadMiGan,
  ]);

  /*
   * ---------------------------------------------------------
   * OPEN STANDARD OBJECT REMOVE
   * ---------------------------------------------------------
   */

  const handleStandardObjectRemove = useCallback(() => {
    if (
      !workingFile ||
      removingBackground ||
      objectApplying
    ) {
      return;
    }

    setAiObjectRemoved(false);
    setStandardObjectRemoved(false);

    setShowEffects(false);

    setObjectRemovalMode("standard");

    resetImageDrag();

    snapshotObjectBaseCanvas();

    objectDrawingRef.current = false;
    objectLastPointRef.current = null;

    ensureAIObjectMaskCanvas();
    clearAIObjectMask();

    setActiveTool("object");
  }, [
    workingFile,
    removingBackground,
    objectApplying,
    setShowEffects,
    resetImageDrag,
    snapshotObjectBaseCanvas,
    ensureAIObjectMaskCanvas,
    clearAIObjectMask,
    setActiveTool,
  ]);

  /*
   * ---------------------------------------------------------
   * START DRAWING
   * ---------------------------------------------------------
   */

  const startObjectDrawing = useCallback(
    (point) => {
      if (
        !point ||
        objectApplying ||
        removingBackground ||
        !objectRemovalMode
      ) {
        return;
      }

      objectDrawingRef.current = true;
      objectLastPointRef.current = point;
    },
    [
      objectApplying,
      removingBackground,
      objectRemovalMode,
    ]
  );

  /*
   * ---------------------------------------------------------
   * DRAW OBJECT MASK
   *
   * Uses objectBrushSize by default.
   * Caller can still pass an explicit brush size.
   * ---------------------------------------------------------
   */

  const drawObjectMask = useCallback(
    (point, brushSize = objectBrushSize) => {
      if (
        !objectDrawingRef.current ||
        !point ||
        objectRemovalMode !== "ai"
      ) {
        return;
      }

      const canvas = ensureAIObjectMaskCanvas();

      if (!canvas) return;

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      const previous =
        objectLastPointRef.current || point;

      const safeBrushSize = Math.max(
        10,
        Math.min(
          150,
          Number(brushSize) || 50
        )
      );

      ctx.save();

      /*
       * Red visual brush.
       *
       * The actual AI mask is converted later by
       * buildAIInpaintMaskCanvas().
       */
      ctx.strokeStyle = "#ff0000";
      ctx.fillStyle = "#ff0000";

      ctx.globalAlpha = 0.7;

      ctx.lineWidth = safeBrushSize;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();

      ctx.moveTo(
        previous.x,
        previous.y
      );

      ctx.lineTo(
        point.x,
        point.y
      );

      ctx.stroke();

      ctx.beginPath();

      ctx.arc(
        point.x,
        point.y,
        Math.max(
          2,
          safeBrushSize / 2
        ),
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.restore();

      objectLastPointRef.current = point;
    },
    [
      ensureAIObjectMaskCanvas,
      objectRemovalMode,
      objectBrushSize,
    ]
  );

  /*
   * ---------------------------------------------------------
   * STOP DRAWING
   * ---------------------------------------------------------
   */

  const stopObjectDrawing = useCallback(() => {
    objectDrawingRef.current = false;
    objectLastPointRef.current = null;
  }, []);

  /*
   * ---------------------------------------------------------
   * APPLY AI OBJECT REMOVE
   * ---------------------------------------------------------
   */

  const applyAIObjectRemove = useCallback(async () => {
    if (
      !workingFile ||
      !image ||
      objectApplying ||
      removingBackground
    ) {
      return;
    }

    const maskCanvas =
      aiObjectMaskCanvasRef.current;

    if (!maskCanvas) {
      return;
    }

    setObjectApplying(true);

    setAiProgress(1);
    setAiProgressText(
      "Preparing AI Object Remove..."
    );

    try {
      /*
       * Load the MI-GAN module.
       *
       * If preloadMiGan() already completed,
       * this resolves from the cached module/session.
       */
      const {
        buildAIInpaintMaskCanvas,
        runLocalAIObjectRemoval,
      } = await getMiGanModule();

      if (
        typeof buildAIInpaintMaskCanvas !==
          "function" ||
        typeof runLocalAIObjectRemoval !==
          "function"
      ) {
        throw new Error(
          "MI-GAN object removal functions are unavailable."
        );
      }

      /*
       * -----------------------------------------------------
       * CHECK WHETHER USER ACTUALLY PAINTED A MASK
       * -----------------------------------------------------
       */

      const maskHasPixels = (() => {
        const ctx =
          maskCanvas.getContext(
            "2d",
            {
              willReadFrequently: true,
            }
          );

        if (!ctx) return false;

        const pixels = ctx.getImageData(
          0,
          0,
          maskCanvas.width,
          maskCanvas.height
        ).data;

        for (
          let i = 3;
          i < pixels.length;
          i += 4
        ) {
          if (pixels[i] > 10) {
            return true;
          }
        }

        return false;
      })();

      if (!maskHasPixels) {
        throw new Error(
          "Please select the object you want to remove first."
        );
      }

      setAiProgress(5);
      setAiProgressText(
        "Preparing object mask..."
      );

      /*
       * -----------------------------------------------------
       * ORIGINAL IMAGE
       * -----------------------------------------------------
       */

      const baseCanvas =
        objectBaseCanvasRef.current ||
        snapshotObjectBaseCanvas();

      if (!baseCanvas) {
        throw new Error(
          "Could not prepare the original image."
        );
      }

      /*
       * -----------------------------------------------------
       * BUILD AI MASK
       * -----------------------------------------------------
       */

      const aiMaskCanvas =
        buildAIInpaintMaskCanvas(
          baseCanvas,
          maskCanvas
        );

      if (!aiMaskCanvas) {
        throw new Error(
          "Could not create the AI object mask."
        );
      }

      setAiProgress(15);

      setAiProgressText(
        "Starting local AI..."
      );

      /*
       * -----------------------------------------------------
       * RUN LOCAL MI-GAN
       * -----------------------------------------------------
       */

      const resultCanvas =
        await runLocalAIObjectRemoval({
          sourceCanvas: baseCanvas,

          maskCanvas: aiMaskCanvas,

          onProgress: (
            progress,
            message
          ) => {
            const numericProgress =
              Number(progress);

            const safeProgress =
              Math.max(
                15,
                Math.min(
                  99,
                  Number.isFinite(
                    numericProgress
                  )
                    ? numericProgress
                    : 15
                )
              );

            setAiProgress(
              safeProgress
            );

            if (message) {
              setAiProgressText(
                message
              );
            }
          },
        });

      if (!resultCanvas) {
        throw new Error(
          "AI Object Remove did not return an image."
        );
      }

      /*
       * -----------------------------------------------------
       * CREATE PNG
       * -----------------------------------------------------
       */

      setAiProgress(95);

      setAiProgressText(
        "Creating final image..."
      );

      const blob =
        await canvasToBlob(
          resultCanvas,
          "image/png",
          1
        );

      if (!blob) {
        throw new Error(
          "Could not create the processed image."
        );
      }

      const baseName =
        workingFile.name?.replace(
          /\.[^/.]+$/,
          ""
        ) || "image";

      const outputFile =
        new File(
          [blob],
          `${baseName}-object-removed.png`,
          {
            type: "image/png",
            lastModified:
              Date.now(),
          }
        );

      /*
       * -----------------------------------------------------
       * LOAD RESULT IMAGE
       * -----------------------------------------------------
       */

      const loadedImage =
        await new Promise(
          (resolve, reject) => {
            const url =
              URL.createObjectURL(
                outputFile
              );

            const img =
              new Image();

            img.onload = () => {
              URL.revokeObjectURL(
                url
              );

              resolve(img);
            };

            img.onerror = () => {
              URL.revokeObjectURL(
                url
              );

              reject(
                new Error(
                  "Could not load the processed image."
                )
              );
            };

            img.src = url;
          }
        );

      /*
       * -----------------------------------------------------
       * UPDATE EDITOR IMAGE
       * -----------------------------------------------------
       */

      setWorkingFile(outputFile);

      setImage(loadedImage);

      setAiObjectRemoved(true);

      setStandardObjectRemoved(
        false
      );

      setAiProgress(100);

      setAiProgressText(
        "Object removed successfully."
      );

      /*
       * -----------------------------------------------------
       * LAYER SYSTEM
       * -----------------------------------------------------
       */

      if (
        layers?.addToolLayer
      ) {
        try {
          layers.addToolLayer({
            type:
              "ai-object-remove",

            name:
              "AI Object Remove",

            file:
              outputFile,
          });
        } catch (
          layerError
        ) {
          console.warn(
            "Could not add AI Object Remove layer:",
            layerError
          );
        }
      }

      if (
        layers?.addAppliedAction
      ) {
        try {
          layers.addAppliedAction({
            type:
              "ai-object-remove",

            name:
              "AI Object Remove",
          });
        } catch (
          actionError
        ) {
          console.warn(
            "Could not record AI Object Remove action:",
            actionError
          );
        }
      }

      /*
       * Keep the successful state.
       *
       * This also closes the object-removal mode.
       */
      cleanupObjectState();
    } catch (error) {
      console.error(
        "AI Object Remove failed:",
        error
      );

      setAiProgress(0);

      setAiProgressText(
        error?.message ||
          "AI Object Remove failed. Please try again."
      );
    } finally {
      setObjectApplying(false);
    }
  }, [
    workingFile,
    image,
    objectApplying,
    removingBackground,
    snapshotObjectBaseCanvas,
    cleanupObjectState,
    layers,
    setWorkingFile,
    setImage,
  ]);

  /*
   * ---------------------------------------------------------
   * APPLY STANDARD OBJECT REMOVE
   * ---------------------------------------------------------
   */

  const applyStandardObjectRemove =
    useCallback(async () => {
      if (
        !workingFile ||
        !image ||
        objectApplying ||
        removingBackground
      ) {
        return;
      }

      const baseCanvas =
        objectBaseCanvasRef.current ||
        snapshotObjectBaseCanvas();

      if (!baseCanvas) {
        return;
      }

      const editedCanvas =
        document.createElement(
          "canvas"
        );

      editedCanvas.width =
        image.naturalWidth ||
        image.width;

      editedCanvas.height =
        image.naturalHeight ||
        image.height;

      const editedCtx =
        editedCanvas.getContext(
          "2d"
        );

      if (!editedCtx) {
        return;
      }

      editedCtx.clearRect(
        0,
        0,
        editedCanvas.width,
        editedCanvas.height
      );

      editedCtx.drawImage(
        image,
        0,
        0,
        editedCanvas.width,
        editedCanvas.height
      );

      const maskDataURL =
        captureStandardObjectMask(
          baseCanvas,
          editedCanvas
        );

      if (!maskDataURL) {
        return;
      }

      setStandardObjectRemoved(
        true
      );

      setAiObjectRemoved(
        false
      );

      setObjectRemovalMode(
        null
      );
    }, [
      workingFile,
      image,
      objectApplying,
      removingBackground,
      snapshotObjectBaseCanvas,
    ]);

  /*
   * ---------------------------------------------------------
   * RESET WHEN WORKING FILE CHANGES
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!workingFile) {
      objectBaseCanvasRef.current =
        null;

      aiObjectMaskCanvasRef.current =
        null;

      objectDrawingRef.current =
        false;

      objectLastPointRef.current =
        null;

      setObjectRemovalMode(
        null
      );

      setAiObjectRemoved(
        false
      );

      setStandardObjectRemoved(
        false
      );

      setAiProgress(0);

      setAiProgressText("");
    }
  }, [workingFile]);

  /*
   * ---------------------------------------------------------
   * CLEANUP ON UNMOUNT
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
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * PUBLIC API
   * ---------------------------------------------------------
   */

  return {
    objectRemovalMode,
    setObjectRemovalMode,

    objectBrushSize,
    setObjectBrushSize,

    objectApplying,

    aiObjectRemoved,
    standardObjectRemoved,

    aiProgress,
    aiProgressText,

    aiObjectMaskCanvasRef,
    objectBaseCanvasRef,

    objectDrawingRef,

    handleAIObjectRemove,
    handleStandardObjectRemove,

    startObjectDrawing,
    drawObjectMask,
    stopObjectDrawing,

    applyAIObjectRemove,
    applyStandardObjectRemove,

    clearAIObjectMask,
    cleanupObjectState,

    preloadMiGan,
  };
}
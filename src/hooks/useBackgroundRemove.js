import { useRef, useState, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";
import { loadImage } from "../utils/imageEditor";
import {
  getBaseName,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";

/*
 * Detect relatively weak devices.
 *
 * The goal is NOT to change the UI.
 * It only chooses a lighter AI model so low-end phones/laptops
 * don't spend an excessive amount of time doing inference.
 */
function isWeakDevice() {
  try {
    const cores = Number(navigator.hardwareConcurrency || 4);
    const memory = Number(navigator.deviceMemory || 0);

    /*
     * deviceMemory is not available in every browser.
     * When unavailable, CPU cores are still useful.
     */
    if (memory > 0 && memory <= 4) {
      return true;
    }

    if (cores <= 4) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/*
 * Choose the model automatically.
 *
 * Weak device:
 *   isnet_quint8 -> much lighter
 *
 * Normal/strong device:
 *   isnet_fp16 -> better quality/performance balance
 */
function getBackgroundModel() {
  return isWeakDevice()
    ? "isnet_quint8"
    : "isnet_fp16";
}

export default function useBackgroundRemove({
  workingFile,
  removingBackground,
  setRemovingBackground,
  setWorkingFile,
  setImage,
  setImageOffset,
  setActiveTool,
  resetImageDrag,
  objectBaseCanvasRef,
  objectDrawingRef,
  layers,
}) {
  const backgroundRealProgressRef = useRef(0);

  const backgroundDisplayedProgressRef = useRef(0);

  const backgroundProgressFrameRef = useRef(null);

  const backgroundProcessingFinishedRef = useRef(false);

  const backgroundProgressTargetRef = useRef(0);

  const [backgroundProgress, setBackgroundProgress] =
    useState(0);

  const [backgroundError, setBackgroundError] =
    useState("");

  /*
   * Smooth progress animation.
   *
   * Important:
   * The UI never reaches 100% before the complete
   * background-removal pipeline is actually finished.
   */
  const animateBackgroundProgress = () => {
    if (backgroundProgressFrameRef.current) {
      return;
    }

    const animate = () => {
      const current =
        backgroundDisplayedProgressRef.current;

      const target =
        backgroundProcessingFinishedRef.current
          ? 100
          : Math.min(
              99,
              Math.max(
                backgroundProgressTargetRef.current,
                backgroundRealProgressRef.current
              )
            );

      const difference = target - current;

      if (Math.abs(difference) <= 0.05) {
        backgroundDisplayedProgressRef.current =
          target;

        setBackgroundProgress(target);

        backgroundProgressFrameRef.current = null;

        /*
         * If processing is still running, keep following
         * future progress callbacks.
         */
        if (
          !backgroundProcessingFinishedRef.current &&
          target < 99
        ) {
          return;
        }

        return;
      }

      /*
       * Faster movement when the real progress jumps,
       * but still smooth enough for the progress bar.
       */
      const step = Math.max(
        0.25,
        Math.abs(difference) * 0.18
      );

      const next =
        difference > 0
          ? Math.min(current + step, target)
          : Math.max(current - step, target);

      backgroundDisplayedProgressRef.current =
        next;

      setBackgroundProgress(next);

      backgroundProgressFrameRef.current =
        requestAnimationFrame(animate);
    };

    backgroundProgressFrameRef.current =
      requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (backgroundProgressFrameRef.current) {
        cancelAnimationFrame(
          backgroundProgressFrameRef.current
        );

        backgroundProgressFrameRef.current = null;
      }
    };
  }, []);

  /*
   * Convert IMG.LY progress into useful UI stages.
   *
   * IMG.LY reports progress for:
   * decode -> inference -> mask -> encode
   *
   * The callback is file/stage based, so we keep the
   * displayed value stable during expensive inference.
   */
  const updateRealProgress = (
    key,
    current,
    total
  ) => {
    if (!total || total <= 0) {
      return;
    }

    const raw = Math.min(
      100,
      Math.max(0, (current / total) * 100)
    );

    let stageProgress = raw;

    if (key === "compute:decode") {
      /*
       * Decode stage: 0 -> 12
       */
      stageProgress =
        0 + raw * 0.12;
    } else if (key === "compute:inference") {
      /*
       * AI inference: 12 -> 88
       *
       * This is normally the longest stage.
       */
      stageProgress =
        12 + raw * 0.76;
    } else if (key === "compute:mask") {
      /*
       * Mask creation: 88 -> 94
       */
      stageProgress =
        88 + raw * 0.06;
    } else if (key === "compute:encode") {
      /*
       * PNG/WebP encoding: 94 -> 99
       */
      stageProgress =
        94 + raw * 0.05;
    } else {
      stageProgress = raw * 0.99;
    }

    stageProgress = Math.min(
      99,
      Math.max(
        backgroundRealProgressRef.current,
        stageProgress
      )
    );

    backgroundRealProgressRef.current =
      stageProgress;

    backgroundProgressTargetRef.current =
      stageProgress;

    animateBackgroundProgress();
  };

  async function handleBackgroundRemove() {
    if (!workingFile || removingBackground) {
      return;
    }

    try {
      setRemovingBackground(true);

      setBackgroundError("");

      setBackgroundProgress(0);

      backgroundRealProgressRef.current = 0;

      backgroundDisplayedProgressRef.current = 0;

      backgroundProgressTargetRef.current = 0;

      backgroundProcessingFinishedRef.current =
        false;

      if (backgroundProgressFrameRef.current) {
        cancelAnimationFrame(
          backgroundProgressFrameRef.current
        );

        backgroundProgressFrameRef.current = null;
      }

      animateBackgroundProgress();

      setImageOffset({
        x: 0,
        y: 0,
      });

      resetImageDrag();

      /*
       * Do NOT create another File by copying the complete
       * ArrayBuffer.
       *
       * The original File/Blob can be passed directly to IMG.LY.
       * This removes one unnecessary full-file memory copy.
       */
      const inputFile = workingFile;

      /*
       * Automatically select the lighter model on weak devices.
       */
      const model = getBackgroundModel();

      /*
       * IMG.LY runs the heavy inference in its worker path
       * by default. Keep that enabled.
       *
       * WebGPU is intentionally NOT forced here because the
       * current project must remain stable across browsers
       * and GitHub Pages/Vercel/Netlify.
       */
      const result = await removeBackground(
        inputFile,
        {
          model,

          proxyToWorker: true,

          output: {
            /*
             * WebP keeps the encoded intermediate result
             * considerably smaller than PNG.
             *
             * makePngFile() below still produces the final
             * transparent PNG file used by the editor.
             */
            format: "image/webp",
            quality: 0.9,
          },

          progress: (
            key,
            current,
            total
          ) => {
            updateRealProgress(
              key,
              current,
              total
            );
          },
        }
      );

      if (!result) {
        throw new Error(
          "Background removal returned an empty result."
        );
      }

      /*
       * The actual AI work is finished.
       *
       * Move to 99 while the generated image is converted
       * and loaded into the editor.
       */
      backgroundRealProgressRef.current = Math.max(
        backgroundRealProgressRef.current,
        99
      );

      backgroundProgressTargetRef.current = 99;

      animateBackgroundProgress();

      /*
       * Convert the AI result into the editor's PNG file.
       */
      const newFile = makePngFile(
        result,
        getBaseName(workingFile),
        "no-background"
      );

      const newImage = await loadImage(
        newFile
      );

      if (!newImage) {
        throw new Error(
          "The generated transparent image could not be loaded."
        );
      }

      /*
       * Register layer.
       */
      layers.addToolLayer({
        type: "background",
        name: "Background Removed",
        detail: "AI background removal",
        beforeFile: workingFile,
        summary: "Background removed",
      });

      /*
       * Apply result.
       */
      setWorkingFile(newFile);

      setImage(newImage);

      setActiveTool(null);

      objectBaseCanvasRef.current = null;

      objectDrawingRef.current = false;

      layers.addAppliedAction(
        "Background removed"
      );

      /*
       * Only now allow 100%.
       */
      backgroundRealProgressRef.current = 100;

      backgroundProgressTargetRef.current = 100;

      backgroundProcessingFinishedRef.current =
        true;

      animateBackgroundProgress();

      /*
       * Wait only for the visual animation to finish.
       */
      await new Promise((resolve) => {
        const waitForCompletion = () => {
          if (
            backgroundDisplayedProgressRef.current >=
            99.99
          ) {
            backgroundDisplayedProgressRef.current =
              100;

            setBackgroundProgress(100);

            resolve();

            return;
          }

          requestAnimationFrame(
            waitForCompletion
          );
        };

        requestAnimationFrame(
          waitForCompletion
        );
      });
    } catch (error) {
      console.error(
        "Background removal failed:",
        error
      );

      setBackgroundError(
        error?.message ||
          "Background removal failed."
      );

      /*
       * Stop progress animation on failure.
       */
      backgroundProcessingFinishedRef.current =
        false;

      if (backgroundProgressFrameRef.current) {
        cancelAnimationFrame(
          backgroundProgressFrameRef.current
        );

        backgroundProgressFrameRef.current = null;
      }
    } finally {
      setRemovingBackground(false);
    }
  }

  return {
    backgroundProgress,
    backgroundError,
    handleBackgroundRemove,
  };
}
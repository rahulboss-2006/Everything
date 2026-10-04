import { useRef, useState, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";
import { loadImage } from "../utils/imageEditor";
import {
  getBaseName,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";

/*
 * ---------------------------------------------------------
 * DEVICE DETECTION
 * ---------------------------------------------------------
 */

function getDeviceMemory() {
  try {
    return Number(
      navigator.deviceMemory || 0
    );
  } catch {
    return 0;
  }
}

function getCpuCores() {
  try {
    return Number(
      navigator.hardwareConcurrency || 4
    );
  } catch {
    return 4;
  }
}

function isWeakDevice() {
  const cores = getCpuCores();
  const memory = getDeviceMemory();

  if (memory > 0 && memory <= 4) {
    return true;
  }

  if (cores <= 4) {
    return true;
  }

  return false;
}

/*
 * Small/quantized model is officially supported by IMG.LY.
 *
 * "small" maps to isnet_quint8.
 * "medium" maps to isnet_fp16.
 */
function getBackgroundModel() {
  return isWeakDevice()
    ? "isnet_quint8"
    : "isnet_fp16";
}

/*
 * ---------------------------------------------------------
 * HOOK
 * ---------------------------------------------------------
 */

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
  const progressFrameRef =
    useRef(null);

  const progressTargetRef =
    useRef(0);

  const displayedProgressRef =
    useRef(0);

  const operationFinishedRef =
    useRef(false);

  const [backgroundProgress, setBackgroundProgress] =
    useState(0);

  const [backgroundError, setBackgroundError] =
    useState("");

  /*
   * -------------------------------------------------------
   * FAST PROGRESS
   * -------------------------------------------------------
   *
   * Do not try to interpret IMG.LY's 4-step callback
   * as a real 0-100 inference percentage.
   *
   * Instead map each actual stage to a predictable range.
   */

  const setProgressTarget = (value) => {
    const safe = Math.min(
      99,
      Math.max(0, value)
    );

    if (
      safe <
      progressTargetRef.current
    ) {
      return;
    }

    progressTargetRef.current =
      safe;

    animateProgress();
  };

  const animateProgress = () => {
    if (progressFrameRef.current) {
      return;
    }

    const frame = () => {
      const current =
        displayedProgressRef.current;

      const target =
        operationFinishedRef.current
          ? 100
          : progressTargetRef.current;

      /*
       * Finished:
       * complete immediately instead of waiting for
       * an artificial animation.
       */
      if (
        operationFinishedRef.current
      ) {
        displayedProgressRef.current =
          100;

        setBackgroundProgress(100);

        progressFrameRef.current =
          null;

        return;
      }

      const difference =
        target - current;

      if (
        difference <= 0.1
      ) {
        displayedProgressRef.current =
          target;

        setBackgroundProgress(
          target
        );

        progressFrameRef.current =
          null;

        return;
      }

      /*
       * Smooth but fast.
       */
      const step = Math.max(
        0.8,
        difference * 0.3
      );

      const next = Math.min(
        current + step,
        target
      );

      displayedProgressRef.current =
        next;

      setBackgroundProgress(
        next
      );

      progressFrameRef.current =
        requestAnimationFrame(
          frame
        );
    };

    progressFrameRef.current =
      requestAnimationFrame(frame);
  };

  /*
   * -------------------------------------------------------
   * CLEANUP
   * -------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      if (
        progressFrameRef.current
      ) {
        cancelAnimationFrame(
          progressFrameRef.current
        );

        progressFrameRef.current =
          null;
      }
    };
  }, []);

  /*
   * -------------------------------------------------------
   * IMG.LY PROGRESS
   * -------------------------------------------------------
   *
   * Current IMG.LY web implementation reports:
   *
   * decode:
   *   0 -> 4
   *
   * inference:
   *   1 -> 4
   *
   * mask:
   *   2 -> 4
   *
   * encode:
   *   3 -> 4
   *
   * encode complete:
   *   4 -> 4
   *
   * It is NOT a continuous percentage.
   */

  const handleRealProgress = (
    key,
    current,
    total
  ) => {
    if (!key) {
      return;
    }

    /*
     * Download/model loading doesn't give us
     * a reliable total processing percentage.
     *
     * Keep the loader moving without claiming
     * that AI inference is finished.
     */
    if (
      key === "compute:decode"
    ) {
      if (current <= 0) {
        setProgressTarget(3);
      } else {
        setProgressTarget(12);
      }

      return;
    }

    if (
      key === "compute:inference"
    ) {
      /*
       * The library reports inference as 1/4,
       * not a continuously changing percentage.
       *
       * Do NOT jump to 99 here.
       */
      setProgressTarget(65);

      return;
    }

    if (
      key === "compute:mask"
    ) {
      setProgressTarget(88);

      return;
    }

    if (
      key === "compute:encode"
    ) {
      if (
        current >= total
      ) {
        setProgressTarget(99);
      } else {
        setProgressTarget(94);
      }

      return;
    }

    /*
     * Unknown progress event.
     *
     * Move very slightly so the UI remains alive.
     */
    setProgressTarget(
      Math.min(
        98,
        progressTargetRef.current +
          1
      )
    );
  };

  /*
   * -------------------------------------------------------
   * BACKGROUND REMOVE
   * -------------------------------------------------------
   */

  async function handleBackgroundRemove() {
    if (
      !workingFile ||
      removingBackground
    ) {
      return;
    }

    try {
      setRemovingBackground(true);

      setBackgroundError("");

      /*
       * Reset progress.
       */
      progressTargetRef.current =
        0;

      displayedProgressRef.current =
        0;

      operationFinishedRef.current =
        false;

      setBackgroundProgress(0);

      if (
        progressFrameRef.current
      ) {
        cancelAnimationFrame(
          progressFrameRef.current
        );

        progressFrameRef.current =
          null;
      }

      /*
       * Start immediately.
       */
      animateProgress();

      /*
       * Reset editor position exactly as before.
       */
      setImageOffset({
        x: 0,
        y: 0,
      });

      resetImageDrag();

      /*
       * IMPORTANT:
       *
       * Do not create a duplicate ArrayBuffer/File.
       *
       * IMG.LY accepts Blob/File directly.
       */
      const inputFile =
        workingFile;

      /*
       * Low-end:
       * isnet_quint8
       *
       * Normal:
       * isnet_fp16
       */
      const model =
        getBackgroundModel();

      console.log(
        "[Background Remove] model:",
        model
      );

      /*
       * ---------------------------------------------------
       * ACTUAL AI
       * ---------------------------------------------------
       */

      const result =
        await removeBackground(
          inputFile,
          {
            /*
             * Keep worker enabled where supported.
             */
            proxyToWorker: true,

            /*
             * Smaller quantized model on weak devices.
             */
            model,

            /*
             * IMPORTANT:
             *
             * Keep PNG here.
             *
             * Your makePngFile() and editor pipeline
             * expect a transparent image result.
             */
            output: {
              format: "image/png",
              quality: 0.9,
            },

            progress: (
              key,
              current,
              total
            ) => {
              handleRealProgress(
                key,
                current,
                total
              );
            },
          }
        );

      /*
       * ---------------------------------------------------
       * AI COMPLETELY FINISHED
       * ---------------------------------------------------
       */

      if (!result) {
        throw new Error(
          "Background removal returned an empty result."
        );
      }

      /*
       * At this point removeBackground()
       * has already completed decode,
       * inference, mask and encode.
       *
       * No artificial 99% waiting.
       */
      setProgressTarget(99);

      /*
       * Convert result into editor PNG file.
       */
      const newFile =
        makePngFile(
          result,
          getBaseName(
            workingFile
          ),
          "no-background"
        );

      /*
       * Load final transparent image.
       */
      const newImage =
        await loadImage(
          newFile
        );

      if (!newImage) {
        throw new Error(
          "The generated transparent image could not be loaded."
        );
      }

      /*
       * ---------------------------------------------------
       * REGISTER LAYER
       * ---------------------------------------------------
       */

      layers.addToolLayer({
        type: "background",
        name: "Background Removed",
        detail:
          "AI background removal",
        beforeFile:
          workingFile,
        summary:
          "Background removed",
      });

      /*
       * ---------------------------------------------------
       * APPLY RESULT
       * ---------------------------------------------------
       */

      setWorkingFile(
        newFile
      );

      setImage(
        newImage
      );

      setActiveTool(
        null
      );

      objectBaseCanvasRef.current =
        null;

      objectDrawingRef.current =
        false;

      layers.addAppliedAction(
        "Background removed"
      );

      /*
       * ---------------------------------------------------
       * FINISH IMMEDIATELY
       * ---------------------------------------------------
       */

      operationFinishedRef.current =
        true;

      displayedProgressRef.current =
        100;

      progressTargetRef.current =
        100;

      setBackgroundProgress(
        100
      );

      if (
        progressFrameRef.current
      ) {
        cancelAnimationFrame(
          progressFrameRef.current
        );

        progressFrameRef.current =
          null;
      }
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
       * Reset loader cleanly.
       */
      operationFinishedRef.current =
        true;

      if (
        progressFrameRef.current
      ) {
        cancelAnimationFrame(
          progressFrameRef.current
        );

        progressFrameRef.current =
          null;
      }
    } finally {
      /*
       * Do not wait for an artificial progress animation.
       */
      setRemovingBackground(
        false
      );
    }
  }

  return {
    backgroundProgress,
    backgroundError,
    handleBackgroundRemove,
  };
}
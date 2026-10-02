import { useRef, useState, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";
import { loadImage } from "../utils/imageEditor";
import {
  getBaseName,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";

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
  /*
   * REAL progress reported by @imgly.
   *
   * This is the source of truth.
   */
  const backgroundRealProgressRef = useRef(0);

  /*
   * Progress currently displayed by the UI.
   */
  const backgroundDisplayedProgressRef = useRef(0);

  /*
   * requestAnimationFrame handle.
   */
  const backgroundProgressFrameRef = useRef(null);

  /*
   * Prevent progress from reaching 100 until
   * the complete background-removal operation finishes.
   */
  const backgroundProcessingFinishedRef = useRef(false);

  const [backgroundProgress, setBackgroundProgress] =
    useState(0);

  const [backgroundError, setBackgroundError] =
    useState("");

  /*
   * Smoothly follow REAL progress.
   *
   * IMPORTANT:
   * The displayed progress can NEVER go above
   * the real progress reported by the AI engine.
   */
  const animateBackgroundProgress = () => {
    if (backgroundProgressFrameRef.current) {
      return;
    }

    const animate = () => {
      const realProgress =
        backgroundRealProgressRef.current;

      const current =
        backgroundDisplayedProgressRef.current;

      /*
       * During actual processing:
       *
       * 0 -> 99 maximum.
       *
       * We never invent progress beyond what
       * the AI engine has reported.
       */
      const target =
        backgroundProcessingFinishedRef.current
          ? 100
          : Math.min(99, realProgress);

      const difference = target - current;

      /*
       * Already reached target.
       */
      if (Math.abs(difference) <= 0.01) {
        backgroundDisplayedProgressRef.current =
          target;

        setBackgroundProgress(target);

        backgroundProgressFrameRef.current = null;

        return;
      }

      /*
       * Follow the real progress smoothly.
       *
       * IMPORTANT:
       * Never overshoot the target.
       */
      const step =
        Math.max(
          0.15,
          Math.abs(difference) * 0.16
        );

      let next;

      if (difference > 0) {
        next = Math.min(
          current + step,
          target
        );
      } else {
        next = Math.max(
          current - step,
          target
        );
      }

      backgroundDisplayedProgressRef.current =
        next;

      setBackgroundProgress(next);

      backgroundProgressFrameRef.current =
        requestAnimationFrame(animate);
    };

    backgroundProgressFrameRef.current =
      requestAnimationFrame(animate);
  };

  /*
   * Cleanup.
   */
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

      backgroundProcessingFinishedRef.current =
        false;

      /*
       * Cancel old animation.
       */
      if (backgroundProgressFrameRef.current) {
        cancelAnimationFrame(
          backgroundProgressFrameRef.current
        );

        backgroundProgressFrameRef.current = null;
      }

      /*
       * Start UI animation.
       */
      animateBackgroundProgress();

      setImageOffset({
        x: 0,
        y: 0,
      });

      resetImageDrag();

      /*
       * Read original file.
       */
      const buffer =
        await workingFile.arrayBuffer();

      const inputFile = new File(
        [buffer],
        workingFile.name || "image.png",
        {
          type:
            workingFile.type ||
            "image/png",
          lastModified: Date.now(),
        }
      );

      /*
       * ==========================================
       * ACTUAL AI BACKGROUND REMOVAL
       * ==========================================
       */
      const result =
        await removeBackground(inputFile, {
          model: "isnet",

          output: {
            format: "image/png",
            quality: 1,
          },

          /*
           * REAL progress from @imgly.
           */
          progress: (
            key,
            current,
            total
          ) => {
            if (
              !total ||
              total <= 0
            ) {
              return;
            }

            const rawPercent =
              (current / total) * 100;

            /*
             * Keep actual progress between
             * 0 and 99 during processing.
             */
            const safePercent =
              Math.min(
                99,
                Math.max(
                  0,
                  rawPercent
                )
              );

            /*
             * Never move backwards.
             */
            if (
              safePercent >
              backgroundRealProgressRef.current
            ) {
              backgroundRealProgressRef.current =
                safePercent;
            }

            /*
             * UI follows actual progress.
             */
            animateBackgroundProgress();
          },
        });

      /*
       * removeBackground() has finished.
       */
      if (!result) {
        throw new Error(
          "Background removal returned an empty result."
        );
      }

      /*
       * IMPORTANT:
       *
       * Do NOT artificially set progress to 99 here.
       *
       * The UI remains at the last REAL progress
       * while PNG conversion/loading happens.
       */

      animateBackgroundProgress();

      /*
       * Convert result to PNG.
       */
      const newFile =
        makePngFile(
          result,
          getBaseName(workingFile),
          "no-background"
        );

      /*
       * Load generated image.
       */
      const newImage =
        await loadImage(newFile);

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
       * ==========================================
       * ACTUAL OPERATION COMPLETELY FINISHED
       * ==========================================
       *
       * ONLY NOW allow 100%.
       */
      backgroundRealProgressRef.current = 100;

      backgroundProcessingFinishedRef.current =
        true;

      /*
       * Continue animation from the actual
       * current value to 100%.
       */
      animateBackgroundProgress();

      /*
       * Wait until visual progress actually
       * reaches 100 before ending the loader.
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
    } finally {
      /*
       * Only hide loader after the actual
       * operation + final progress animation.
       */
      setRemovingBackground(false);
    }
  }

  return {
    backgroundProgress,
    backgroundError,
    handleBackgroundRemove,
  };
}
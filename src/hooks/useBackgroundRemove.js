import { useRef, useState, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";
import { loadImage } from "../utils/imageEditor";
import { getBaseName, makePngFile } from "../utils/editorTools/canvasHelpers";

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
   * Real progress reported by the AI engine.
   *
   * This value is NOT rendered directly.
   * The UI smoothly follows it through requestAnimationFrame.
   */
  const backgroundRealProgressRef = useRef(0);

  /*
   * Current visual progress shown in the UI.
   */
  const backgroundDisplayedProgressRef = useRef(0);

  /*
   * Animation frame used to smoothly move displayed progress
   * toward the real AI progress.
   */
  const backgroundProgressFrameRef = useRef(null);

  const [backgroundProgress, setBackgroundProgress] = useState(0);
  const [backgroundError, setBackgroundError] = useState("");

  /*
   * Smoothly animate UI progress toward the actual AI progress.
   *
   * Important:
   * - Real progress can jump quickly.
   * - UI follows it smoothly.
   * - It can never go above 99% while processing.
   * - 100% is only set after removeBackground() actually finishes.
   */
  const animateBackgroundProgress = () => {
    if (backgroundProgressFrameRef.current) {
      return;
    }

    const animate = () => {
      const target = Math.min(
        99,
        Math.max(0, backgroundRealProgressRef.current)
      );

      const current = backgroundDisplayedProgressRef.current;

      const difference = target - current;

      /*
       * If almost reached the target, snap to target.
       */
      if (Math.abs(difference) < 0.05) {
        backgroundDisplayedProgressRef.current = target;

        setBackgroundProgress((previous) => {
          if (Math.abs(previous - target) < 0.05) {
            return previous;
          }

          return target;
        });

        backgroundProgressFrameRef.current = null;
        return;
      }

      /*
       * Smooth interpolation.
       *
       * Larger difference = faster movement.
       * Smaller difference = slower movement.
       */
      const next =
        current + difference * 0.12;

      backgroundDisplayedProgressRef.current = next;

      setBackgroundProgress((previous) => {
        if (Math.abs(previous - next) < 0.05) {
          return previous;
        }

        return next;
      });

      backgroundProgressFrameRef.current =
        requestAnimationFrame(animate);
    };

    backgroundProgressFrameRef.current =
      requestAnimationFrame(animate);
  };

  /*
   * Cleanup animation frame if component unmounts.
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
    if (!workingFile || removingBackground) return;

    try {
      setRemovingBackground(true);

      setBackgroundProgress(0);
      setBackgroundError("");

      backgroundRealProgressRef.current = 0;
      backgroundDisplayedProgressRef.current = 0;

      if (backgroundProgressFrameRef.current) {
        cancelAnimationFrame(
          backgroundProgressFrameRef.current
        );

        backgroundProgressFrameRef.current = null;
      }

      /*
       * Start progress animation immediately.
       */
      animateBackgroundProgress();

      setImageOffset({ x: 0, y: 0 });
      resetImageDrag();

      /*
       * Read original file.
       */
      const buffer = await workingFile.arrayBuffer();

      const inputFile = new File(
        [buffer],
        workingFile.name || "image.png",
        {
          type: workingFile.type || "image/png",
          lastModified: Date.now(),
        }
      );

      /*
       * ACTUAL AI BACKGROUND REMOVAL
       */
      const result = await removeBackground(inputFile, {
        model: "isnet",

        output: {
          format: "image/png",
          quality: 1,
        },

        /*
         * This is the REAL progress from @imgly.
         */
        progress: (key, current, total) => {
          if (!total || total <= 0) return;

          const rawPercent =
            (current / total) * 100;

          /*
           * Never allow the processing UI to reach 100%
           * from the progress callback.
           *
           * 100% means the actual operation has finished.
           */
          const safePercent = Math.min(
            99,
            Math.max(0, rawPercent)
          );

          /*
           * Never move backwards.
           */
          backgroundRealProgressRef.current =
            Math.max(
              backgroundRealProgressRef.current,
              safePercent
            );

          /*
           * Keep the animation running.
           */
          animateBackgroundProgress();
        },
      });

      if (!result) {
        throw new Error(
          "Background removal returned an empty result."
        );
      }

      /*
       * Force the visual progress close to completion
       * while the result is being converted/loaded.
       *
       * It still cannot reach 100% yet.
       */
      backgroundRealProgressRef.current = Math.max(
        backgroundRealProgressRef.current,
        99
      );

      animateBackgroundProgress();

      /*
       * Convert result to PNG.
       */
      const newFile = makePngFile(
        result,
        getBaseName(workingFile),
        "no-background"
      );

      /*
       * Load generated image.
       */
      const newImage = await loadImage(newFile);

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
       * ACTUAL OPERATION IS NOW FINISHED.
       *
       * Only here do we allow 100%.
       */
      backgroundRealProgressRef.current = 100;

      /*
       * Stop previous animation.
       */
      if (backgroundProgressFrameRef.current) {
        cancelAnimationFrame(
          backgroundProgressFrameRef.current
        );

        backgroundProgressFrameRef.current = null;
      }

      /*
       * Smoothly finish 99 -> 100.
       */
      const finishAnimation = () => {
        const current =
          backgroundDisplayedProgressRef.current;

        const difference = 100 - current;

        if (difference <= 0.05) {
          backgroundDisplayedProgressRef.current = 100;
          setBackgroundProgress(100);

          backgroundProgressFrameRef.current = null;
          return;
        }

        const next =
          current + difference * 0.2;

        backgroundDisplayedProgressRef.current = next;

        setBackgroundProgress(next);

        backgroundProgressFrameRef.current =
          requestAnimationFrame(
            finishAnimation
          );
      };

      backgroundProgressFrameRef.current =
        requestAnimationFrame(
          finishAnimation
        );
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
       * Do NOT immediately reset progress here.
       *
       * The loader should be allowed to visually
       * reach 100% first.
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
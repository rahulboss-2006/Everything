import {
  useRef,
  useState,
  useEffect,
} from "react";

import {
  segmentForeground,
  applySegmentationMask,
} from "@imgly/background-removal";

import { loadImage } from "../utils/imageEditor";
import {
  getBaseName,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";

/*
 * =========================================================
 * PERFORMANCE
 * =========================================================
 *
 * Upload:
 *
 * original
 *   ↓
 * small AI copy
 *   ↓
 * GPU / ISNet
 *   ↓
 * mask
 *   ↓
 * original image
 *   ↓
 * transparent result
 *   ↓
 * CACHE
 *
 * Remove button:
 *
 * cached result
 *   ↓
 * instant apply
 *
 * This means the expensive work happens BEFORE
 * the user presses Remove.
 */

const AI_MAX_SIZE = 1024;
const AI_MAX_SIZE_WEAK = 768;

/*
 * =========================================================
 * DEVICE
 * =========================================================
 */

function getMemory() {
  try {
    return Number(
      navigator.deviceMemory || 0
    );
  } catch {
    return 0;
  }
}

function getCores() {
  try {
    return Number(
      navigator.hardwareConcurrency || 4
    );
  } catch {
    return 4;
  }
}

function isWeakDevice() {
  const memory = getMemory();
  const cores = getCores();

  if (memory > 0 && memory <= 4) {
    return true;
  }

  if (cores <= 4) {
    return true;
  }

  return false;
}

function hasWebGPU() {
  try {
    return (
      typeof navigator !== "undefined" &&
      !!navigator.gpu
    );
  } catch {
    return false;
  }
}

/*
 * =========================================================
 * CONFIG
 * =========================================================
 *
 * GPU:
 *   isnet + GPU
 *
 * CPU:
 *   weak -> quint8
 *   normal -> fp16
 *
 * IMG.LY specifically added GPU execution with:
 *
 * device: "gpu"
 *
 * and the isnet model for WebGPU. 
 */

function getConfig() {
  const gpu = hasWebGPU();
  const weak = isWeakDevice();

  if (gpu) {
    return {
      device: "gpu",
      model: "isnet",
      weak,
    };
  }

  return {
    device: "cpu",
    model: weak
      ? "isnet_quint8"
      : "isnet_fp16",
    weak,
  };
}

/*
 * =========================================================
 * AI SIZE
 * =========================================================
 */

function getAiSize() {
  return isWeakDevice()
    ? AI_MAX_SIZE_WEAK
    : AI_MAX_SIZE;
}

/*
 * =========================================================
 * IMAGE KEY
 * =========================================================
 *
 * Used to prevent the same image from being processed twice.
 */

function getFileKey(file) {
  if (!file) {
    return "";
  }

  return [
    file.name || "",
    file.size || 0,
    file.lastModified || 0,
    file.type || "",
  ].join("|");
}

/*
 * =========================================================
 * CREATE SMALL AI INPUT
 * =========================================================
 */

async function createAiInput(
  source,
  maxSize
) {
  if (!source) {
    throw new Error(
      "No image available."
    );
  }

  /*
   * Fast path.
   */
  if (
    typeof createImageBitmap ===
    "function"
  ) {
    let bitmap = null;

    try {
      bitmap =
        await createImageBitmap(
          source
        );

      const width =
        bitmap.width;

      const height =
        bitmap.height;

      const largest =
        Math.max(
          width,
          height
        );

      const scale =
        Math.min(
          1,
          maxSize / largest
        );

      const targetWidth =
        Math.max(
          1,
          Math.round(
            width * scale
          )
        );

      const targetHeight =
        Math.max(
          1,
          Math.round(
            height * scale
          )
        );

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        targetWidth;

      canvas.height =
        targetHeight;

      const ctx =
        canvas.getContext(
          "2d",
          {
            alpha: true,
            willReadFrequently: false,
          }
        );

      if (!ctx) {
        bitmap.close();

        throw new Error(
          "Canvas is not available."
        );
      }

      ctx.imageSmoothingEnabled =
        true;

      ctx.imageSmoothingQuality =
        "high";

      ctx.drawImage(
        bitmap,
        0,
        0,
        targetWidth,
        targetHeight
      );

      bitmap.close();

      const blob =
        await new Promise(
          (
            resolve,
            reject
          ) => {
            canvas.toBlob(
              (result) => {
                if (result) {
                  resolve(result);
                } else {
                  reject(
                    new Error(
                      "Could not create AI image."
                    )
                  );
                }
              },
              "image/png"
            );
          }
        );

      return blob;
    } catch (error) {
      if (bitmap) {
        try {
          bitmap.close();
        } catch {
          // ignore
        }
      }

      console.warn(
        "[BG] AI resize fallback:",
        error
      );
    }
  }

  /*
   * Fallback.
   */

  const image =
    await loadImage(source);

  if (!image) {
    throw new Error(
      "Could not load source image."
    );
  }

  const width =
    image.naturalWidth ||
    image.width;

  const height =
    image.naturalHeight ||
    image.height;

  const scale =
    Math.min(
      1,
      maxSize /
        Math.max(
          width,
          height
        )
    );

  const targetWidth =
    Math.max(
      1,
      Math.round(
        width * scale
      )
    );

  const targetHeight =
    Math.max(
      1,
      Math.round(
        height * scale
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    targetWidth;

  canvas.height =
    targetHeight;

  const ctx =
    canvas.getContext(
      "2d",
      {
        alpha: true,
      }
    );

  if (!ctx) {
    throw new Error(
      "Canvas context unavailable."
    );
  }

  ctx.imageSmoothingEnabled =
    true;

  ctx.imageSmoothingQuality =
    "high";

  ctx.drawImage(
    image,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return await new Promise(
    (
      resolve,
      reject
    ) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                "Could not create AI image."
              )
            );
          }
        },
        "image/png"
      );
    }
  );
}

/*
 * =========================================================
 * HOOK
 * =========================================================
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
  /*
   * -------------------------------------------------------
   * PROGRESS
   * -------------------------------------------------------
   */

  const progressFrameRef =
    useRef(null);

  const progressTargetRef =
    useRef(0);

  const displayedProgressRef =
    useRef(0);

  const operationFinishedRef =
    useRef(false);

  /*
   * -------------------------------------------------------
   * PRE-COMPUTATION CACHE
   * -------------------------------------------------------
   *
   * The important part.
   *
   * Each uploaded image gets:
   *
   * key -> Promise<Blob>
   *
   * The promise is shared between:
   *
   * background preprocessing
   * and Remove button
   */

  const preparedCacheRef =
    useRef(
      new Map()
    );

  const preparingKeyRef =
    useRef("");

  const cancelledKeyRef =
    useRef("");

  const [backgroundProgress, setBackgroundProgress] =
    useState(0);

  const [backgroundError, setBackgroundError] =
    useState("");

  /*
   * -------------------------------------------------------
   * READY STATE
   * -------------------------------------------------------
   */

  const [backgroundReady, setBackgroundReady] =
    useState(false);

  const [backgroundPreparing, setBackgroundPreparing] =
    useState(false);

  /*
   * =======================================================
   * PROGRESS ENGINE
   * =======================================================
   */

  const setProgressTarget = (
    value
  ) => {
    const safe =
      Math.min(
        99,
        Math.max(
          0,
          Number(value) || 0
        )
      );

    if (
      safe <
      progressTargetRef.current
    ) {
      return;
    }

    progressTargetRef.current =
      safe;

    if (
      progressFrameRef.current
    ) {
      return;
    }

    const frame = () => {
      if (
        operationFinishedRef.current
      ) {
        displayedProgressRef.current =
          100;

        setBackgroundProgress(
          100
        );

        progressFrameRef.current =
          null;

        return;
      }

      const current =
        displayedProgressRef.current;

      const target =
        progressTargetRef.current;

      const difference =
        target - current;

      if (
        difference <= 0.15
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

      const step =
        Math.max(
          0.8,
          difference * 0.25
        );

      const next =
        Math.min(
          target,
          current + step
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
      requestAnimationFrame(
        frame
      );
  };

  /*
   * =======================================================
   * REAL IMG.LY PROGRESS
   * =======================================================
   */

  const handleRealProgress = (
    key,
    current,
    total
  ) => {
    if (!key) {
      return;
    }

    if (
      key === "compute:decode"
    ) {
      setProgressTarget(
        current <= 0
          ? 3
          : 15
      );

      return;
    }

    if (
      key === "compute:inference"
    ) {
      setProgressTarget(
        58
      );

      return;
    }

    if (
      key === "compute:mask"
    ) {
      setProgressTarget(
        76
      );

      return;
    }

    if (
      key === "compute:encode"
    ) {
      if (
        Number(current) >=
        Number(total)
      ) {
        setProgressTarget(
          88
        );
      } else {
        setProgressTarget(
          83
        );
      }

      return;
    }

    setProgressTarget(
      Math.min(
        90,
        progressTargetRef.current +
          1
      )
    );
  };

  /*
   * =======================================================
   * PREPARE ONE IMAGE
   * =======================================================
   *
   * This is the expensive operation.
   *
   * It happens automatically when the image arrives.
   */

  const prepareBackgroundRemoval =
    async (
      file,
      key
    ) => {
      if (
        !file ||
        !key
      ) {
        return null;
      }

      /*
       * Existing completed cache.
       */

      const cached =
        preparedCacheRef.current.get(
          key
        );

      if (
        cached?.blob
      ) {
        return cached.blob;
      }

      /*
       * Existing running operation.
       *
       * Reuse it instead of starting another AI job.
       */

      if (
        cached?.promise
      ) {
        return cached.promise;
      }

      const config =
        getConfig();

      const aiSize =
        getAiSize();

      console.log(
        "[BG] PREPARE START",
        {
          model:
            config.model,
          device:
            config.device,
          aiSize,
          fileSize:
            file.size,
          fileType:
            file.type,
        }
      );

      setBackgroundPreparing(
        true
      );

      setBackgroundReady(
        false
      );

      setBackgroundError(
        ""
      );

      /*
       * Don't let old operation modify the new image.
       */

      preparingKeyRef.current =
        key;

      const promise =
        (async () => {
          /*
           * ---------------------------------------------
           * SMALL AI INPUT
           * ---------------------------------------------
           */

          setProgressTarget(
            5
          );

          const aiInput =
            await createAiInput(
              file,
              aiSize
            );

          if (
            preparingKeyRef.current !==
            key
          ) {
            throw new Error(
              "Background preparation cancelled."
            );
          }

          setProgressTarget(
            18
          );

          /*
           * ---------------------------------------------
           * AI SEGMENTATION
           * ---------------------------------------------
           */

          console.log(
            "[BG] AI segmentation..."
          );

          const mask =
            await segmentForeground(
              aiInput,
              {
                device:
                  config.device,

                model:
                  config.model,

                proxyToWorker:
                  true,

                output: {
                  format:
                    "image/png",

                  quality: 1,
                },

                progress: (
                  progressKey,
                  current,
                  total
                ) => {
                  if (
                    preparingKeyRef.current !==
                    key
                  ) {
                    return;
                  }

                  handleRealProgress(
                    progressKey,
                    current,
                    total
                  );
                },
              }
            );

          if (
            preparingKeyRef.current !==
            key
          ) {
            throw new Error(
              "Background preparation cancelled."
            );
          }

          if (!mask) {
            throw new Error(
              "AI returned an empty background mask."
            );
          }

          setProgressTarget(
            78
          );

          /*
           * ---------------------------------------------
           * APPLY MASK TO ORIGINAL
           * ---------------------------------------------
           *
           * IMPORTANT:
           *
           * This is also done NOW, not when button
           * is pressed.
           *
           * Therefore the final result itself is cached.
           */

          console.log(
            "[BG] Building final transparent image..."
          );

          const finalBlob =
            await applySegmentationMask(
              file,
              mask,
              {
                device:
                  config.device,

                model:
                  config.model,

                output: {
                  format:
                    "image/png",

                  quality: 1,
                },
              }
            );

          if (
            preparingKeyRef.current !==
            key
          ) {
            throw new Error(
              "Background preparation cancelled."
            );
          }

          if (!finalBlob) {
            throw new Error(
              "Could not create transparent image."
            );
          }

          setProgressTarget(
            95
          );

          /*
           * Cache FINAL result.
           *
           * Not just the mask.
           */

          preparedCacheRef.current.set(
            key,
            {
              blob:
                finalBlob,
              ready:
                true,
            }
          );

          setBackgroundReady(
            true
          );

          setBackgroundPreparing(
            false
          );

          /*
           * Don't force 100 here if the UI is not currently
           * showing the remove operation.
           */
          setProgressTarget(
            99
          );

          console.log(
            "[BG] PREPARE READY"
          );

          return finalBlob;
        })();

      /*
       * Cache running promise immediately.
       */

      preparedCacheRef.current.set(
        key,
        {
          promise,
          ready: false,
        }
      );

      try {
        const blob =
          await promise;

        /*
         * Replace promise cache with final blob.
         */

        preparedCacheRef.current.set(
          key,
          {
            blob,
            ready: true,
          }
        );

        return blob;
      } catch (error) {
        /*
         * Remove failed cache.
         */

        const current =
          preparedCacheRef.current.get(
            key
          );

        if (
          current?.promise ===
          promise
        ) {
          preparedCacheRef.current.delete(
            key
          );
        }

        if (
          error?.message !==
          "Background preparation cancelled."
        ) {
          console.error(
            "[BG] PREPARE FAILED:",
            error
          );

          setBackgroundError(
            error?.message ||
              "Background preparation failed."
          );
        }

        setBackgroundPreparing(
          false
        );

        throw error;
      }
    };

  /*
   * =======================================================
   * AUTOMATIC PREPARATION
   * =======================================================
   *
   * THIS RUNS WHENEVER A NEW WORKING FILE ARRIVES.
   *
   * User does NOT need to press Remove first.
   */

  useEffect(() => {
    if (!workingFile) {
      setBackgroundReady(
        false
      );

      setBackgroundPreparing(
        false
      );

      return;
    }

    const key =
      getFileKey(
        workingFile
      );

    if (!key) {
      return;
    }

    /*
     * New image.
     */

    cancelledKeyRef.current =
      preparingKeyRef.current;

    /*
     * Reset UI state for new image.
     */

    setBackgroundError(
      ""
    );

    setBackgroundReady(
      false
    );

    setBackgroundPreparing(
      true
    );

    progressTargetRef.current =
      0;

    displayedProgressRef.current =
      0;

    operationFinishedRef.current =
      false;

    setBackgroundProgress(
      0
    );

    /*
     * Start immediately.
     *
     * Don't await here because this is intentionally
     * background preprocessing.
     */

    prepareBackgroundRemoval(
      workingFile,
      key
    ).catch(
      (error) => {
        if (
          error?.message !==
          "Background preparation cancelled."
        ) {
          console.error(
            "[BG] automatic preparation:",
            error
          );
        }
      }
    );

    /*
     * Cleanup only marks old work as stale.
     */

    return () => {
      if (
        preparingKeyRef.current ===
        key
      ) {
        cancelledKeyRef.current =
          key;
      }
    };
  }, [
    workingFile,
  ]);

  /*
   * =======================================================
   * REMOVE BUTTON
   * =======================================================
   */

  async function handleBackgroundRemove() {
    if (
      !workingFile ||
      removingBackground
    ) {
      return;
    }

    const key =
      getFileKey(
        workingFile
      );

    if (!key) {
      return;
    }

    try {
      setRemovingBackground(
        true
      );

      setBackgroundError(
        ""
      );

      /*
       * Reset visual position exactly like old hook.
       */

      setImageOffset({
        x: 0,
        y: 0,
      });

      resetImageDrag();

      /*
       * ---------------------------------------------
       * CHECK CACHE
       * ---------------------------------------------
       */

      let cached =
        preparedCacheRef.current.get(
          key
        );

      let result =
        cached?.blob || null;

      /*
       * ---------------------------------------------
       * IF READY:
       *
       * THIS IS THE FAST PATH.
       *
       * No AI.
       * No segmentation.
       * No mask generation.
       *
       * Only load cached transparent result.
       * ---------------------------------------------
       */

      if (result) {
        console.log(
          "[BG] REMOVE: cached result -> FAST PATH"
        );

        setBackgroundProgress(
          96
        );
      } else {
        /*
         * -------------------------------------------
         * NOT READY YET
         * -------------------------------------------
         *
         * User clicked before background preparation
         * finished.
         *
         * Reuse the exact same promise.
         */

        console.log(
          "[BG] REMOVE: waiting for background preparation..."
        );

        setBackgroundProgress(
          Math.max(
            20,
            backgroundProgress
          )
        );

        result =
          await prepareBackgroundRemoval(
            workingFile,
            key
          );
      }

      if (!result) {
        throw new Error(
          "Background removal result is unavailable."
        );
      }

      /*
       * ---------------------------------------------
       * CREATE EDITOR FILE
       * ---------------------------------------------
       */

      const newFile =
        makePngFile(
          result,
          getBaseName(
            workingFile
          ),
          "no-background"
        );

      if (!newFile) {
        throw new Error(
          "Could not create transparent PNG."
        );
      }

      setBackgroundProgress(
        98
      );

      /*
       * ---------------------------------------------
       * LOAD FINAL IMAGE
       * ---------------------------------------------
       */

      const newImage =
        await loadImage(
          newFile
        );

      if (!newImage) {
        throw new Error(
          "Transparent image could not be loaded."
        );
      }

      /*
       * ---------------------------------------------
       * REGISTER LAYER
       * ---------------------------------------------
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
       * ---------------------------------------------
       * APPLY RESULT
       * ---------------------------------------------
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
       * ---------------------------------------------
       * COMPLETE
       * ---------------------------------------------
       */

      operationFinishedRef.current =
        true;

      progressTargetRef.current =
        100;

      displayedProgressRef.current =
        100;

      setBackgroundProgress(
        100
      );

      setBackgroundReady(
        false
      );

      setBackgroundPreparing(
        false
      );

      console.log(
        "[BG] REMOVE COMPLETE"
      );
    } catch (error) {
      console.error(
        "[BG] REMOVE FAILED:",
        error
      );

      setBackgroundError(
        error?.message ||
          "Background removal failed."
      );

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
      setRemovingBackground(
        false
      );
    }
  }

  /*
   * =======================================================
   * CLEANUP
   * =======================================================
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

      /*
       * Do not abort the actual browser AI promise here.
       *
       * We simply mark it stale so its result cannot
       * affect a newer image.
       */

      preparingKeyRef.current =
        "";
    };
  }, []);

  /*
   * =======================================================
   * RETURN
   * =======================================================
   */

  return {
    backgroundProgress,
    backgroundError,

    /*
     * Existing API.
     */
    handleBackgroundRemove,

    /*
     * New states.
     *
     * Existing UI can ignore these safely.
     */
    backgroundReady,
    backgroundPreparing,
  };
}
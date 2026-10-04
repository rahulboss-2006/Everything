import {
  useRef,
  useState,
  useEffect,
} from "react";

import {
  preload,
  removeBackground,
} from "@imgly/background-removal";

import { loadImage } from "../utils/imageEditor";

import {
  getBaseName,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";

/*
 * =========================================================
 * FAST BACKGROUND REMOVAL
 * =========================================================
 *
 * New architecture:
 *
 * IMAGE UPLOAD
 *      ↓
 * GPU / model preload
 *      ↓
 * small AI image
 *      ↓
 * direct removeBackground()
 *      ↓
 * transparent result CACHE
 *
 * REMOVE BUTTON
 *      ↓
 * cached result
 *      ↓
 * instant apply
 *
 * IMPORTANT:
 *
 * We intentionally DO NOT use:
 *
 * segmentForeground()
 *        ↓
 * applySegmentationMask()
 *
 * anymore.
 *
 * Direct removeBackground() is faster because IMG.LY can
 * run inference and apply alpha in the same pipeline.
 */

/*
 * =========================================================
 * AI SIZE
 * =========================================================
 *
 * 1024 = better edge quality
 * 768  = fallback for weak devices
 *
 * GPU devices use 1024.
 */

const AI_MAX_SIZE = 1024;
const AI_MAX_SIZE_WEAK = 768;

/*
 * =========================================================
 * DEVICE DETECTION
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

  /*
   * Do NOT consider GPU devices weak only because
   * they have 4 CPU cores.
   *
   * WebGPU can still be extremely fast.
   */

  if (
    hasWebGPU()
  ) {
    return false;
  }

  if (
    memory > 0 &&
    memory <= 4
  ) {
    return true;
  }

  if (
    cores <= 4
  ) {
    return true;
  }

  return false;
}

function hasWebGPU() {
  try {
    return (
      typeof navigator !==
        "undefined" &&
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
 */

function getConfig() {
  const gpu =
    hasWebGPU();

  const weak =
    isWeakDevice();

  /*
   * GPU
   *
   * IMG.LY recommends isnet for WebGPU.
   */

  if (gpu) {
    return {
      device: "gpu",
      model: "isnet",
      proxyToWorker: true,
      weak: false,
    };
  }

  /*
   * CPU fallback.
   */

  return {
    device: "cpu",
    model: weak
      ? "isnet_quint8"
      : "isnet_fp16",
    proxyToWorker: false,
    weak,
  };
}

/*
 * =========================================================
 * AI SIZE
 * =========================================================
 */

function getAiSize(
  config
) {
  if (
    config?.device ===
    "gpu"
  ) {
    return AI_MAX_SIZE;
  }

  return config?.weak
    ? AI_MAX_SIZE_WEAK
    : AI_MAX_SIZE;
}

/*
 * =========================================================
 * FILE KEY
 * =========================================================
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
   * Fast browser path.
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
          maxSize /
            largest
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

      /*
       * If image is already small enough,
       * avoid unnecessary resizing.
       */

      if (
        width <= maxSize &&
        height <= maxSize
      ) {
        bitmap.close();

        return source;
      }

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

      /*
       * PNG keeps transparency and gives
       * predictable AI input.
       */

      return await new Promise(
        (
          resolve,
          reject
        ) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(
                  blob
                );
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
   * Canvas fallback.
   */

  const image =
    await loadImage(
      source
    );

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

  const largest =
    Math.max(
      width,
      height
    );

  const scale =
    Math.min(
      1,
      maxSize /
        largest
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
            resolve(
              blob
            );
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
 * KEEP ORIGINAL DIMENSIONS
 * =========================================================
 *
 * AI works on a smaller image for speed.
 *
 * Then we scale the transparent result back to the
 * original dimensions.
 *
 * This keeps the editor canvas dimensions consistent.
 */

async function scaleTransparentResult(
  blob,
  originalFile
) {
  if (
    !blob ||
    !originalFile
  ) {
    throw new Error(
      "Invalid transparent result."
    );
  }

  const image =
    await loadImage(
      blob
    );

  if (!image) {
    throw new Error(
      "Could not load transparent result."
    );
  }

  /*
   * Get original dimensions.
   */

  const original =
    await loadImage(
      originalFile
    );

  if (!original) {
    throw new Error(
      "Could not load original image."
    );
  }

  const originalWidth =
    original.naturalWidth ||
    original.width;

  const originalHeight =
    original.naturalHeight ||
    original.height;

  const resultWidth =
    image.naturalWidth ||
    image.width;

  const resultHeight =
    image.naturalHeight ||
    image.height;

  /*
   * Already same dimensions.
   */

  if (
    originalWidth ===
      resultWidth &&
    originalHeight ===
      resultHeight
  ) {
    return blob;
  }

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    originalWidth;

  canvas.height =
    originalHeight;

  const ctx =
    canvas.getContext(
      "2d",
      {
        alpha: true,
        willReadFrequently: false,
      }
    );

  if (!ctx) {
    throw new Error(
      "Canvas context unavailable."
    );
  }

  ctx.clearRect(
    0,
    0,
    originalWidth,
    originalHeight
  );

  ctx.imageSmoothingEnabled =
    true;

  ctx.imageSmoothingQuality =
    "high";

  ctx.drawImage(
    image,
    0,
    0,
    originalWidth,
    originalHeight
  );

  return await new Promise(
    (
      resolve,
      reject
    ) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(
              result
            );
          } else {
            reject(
              new Error(
                "Could not create final PNG."
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
   * =======================================================
   * CACHE
   * =======================================================
   */

  const preparedCacheRef =
    useRef(
      new Map()
    );

  const preparingKeyRef =
    useRef("");

  /*
   * =======================================================
   * PREPARATION TIMER
   * =======================================================
   *
   * This is NOT AI percentage.
   *
   * It simply tells the user:
   *
   * 1s
   * 2s
   * 3s
   *
   * while preparation is happening.
   */

  const elapsedTimerRef =
    useRef(null);

  const elapsedStartRef =
    useRef(0);

  const [backgroundElapsedSeconds, setBackgroundElapsedSeconds] =
    useState(0);

  const [backgroundProgress, setBackgroundProgress] =
    useState(0);

  const [backgroundError, setBackgroundError] =
    useState("");

  const [backgroundReady, setBackgroundReady] =
    useState(false);

  const [backgroundPreparing, setBackgroundPreparing] =
    useState(false);

  /*
   * =======================================================
   * TIMER
   * =======================================================
   */

  function stopElapsedTimer() {
    if (
      elapsedTimerRef.current
    ) {
      clearInterval(
        elapsedTimerRef.current
      );

      elapsedTimerRef.current =
        null;
    }
  }

  function startElapsedTimer() {
    stopElapsedTimer();

    const started =
      performance.now();

    elapsedStartRef.current =
      started;

    /*
     * IMPORTANT:
     *
     * Start from 1.
     */

    setBackgroundElapsedSeconds(
      1
    );

    elapsedTimerRef.current =
      setInterval(
        () => {
          const elapsed =
            Math.max(
              1,
              Math.floor(
                (
                  performance.now() -
                  started
                ) /
                  1000
              ) + 1
            );

          setBackgroundElapsedSeconds(
            elapsed
          );
        },
        250
      );
  }

  /*
   * =======================================================
   * PREPARE
   * =======================================================
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
       * Completed cache.
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
       * Already running.
       */

      if (
        cached?.promise
      ) {
        return cached.promise;
      }

      const config =
        getConfig();

      const aiSize =
        getAiSize(
          config
        );

      preparingKeyRef.current =
        key;

      setBackgroundPreparing(
        true
      );

      setBackgroundReady(
        false
      );

      setBackgroundError(
        ""
      );

      startElapsedTimer();

      /*
       * Start visual loading at 1.
       */

      setBackgroundProgress(
        1
      );

      console.log(
        "[BG] PREPARE START",
        {
          device:
            config.device,
          model:
            config.model,
          aiSize,
          fileSize:
            file.size,
          fileType:
            file.type,
        }
      );

      const promise =
        (async () => {
          /*
           * =================================================
           * STEP 1
           * MODEL WARM-UP
           * =================================================
           *
           * This is important.
           *
           * The model is initialized BEFORE Remove is
           * clicked.
           */

          console.log(
            "[BG] Warming AI model..."
          );

          await preload({
            device:
              config.device,

            model:
              config.model,

            proxyToWorker:
              config.proxyToWorker,

            output: {
              format:
                "image/png",

              quality: 1,
            },
          });

          if (
            preparingKeyRef.current !==
            key
          ) {
            throw new Error(
              "Background preparation cancelled."
            );
          }

          /*
           * =================================================
           * STEP 2
           * SMALL AI INPUT
           * =================================================
           */

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

          /*
           * =================================================
           * STEP 3
           * DIRECT BACKGROUND REMOVAL
           * =================================================
           *
           * NO:
           *
           * segmentForeground()
           *
           * NO:
           *
           * applySegmentationMask()
           *
           * This is the main speed improvement.
           */

          console.log(
            "[BG] Direct GPU background removal..."
          );

          const transparentPreview =
            await removeBackground(
              aiInput,
              {
                device:
                  config.device,

                model:
                  config.model,

                proxyToWorker:
                  config.proxyToWorker,

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
                  /*
                   * We intentionally do NOT expose this
                   * as the user's main progress percentage.
                   *
                   * The user sees elapsed seconds instead.
                   */

                  if (
                    preparingKeyRef.current !==
                    key
                  ) {
                    return;
                  }

                  if (
                    progressKey ===
                    "compute:decode"
                  ) {
                    setBackgroundProgress(
                      10
                    );
                  }

                  if (
                    progressKey ===
                    "compute:inference"
                  ) {
                    setBackgroundProgress(
                      40
                    );
                  }

                  if (
                    progressKey ===
                    "compute:mask"
                  ) {
                    setBackgroundProgress(
                      75
                    );
                  }

                  if (
                    progressKey ===
                    "compute:encode"
                  ) {
                    if (
                      Number(
                        current
                      ) >=
                      Number(
                        total
                      )
                    ) {
                      setBackgroundProgress(
                        95
                      );
                    }
                  }
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

          if (
            !transparentPreview
          ) {
            throw new Error(
              "AI returned an empty result."
            );
          }

          /*
           * =================================================
           * STEP 4
           * RESTORE ORIGINAL DIMENSIONS
           * =================================================
           */

          const finalBlob =
            await scaleTransparentResult(
              transparentPreview,
              file
            );

          if (
            preparingKeyRef.current !==
            key
          ) {
            throw new Error(
              "Background preparation cancelled."
            );
          }

          if (
            !finalBlob
          ) {
            throw new Error(
              "Could not create final transparent image."
            );
          }

          /*
           * =================================================
           * CACHE FINAL RESULT
           * =================================================
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

          setBackgroundProgress(
            100
          );

          setBackgroundReady(
            true
          );

          setBackgroundPreparing(
            false
          );

          stopElapsedTimer();

          console.log(
            "[BG] READY",
            {
              seconds:
                Math.max(
                  1,
                  Math.round(
                    (
                      performance.now() -
                      elapsedStartRef.current
                    ) /
                      1000
                  )
                ),
            }
          );

          return finalBlob;
        })();

      /*
       * Save running promise immediately.
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

        preparedCacheRef.current.set(
          key,
          {
            blob,
            ready: true,
          }
        );

        return blob;
      } catch (error) {
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

        setBackgroundPreparing(
          false
        );

        stopElapsedTimer();

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

        throw error;
      }
    };

  /*
   * =======================================================
   * AUTOMATIC PREPARATION
   * =======================================================
   */

  useEffect(() => {
    if (!workingFile) {
      stopElapsedTimer();

      setBackgroundReady(
        false
      );

      setBackgroundPreparing(
        false
      );

      setBackgroundElapsedSeconds(
        0
      );

      setBackgroundProgress(
        0
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
     * Mark previous image stale.
     */

    preparingKeyRef.current =
      key;

    setBackgroundError(
      ""
    );

    setBackgroundReady(
      false
    );

    setBackgroundPreparing(
      true
    );

    /*
     * START AT 1.
     */

    setBackgroundProgress(
      1
    );

    setBackgroundElapsedSeconds(
      1
    );

    /*
     * Start immediately.
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

    return () => {
      /*
       * Don't cancel the shared promise.
       *
       * Just make old result stale.
       */

      if (
        preparingKeyRef.current ===
        key
      ) {
        preparingKeyRef.current =
          "";
      }

      stopElapsedTimer();
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
       * Keep existing editor behavior.
       */

      setImageOffset({
        x: 0,
        y: 0,
      });

      resetImageDrag();

      /*
       * ===================================================
       * FAST CACHE CHECK
       * ===================================================
       */

      let cached =
        preparedCacheRef.current.get(
          key
        );

      let result =
        cached?.blob ||
        null;

      /*
       * ===================================================
       * READY = INSTANT PATH
       * ===================================================
       */

      if (result) {
        console.log(
          "[BG] REMOVE -> CACHE HIT"
        );
      } else {
        /*
         * User clicked before preprocessing finished.
         *
         * IMPORTANT:
         *
         * We DO NOT start another AI operation.
         *
         * We simply wait for the existing promise.
         */

        console.log(
          "[BG] REMOVE -> WAITING FOR EXISTING PREPARATION"
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
       * ===================================================
       * CREATE PNG FILE
       * ===================================================
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

      /*
       * ===================================================
       * LOAD IMAGE
       * ===================================================
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
       * ===================================================
       * REGISTER LAYER
       * ===================================================
       */

      layers.addToolLayer({
        type:
          "background",

        name:
          "Background Removed",

        detail:
          "AI background removal",

        beforeFile:
          workingFile,

        summary:
          "Background removed",
      });

      /*
       * ===================================================
       * APPLY
       * ===================================================
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
       * ===================================================
       * COMPLETE
       * ===================================================
       */

      setBackgroundProgress(
        100
      );

      setBackgroundReady(
        false
      );

      setBackgroundPreparing(
        false
      );

      stopElapsedTimer();

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
      stopElapsedTimer();

      preparingKeyRef.current =
        "";

      /*
       * Keep cache alive during component lifetime.
       *
       * Browser AI promise is intentionally not aborted.
       */
    };
  }, []);

  /*
   * =======================================================
   * RETURN
   * =======================================================
   */

  return {
    /*
     * Existing API
     */
    backgroundProgress,

    backgroundError,

    handleBackgroundRemove,

    /*
     * New fast-state API
     */
    backgroundReady,

    backgroundPreparing,

    /*
     * Actual elapsed preparation time.
     *
     * Starts from 1.
     */
    backgroundElapsedSeconds,
  };
}
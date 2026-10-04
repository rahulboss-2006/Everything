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
 * FAST BACKGROUND REMOVAL ENGINE
 * =========================================================
 *
 * Flow:
 *
 * APP START
 *    ↓
 * MODEL WARM-UP
 *
 * IMAGE UPLOAD
 *    ↓
 * SMALL AI INPUT
 *    ↓
 * AI INFERENCE
 *    ↓
 * TRANSPARENT RESULT
 *    ↓
 * ORIGINAL SIZE RESTORE
 *    ↓
 * PNG CACHE
 *
 * REMOVE CLICK
 *    ↓
 * CACHE HIT
 *    ↓
 * FAST APPLY
 *
 * Progress:
 *
 * 1% → 2% → 3% → ... → 100%
 *
 * No seconds counter.
 */

/*
 * =========================================================
 * SPEED SETTINGS
 * =========================================================
 */

const AI_MAX_SIZE_GPU = 768;
const AI_MAX_SIZE_CPU = 768;
const AI_MAX_SIZE_WEAK = 640;

/*
 * =========================================================
 * GLOBAL MODEL WARM-UP
 * =========================================================
 */

let globalWarmupPromise = null;
let globalWarmupConfigKey = "";

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
  if (hasWebGPU()) {
    return false;
  }

  const memory = getMemory();
  const cores = getCores();

  if (
    memory > 0 &&
    memory <= 4
  ) {
    return true;
  }

  if (
    cores > 0 &&
    cores <= 4
  ) {
    return true;
  }

  return false;
}

function getConfig() {
  const gpu = hasWebGPU();
  const weak = isWeakDevice();

  if (gpu) {
    return {
      device: "gpu",
      model: "isnet",
      proxyToWorker: true,
      weak: false,
    };
  }

  return {
    device: "cpu",
    model: weak
      ? "isnet_quint8"
      : "isnet_fp16",
    proxyToWorker: false,
    weak,
  };
}

function getConfigKey(config) {
  return [
    config.device,
    config.model,
    config.proxyToWorker,
  ].join("|");
}

async function warmupModel(
  config = getConfig()
) {
  const key =
    getConfigKey(config);

  if (
    globalWarmupPromise &&
    globalWarmupConfigKey === key
  ) {
    return globalWarmupPromise;
  }

  globalWarmupConfigKey = key;

  console.log(
    "[BG] GLOBAL MODEL WARMUP START",
    {
      device: config.device,
      model: config.model,
    }
  );

  globalWarmupPromise =
    preload({
      device: config.device,

      model: config.model,

      proxyToWorker:
        config.proxyToWorker,

      output: {
        format: "image/png",
        quality: 1,
      },
    })
      .then((result) => {
        console.log(
          "[BG] GLOBAL MODEL READY",
          {
            device:
              config.device,
            model:
              config.model,
          }
        );

        return result;
      })
      .catch((error) => {
        globalWarmupPromise = null;
        globalWarmupConfigKey = "";

        console.error(
          "[BG] GLOBAL MODEL WARMUP FAILED:",
          error
        );

        throw error;
      });

  return globalWarmupPromise;
}

/*
 * =========================================================
 * START GLOBAL WARM-UP
 * =========================================================
 */

if (
  typeof window !== "undefined"
) {
  const start = () => {
    warmupModel().catch(() => {
      // Preparation will retry later.
    });
  };

  if (
    typeof window.requestIdleCallback ===
    "function"
  ) {
    window.requestIdleCallback(
      start,
      {
        timeout: 1200,
      }
    );
  } else {
    window.setTimeout(
      start,
      250
    );
  }
}

/*
 * =========================================================
 * AI SIZE
 * =========================================================
 */

function getAiSize(config) {
  if (
    config?.device === "gpu"
  ) {
    return AI_MAX_SIZE_GPU;
  }

  if (config?.weak) {
    return AI_MAX_SIZE_WEAK;
  }

  return AI_MAX_SIZE_CPU;
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
   * Browser fast path.
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

      /*
       * No resize required.
       */
      if (
        width <= maxSize &&
        height <= maxSize
      ) {
        bitmap.close();

        return source;
      }

      const scale =
        maxSize / largest;

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
    } catch (error) {
      if (bitmap) {
        try {
          bitmap.close();
        } catch {
          // ignore
        }
      }

      console.warn(
        "[BG] createAiInput fallback:",
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
 * ORIGINAL DIMENSION RESTORE
 * =========================================================
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
            resolve(result);
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
   * PROGRESS
   * =======================================================
   */

  const progressTimerRef =
    useRef(null);

  const progressTargetRef =
    useRef(1);

  const progressValueRef =
    useRef(1);

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
   * SMOOTH PERCENT PROGRESS
   * =======================================================
   *
   * The actual engine can sometimes jump:
   *
   * 10 → 50 → 90
   *
   * Instead of making the UI jump, we smoothly move:
   *
   * 10 → 11 → 12 → ... → 50
   *
   * This keeps the progress visually natural.
   *
   * IMPORTANT:
   * We never fake 100%.
   *
   * 100% is only set after the complete result is ready.
   */

  function stopProgressAnimation() {
    if (
      progressTimerRef.current
    ) {
      clearInterval(
        progressTimerRef.current
      );

      progressTimerRef.current =
        null;
    }
  }

  function setProgressTarget(
    value
  ) {
    const next =
      Math.max(
        1,
        Math.min(
          99,
          Math.round(
            Number(value) || 1
          )
        )
      );

    progressTargetRef.current =
      Math.max(
        progressTargetRef.current,
        next
      );

    if (
      !progressTimerRef.current
    ) {
      progressTimerRef.current =
        setInterval(
          () => {
            const current =
              progressValueRef.current;

            const target =
              progressTargetRef.current;

            if (
              current >= target
            ) {
              return;
            }

            /*
             * Move only 1% at a time.
             */
            const next =
              Math.min(
                target,
                current + 1
              );

            progressValueRef.current =
              next;

            setBackgroundProgress(
              next
            );
          },
          45
        );
    }
  }

  function resetProgress(
    value = 1
  ) {
    stopProgressAnimation();

    const next =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            Number(value) || 0
          )
        )
      );

    progressValueRef.current =
      next;

    progressTargetRef.current =
      next;

    setBackgroundProgress(
      next
    );
  }

  function completeProgress() {
    stopProgressAnimation();

    progressValueRef.current =
      100;

    progressTargetRef.current =
      100;

    setBackgroundProgress(
      100
    );
  }

  /*
   * =======================================================
   * PREPARE BACKGROUND
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
       * Cache hit.
       */

      const cached =
        preparedCacheRef.current.get(
          key
        );

      if (
        cached?.blob &&
        cached?.file &&
        cached?.image
      ) {
        return cached;
      }

      /*
       * Existing promise.
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

      resetProgress(1);

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
           * MODEL
           * =================================================
           */

          console.log(
            "[BG] WAITING FOR MODEL..."
          );

          setProgressTarget(5);

          await warmupModel(
            config
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
           * STEP 2
           * CREATE AI INPUT
           * =================================================
           */

          setProgressTarget(12);

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

          setProgressTarget(18);

          /*
           * =================================================
           * STEP 3
           * AI INFERENCE
           * =================================================
           */

          console.log(
            "[BG] AI INFERENCE START",
            {
              device:
                config.device,

              model:
                config.model,

              aiSize,
            }
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
                  progressKey
                ) => {
                  if (
                    preparingKeyRef.current !==
                    key
                  ) {
                    return;
                  }

                  /*
                   * Real engine stages.
                   *
                   * We use ranges instead of jumping
                   * directly to the final number.
                   */

                  if (
                    progressKey ===
                    "compute:decode"
                  ) {
                    setProgressTarget(
                      25
                    );
                  } else if (
                    progressKey ===
                    "compute:inference"
                  ) {
                    setProgressTarget(
                      65
                    );
                  } else if (
                    progressKey ===
                    "compute:mask"
                  ) {
                    setProgressTarget(
                      82
                    );
                  } else if (
                    progressKey ===
                    "compute:encode"
                  ) {
                    setProgressTarget(
                      94
                    );
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

          console.log(
            "[BG] AI INFERENCE COMPLETE"
          );

          /*
           * AI finished.
           *
           * Keep UI below 100 while final PNG is
           * being prepared.
           */

          setProgressTarget(
            95
          );

          /*
           * =================================================
           * STEP 4
           * RESTORE ORIGINAL SIZE
           * =================================================
           */

          const finalBlob =
            await scaleTransparentResult(
              transparentPreview,
              file
            );

          if (
            !finalBlob
          ) {
            throw new Error(
              "Could not create final transparent image."
            );
          }

          setProgressTarget(
            97
          );

          /*
           * =================================================
           * STEP 5
           * CREATE FILE
           * =================================================
           */

          const finalFile =
            makePngFile(
              finalBlob,
              getBaseName(
                file
              ),
              "no-background"
            );

          if (
            !finalFile
          ) {
            throw new Error(
              "Could not create transparent PNG."
            );
          }

          setProgressTarget(
            98
          );

          /*
           * =================================================
           * STEP 6
           * LOAD IMAGE
           * =================================================
           */

          const finalImage =
            await loadImage(
              finalFile
            );

          if (
            !finalImage
          ) {
            throw new Error(
              "Transparent image could not be loaded."
            );
          }

          /*
           * =================================================
           * FINAL CACHE
           * =================================================
           */

          const result = {
            blob:
              finalBlob,

            file:
              finalFile,

            image:
              finalImage,

            ready:
              true,
          };

          preparedCacheRef.current.set(
            key,
            result
          );

          /*
           * ONLY NOW = 100%
           */

          completeProgress();

          setBackgroundReady(
            true
          );

          setBackgroundPreparing(
            false
          );

          console.log(
            "[BG] READY",
            {
              device:
                config.device,

              model:
                config.model,

              aiSize,
            }
          );

          return result;
        })();

      /*
       * Store promise immediately.
       */

      preparedCacheRef.current.set(
        key,
        {
          promise,
          ready: false,
        }
      );

      try {
        return await promise;
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

        stopProgressAnimation();

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
      stopProgressAnimation();

      setBackgroundReady(
        false
      );

      setBackgroundPreparing(
        false
      );

      resetProgress(0);

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
     * Current image becomes active.
     */

    preparingKeyRef.current =
      key;

    setBackgroundError(
      ""
    );

    /*
     * Cache already ready.
     */

    const cached =
      preparedCacheRef.current.get(
        key
      );

    if (
      cached?.ready &&
      cached?.file &&
      cached?.image
    ) {
      setBackgroundReady(
        true
      );

      setBackgroundPreparing(
        false
      );

      completeProgress();

      return;
    }

    /*
     * Start preparation.
     */

    setBackgroundReady(
      false
    );

    setBackgroundPreparing(
      true
    );

    resetProgress(1);

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
       * Make old image stale.
       */

      if (
        preparingKeyRef.current ===
        key
      ) {
        preparingKeyRef.current =
          "";
      }

      stopProgressAnimation();
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

      setImageOffset({
        x: 0,
        y: 0,
      });

      resetImageDrag();

      /*
       * ===================================================
       * CACHE HIT
       * ===================================================
       */

      let cached =
        preparedCacheRef.current.get(
          key
        );

      let result =
        cached?.ready
          ? cached
          : null;

      if (
        result?.file &&
        result?.image
      ) {
        console.log(
          "[BG] REMOVE -> INSTANT CACHE HIT"
        );
      } else {
        /*
         * User clicked before preparation finished.
         *
         * Wait for the existing preparation.
         * No second AI inference.
         */

        console.log(
          "[BG] REMOVE -> WAITING FOR PREPARATION"
        );

        result =
          await prepareBackgroundRemoval(
            workingFile,
            key
          );
      }

      if (
        !result?.file ||
        !result?.image
      ) {
        throw new Error(
          "Background removal result is unavailable."
        );
      }

      /*
       * ===================================================
       * APPLY CACHED RESULT
       * ===================================================
       */

      const newFile =
        result.file;

      const newImage =
        result.image;

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

      completeProgress();

      setBackgroundReady(
        false
      );

      setBackgroundPreparing(
        false
      );

      console.log(
        "[BG] REMOVE COMPLETE - CACHE APPLY"
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
      stopProgressAnimation();

      preparingKeyRef.current =
        "";
    };
  }, []);

  /*
   * =======================================================
   * RETURN
   * =======================================================
   *
   * backgroundElapsedSeconds is kept as an alias for
   * compatibility with existing UI code.
   *
   * IMPORTANT:
   * It now contains PERCENTAGE, not seconds.
   *
   * So old UI using:
   *
   * backgroundElapsedSeconds
   *
   * will receive:
   *
   * 1, 2, 3 ... 100
   *
   * instead of:
   *
   * 1s, 2s, 3s...
   */

  return {
    backgroundProgress,

    backgroundError,

    handleBackgroundRemove,

    backgroundReady,

    backgroundPreparing,

    backgroundElapsedSeconds:
      backgroundProgress,
  };
}
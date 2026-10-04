
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
 * BACKGROUND REMOVAL ENGINE
 * =========================================================
 *
 * GPU:
 *   Try WebGPU first.
 *
 * If WebGPU session creation fails:
 *   Automatically fall back to CPU/WASM.
 *
 * Progress:
 *   1% → 2% → ... → 100%
 *
 * No seconds counter.
 */

const AI_MAX_SIZE_GPU = 768;
const AI_MAX_SIZE_CPU = 768;
const AI_MAX_SIZE_WEAK = 640;

/*
 * =========================================================
 * GLOBAL MODEL STATE
 * =========================================================
 */

let globalWarmupPromise = null;
let globalWarmupConfigKey = "";
let globalWorkingConfig = null;

/*
 * =========================================================
 * SAFE BROWSER CHECKS
 * =========================================================
 */

function isBrowser() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof navigator !== "undefined"
  );
}

function hasWebGPU() {
  if (!isBrowser()) {
    return false;
  }

  try {
    return !!navigator.gpu;
  } catch {
    return false;
  }
}

function getMemory() {
  if (!isBrowser()) {
    return 0;
  }

  try {
    return Number(
      navigator.deviceMemory || 0
    );
  } catch {
    return 0;
  }
}

function getCores() {
  if (!isBrowser()) {
    return 4;
  }

  try {
    return Number(
      navigator.hardwareConcurrency || 4
    );
  } catch {
    return 4;
  }
}

function isWeakDevice() {
  if (!isBrowser()) {
    return false;
  }

  const memory =
    getMemory();

  const cores =
    getCores();

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

/*
 * =========================================================
 * CONFIG
 * =========================================================
 */

function getCpuConfig() {
  const weak =
    isWeakDevice();

  return {
    device: "cpu",

    model: weak
      ? "isnet_quint8"
      : "isnet_fp16",

    proxyToWorker: false,

    weak,
  };
}

function getGpuConfig() {
  return {
    device: "gpu",

    model: "isnet",

    proxyToWorker: true,

    weak: false,
  };
}

function getPreferredConfig() {
  if (
    hasWebGPU()
  ) {
    return getGpuConfig();
  }

  return getCpuConfig();
}

function getConfigKey(config) {
  return [
    config.device,
    config.model,
    config.proxyToWorker,
  ].join("|");
}

/*
 * =========================================================
 * MODEL WARM-UP
 * =========================================================
 *
 * IMPORTANT:
 *
 * WebGPU may exist as navigator.gpu but still fail to create
 * an ONNX session.
 *
 * Therefore:
 *
 * GPU attempt
 *    ↓ fail
 * CPU/WASM fallback
 */

async function warmupModel(
  preferredConfig =
    getPreferredConfig()
) {
  if (!isBrowser()) {
    throw new Error(
      "Background removal is only available in the browser."
    );
  }

  /*
   * If a working configuration has already been discovered,
   * reuse it.
   */

  if (
    globalWarmupPromise &&
    globalWarmupConfigKey
  ) {
    return globalWarmupPromise;
  }

  const firstConfig =
    preferredConfig;

  const firstKey =
    getConfigKey(
      firstConfig
    );

  /*
   * -------------------------------------------------------
   * GPU ATTEMPT
   * -------------------------------------------------------
   */

  globalWarmupConfigKey =
    firstKey;

  globalWarmupPromise =
    (async () => {
      try {
        console.log(
          "[BG] MODEL WARMUP START",
          {
            device:
              firstConfig.device,

            model:
              firstConfig.model,
          }
        );

        await preload({
          device:
            firstConfig.device,

          model:
            firstConfig.model,

          proxyToWorker:
            firstConfig.proxyToWorker,

          output: {
            format:
              "image/png",

            quality: 1,
          },
        });

        /*
         * GPU/CPU successfully initialized.
         */

        globalWorkingConfig =
          firstConfig;

        console.log(
          "[BG] MODEL READY",
          {
            device:
              firstConfig.device,

            model:
              firstConfig.model,
          }
        );

        return firstConfig;
      } catch (firstError) {
        console.error(
          "[BG] PRIMARY MODEL FAILED:",
          firstError
        );

        /*
         * ---------------------------------------------------
         * GPU → CPU FALLBACK
         * ---------------------------------------------------
         */

        if (
          firstConfig.device !==
          "gpu"
        ) {
          throw firstError;
        }

        const cpuConfig =
          getCpuConfig();

        const cpuKey =
          getConfigKey(
            cpuConfig
          );

        globalWarmupConfigKey =
          cpuKey;

        console.warn(
          "[BG] WEBGPU FAILED - FALLING BACK TO CPU/WASM",
          {
            model:
              cpuConfig.model,
          }
        );

        try {
          await preload({
            device:
              cpuConfig.device,

            model:
              cpuConfig.model,

            proxyToWorker:
              cpuConfig.proxyToWorker,

            output: {
              format:
                "image/png",

              quality: 1,
            },
          });

          globalWorkingConfig =
            cpuConfig;

          console.log(
            "[BG] CPU/WASM MODEL READY",
            {
              device:
                cpuConfig.device,

              model:
                cpuConfig.model,
            }
          );

          return cpuConfig;
        } catch (cpuError) {
          console.error(
            "[BG] CPU/WASM FALLBACK FAILED:",
            cpuError
          );

          throw cpuError;
        }
      }
    })();

  try {
    return await globalWarmupPromise;
  } catch (error) {
    globalWarmupPromise =
      null;

    globalWarmupConfigKey =
      "";

    globalWorkingConfig =
      null;

    throw error;
  }
}

/*
 * =========================================================
 * SAFE GLOBAL WARM-UP
 * =========================================================
 *
 * Never execute browser work while the module is being
 * evaluated outside the browser.
 */

if (
  typeof window !== "undefined" &&
  typeof document !== "undefined"
) {
  const startWarmup =
    () => {
      warmupModel().catch(
        () => {
          /*
           * Actual preparation will retry.
           */
        }
      );
    };

  if (
    typeof window.requestIdleCallback ===
    "function"
  ) {
    window.requestIdleCallback(
      startWarmup,
      {
        timeout: 1200,
      }
    );
  } else {
    window.setTimeout(
      startWarmup,
      500
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
    config?.device ===
    "gpu"
  ) {
    return AI_MAX_SIZE_GPU;
  }

  if (
    config?.weak
  ) {
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
 * AI INPUT
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

  if (
    !isBrowser()
  ) {
    throw new Error(
      "Image processing requires a browser environment."
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
        maxSize /
        largest;

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
 * RESTORE ORIGINAL SIZE
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
   * PROGRESS FUNCTIONS
   * =======================================================
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

            const nextValue =
              Math.min(
                target,
                current + 1
              );

            progressValueRef.current =
              nextValue;

            setBackgroundProgress(
              nextValue
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
   * PREPARE BACKGROUND REMOVAL
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

      const promise =
        (async () => {
          /*
           * =================================================
           * STEP 1 — MODEL
           * =================================================
           */

          console.log(
            "[BG] WAITING FOR MODEL..."
          );

          setProgressTarget(
            5
          );

          /*
           * Use already-discovered working config if
           * available. Otherwise perform GPU → CPU fallback.
           */

          const config =
            globalWorkingConfig ||
            getPreferredConfig();

          const readyConfig =
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

          console.log(
            "[BG] USING ENGINE",
            {
              device:
                readyConfig.device,

              model:
                readyConfig.model,
            }
          );

          setProgressTarget(
            12
          );

          /*
           * =================================================
           * STEP 2 — AI INPUT
           * =================================================
           */

          const aiSize =
            getAiSize(
              readyConfig
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
           * =================================================
           * STEP 3 — AI
           * =================================================
           */

          console.log(
            "[BG] AI INFERENCE START",
            {
              device:
                readyConfig.device,

              model:
                readyConfig.model,

              aiSize,
            }
          );

          let transparentPreview;

          try {
            transparentPreview =
              await removeBackground(
                aiInput,
                {
                  device:
                    readyConfig.device,

                  model:
                    readyConfig.model,

                  proxyToWorker:
                    readyConfig.proxyToWorker,

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
          } catch (aiError) {
            /*
             * ------------------------------------------------
             * EXTRA GPU FALLBACK
             * ------------------------------------------------
             *
             * If the GPU session fails here even though
             * preload succeeded, retry the same image with
             * CPU/WASM.
             */

            if (
              readyConfig.device !==
              "gpu"
            ) {
              throw aiError;
            }

            console.warn(
              "[BG] GPU INFERENCE FAILED - RETRYING CPU/WASM",
              aiError
            );

            const cpuConfig =
              getCpuConfig();

            await warmupModel(
              cpuConfig
            );

            globalWorkingConfig =
              cpuConfig;

            setProgressTarget(
              20
            );

            transparentPreview =
              await removeBackground(
                aiInput,
                {
                  device:
                    cpuConfig.device,

                  model:
                    cpuConfig.model,

                  proxyToWorker:
                    cpuConfig.proxyToWorker,

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
          }

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

          setProgressTarget(
            95
          );

          /*
           * =================================================
           * STEP 4 — RESTORE SIZE
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
           * STEP 5 — PNG FILE
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
           * STEP 6 — IMAGE
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
                globalWorkingConfig?.device,

              model:
                globalWorkingConfig?.model,

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

    preparingKeyRef.current =
      key;

    setBackgroundError(
      ""
    );

    /*
     * Cache hit.
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
       * Cache hit.
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

      const newFile =
        result.file;

      const newImage =
        result.image;

      /*
       * ===================================================
       * LAYER
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

      completeProgress();

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
   */

  return {
    backgroundProgress,

    backgroundError,

    handleBackgroundRemove,

    backgroundReady,

    backgroundPreparing,

    /*
     * Compatibility:
     *
     * Existing UI may still read this old property.
     *
     * It now returns percentage, NOT seconds.
     */

    backgroundElapsedSeconds:
      backgroundProgress,
  };
}


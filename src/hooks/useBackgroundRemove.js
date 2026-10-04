import {
  useRef,
  useState,
  useEffect,
} from "react";

import { loadImage } from "../utils/imageEditor";

import {
  getBaseName,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";

import {
  getPreparedBackground,
  savePreparedBackground,
} from "../utils/editorTools/backgroundCache";

/*
 * =========================================================
 * IMG.LY MODULE
 * =========================================================
 */

let backgroundRemovalModulePromise = null;

async function getBackgroundRemovalModule() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    throw new Error(
      "Background removal is only available in the browser."
    );
  }

  if (!backgroundRemovalModulePromise) {
    // Share one import across calls, but allow a retry if the chunk fails
    // to download on a slow or unstable connection.
    backgroundRemovalModulePromise = import("@imgly/background-removal").catch(
      (error) => {
        backgroundRemovalModulePromise = null;
        throw error;
      }
    );
  }

  return backgroundRemovalModulePromise;
}

/*
 * =========================================================
 * ENGINE CONFIG
 * =========================================================
 */

const AI_MAX_SIZE_CPU = 640;
const AI_MAX_SIZE_WEAK = 512;

let globalWorkingConfig = null;

/*
 * =========================================================
 * VISIBLE PROGRESS
 * =========================================================
 *
 * IMPORTANT:
 *
 * This progress is completely independent from IMG.LY.
 *
 * It always visually counts:
 *
 * 1 -> 2 -> 3 -> ... -> 100
 *
 * in approximately 2 seconds.
 *
 * Even if AI finishes in 200ms,
 * the visual loader continues until 100%.
 * =========================================================
 */

const VISIBLE_PROGRESS_DURATION = 1000;

/*
 * =========================================================
 * BROWSER HELPERS
 * =========================================================
 */

function isBrowser() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof navigator !== "undefined"
  );
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

/*
 * =========================================================
 * CPU CONFIG
 * =========================================================
 */

function getCpuConfig() {
  const weak =
    isWeakDevice();

  return {
    device: "cpu",

    // Use the smaller quantized model on every CPU device. It reduces the
    // first model download for low-bandwidth users and is suitable for CPU.
    model: "isnet_quint8",

    proxyToWorker: true,

    weak,
  };
}

function getAiSize(config) {
  return config?.weak
    ? AI_MAX_SIZE_WEAK
    : AI_MAX_SIZE_CPU;
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
 * CREATE AI INPUT
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

  if (!isBrowser()) {
    throw new Error(
      "Image processing requires a browser environment."
    );
  }

  /*
   * Fast createImageBitmap path
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
        "[BG] createImageBitmap fallback:",
        error
      );
    }
  }

  /*
   * Canvas fallback
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
        willReadFrequently: false,
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
 * ENGINE PROGRESS
 * =========================================================
 *
 * Engine progress is intentionally NOT connected to
 * visible progress.
 * =========================================================
 */

function getProgressFromEngine(
  key,
  current,
  total
) {
  if (
    typeof current === "number" &&
    typeof total === "number" &&
    total > 0
  ) {
    const ratio =
      Math.max(
        0,
        Math.min(
          1,
          current / total
        )
      );

    if (
      key === "fetch" ||
      key === "download" ||
      key === "model"
    ) {
      return Math.round(
        5 +
          ratio * 25
      );
    }
  }

  const normalized =
    String(
      key || ""
    ).toLowerCase();

  if (
    normalized.includes(
      "decode"
    )
  ) {
    return 25;
  }

  if (
    normalized.includes(
      "inference"
    ) ||
    normalized.includes(
      "segment"
    ) ||
    normalized.includes(
      "compute"
    )
  ) {
    return 65;
  }

  if (
    normalized.includes(
      "mask"
    )
  ) {
    return 82;
  }

  if (
    normalized.includes(
      "encode"
    )
  ) {
    return 94;
  }

  return null;
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
   * MEMORY CACHE
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
   * RAF PROGRESS SYSTEM
   * =======================================================
   */

  const progressAnimationFrameRef =
    useRef(null);

  const progressStartTimeRef =
    useRef(0);

  const progressAnimationActiveRef =
    useRef(false);

  const progressTargetRef =
    useRef(0);

  const progressValueRef =
    useRef(0);

  /*
   * Loader timer
   */
  const removeLoaderTimerRef =
    useRef(null);

  /*
   * =======================================================
   * OPERATION OWNERSHIP
   * =======================================================
   */

  const removeOperationActiveRef =
    useRef(false);

  /*
   * =======================================================
   * STATE
   * =======================================================
   */

  const [
    backgroundProgress,
    setBackgroundProgress,
  ] = useState(0);

  const [
    backgroundError,
    setBackgroundError,
  ] = useState("");

  const [
    backgroundReady,
    setBackgroundReady,
  ] = useState(false);

  const [
    backgroundPreparing,
    setBackgroundPreparing,
  ] = useState(false);

  const [
    backgroundRemoved,
    setBackgroundRemoved,
  ] = useState(false);

  const backgroundRemovedOutputKeyRef =
    useRef("");

  const backgroundRemoveFailedRef =
    useRef(false);

  /*
   * =======================================================
   * TIMER CLEANUP
   * =======================================================
   */

  function clearRemoveLoaderTimer() {
    if (
      removeLoaderTimerRef.current
    ) {
      clearTimeout(
        removeLoaderTimerRef.current
      );

      removeLoaderTimerRef.current =
        null;
    }
  }

  /*
   * =======================================================
   * STOP RAF
   * =======================================================
   */

  function stopProgressAnimation() {
    progressAnimationActiveRef.current =
      false;

    if (
      progressAnimationFrameRef.current !==
      null
    ) {
      cancelAnimationFrame(
        progressAnimationFrameRef.current
      );

      progressAnimationFrameRef.current =
        null;
    }
  }

  /*
   * =======================================================
   * START VISIBLE PROGRESS
   * =======================================================
   */

  function startProgressAnimation() {
  stopProgressAnimation();

  progressAnimationActiveRef.current = true;
  progressValueRef.current = 1;
  progressTargetRef.current = 100;

  setBackgroundProgress(1);

  const startedAt = performance.now();

  const animate = () => {
    if (!progressAnimationActiveRef.current) {
      return;
    }

    const elapsed = performance.now() - startedAt;

    // Always calculate from real elapsed time.
    // So timer delay can never make the progress permanently stuck.
    const ratio = Math.min(
      1,
      elapsed / VISIBLE_PROGRESS_DURATION
    );

    const nextValue = Math.min(
      100,
      Math.max(
        1,
        Math.floor(1 + ratio * 99)
      )
    );

    if (nextValue !== progressValueRef.current) {
      progressValueRef.current = nextValue;
      setBackgroundProgress(nextValue);
    }

    if (ratio >= 1) {
      progressValueRef.current = 100;
      progressTargetRef.current = 100;
      setBackgroundProgress(100);

      progressAnimationActiveRef.current = false;
      progressAnimationFrameRef.current = null;

      return;
    }

    progressAnimationFrameRef.current = setTimeout(
      animate,
      10
    );
  };

  animate();
}

  /*
   * =======================================================
   * ENGINE PROGRESS TARGET
   * =======================================================
   */

  function setProgressTarget() {
    /*
     * Deliberately ignored.
     */
    return;
  }

  /*
   * =======================================================
   * RESET PROGRESS
   * =======================================================
   */

  function resetProgress(
    value = 0
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

  /*
   * =======================================================
   * COMPLETE PROGRESS
   * =======================================================
   */

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
       * ===================================================
       * MEMORY CACHE
       * ===================================================
       */

      const memoryCached =
        preparedCacheRef.current.get(
          key
        );

      if (
        memoryCached?.ready &&
        memoryCached?.file &&
        memoryCached?.image
      ) {
        console.log(
          "[BG] MEMORY CACHE HIT"
        );

        return memoryCached;
      }

      /*
       * ===================================================
       * EXISTING PROMISE
       * ===================================================
       */

      if (
        memoryCached?.promise
      ) {
        console.log(
          "[BG] EXISTING PREPARATION PROMISE"
        );

        return memoryCached.promise;
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

      if (
        !removeOperationActiveRef.current
      ) {
        resetProgress(
          1
        );
      }

      const promise =
        (async () => {
          /*
           * =================================================
           * INDEXEDDB CACHE
           * =================================================
           */

          console.log(
            "[BG] CHECKING INDEXEDDB CACHE..."
          );

          setProgressTarget(
            3
          );

          let indexedDbBlob =
            null;

          try {
            indexedDbBlob =
              await getPreparedBackground(
                file
              );
          } catch (
            cacheError
          ) {
            console.warn(
              "[BG] IndexedDB cache read failed:",
              cacheError
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

          /*
           * =================================================
           * INDEXEDDB HIT
           * =================================================
           */

          if (
            indexedDbBlob
          ) {
            console.log(
              "[BG] INDEXEDDB CACHE HIT"
            );

            setProgressTarget(
              90
            );

            const finalFile =
              makePngFile(
                indexedDbBlob,
                getBaseName(
                  file
                ),
                "no-background"
              );

            if (!finalFile) {
              throw new Error(
                "Cached transparent PNG could not be prepared."
              );
            }

            const finalImage =
              await loadImage(
                finalFile
              );

            if (!finalImage) {
              throw new Error(
                "Cached transparent image could not be loaded."
              );
            }

            const cachedResult = {
              blob:
                indexedDbBlob,

              file:
                finalFile,

              image:
                finalImage,

              ready:
                true,
            };

            preparedCacheRef.current.set(
              key,
              cachedResult
            );

            if (
              !removeOperationActiveRef.current
            ) {
              completeProgress();
            }

            setBackgroundReady(
              true
            );

            setBackgroundPreparing(
              false
            );

            return cachedResult;
          }

          /*
           * =================================================
           * LOAD IMG.LY
           * =================================================
           */

          console.log(
            "[BG] LOADING ENGINE..."
          );

          setProgressTarget(
            5
          );

          const {
            removeBackground,
          } =
            await getBackgroundRemovalModule();

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
           * CONFIG
           * =================================================
           */

          const config =
            globalWorkingConfig ||
            getCpuConfig();

          globalWorkingConfig =
            config;

          console.log(
            "[BG] USING ENGINE",
            {
              device:
                config.device,

              model:
                config.model,

              proxyToWorker:
                config.proxyToWorker,

              weak:
                config.weak,
            }
          );

          setProgressTarget(
            10
          );

          /*
           * =================================================
           * AI INPUT
           * =================================================
           */

          const aiSize =
            getAiSize(
              config
            );

          console.log(
            "[BG] CREATING AI INPUT",
            {
              aiSize,
            }
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
           * AI INFERENCE
           * =================================================
           */

          let transparentPreview;

          try {
            console.log(
              "[BG] BEFORE removeBackground"
            );

            transparentPreview =
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
                    console.log(
                      "[BG] ENGINE:",
                      progressKey,
                      current,
                      "/",
                      total
                    );

                    /*
                     * Intentionally ignored.
                     */
                    getProgressFromEngine(
                      progressKey,
                      current,
                      total
                    );
                  },
                }
              );

            console.log(
              "[BG] AFTER removeBackground"
            );
          } catch (
            error
          ) {
            console.error(
              "[BG] removeBackground FAILED:",
              error
            );

            throw error;
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

          /*
           * =================================================
           * RESTORE ORIGINAL SIZE
           * =================================================
           */

          const finalBlob =
            await scaleTransparentResult(
              transparentPreview,
              file
            );

          if (!finalBlob) {
            throw new Error(
              "Could not create final transparent image."
            );
          }

          setProgressTarget(
            97
          );

          /*
           * =================================================
           * SAVE CACHE
           * =================================================
           */

          try {
            await savePreparedBackground(
              file,
              finalBlob
            );
          } catch (
            cacheError
          ) {
            console.warn(
              "[BG] IndexedDB cache write failed:",
              cacheError
            );
          }

          /*
           * =================================================
           * CREATE FINAL FILE
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

          if (!finalFile) {
            throw new Error(
              "Could not create transparent PNG."
            );
          }

          /*
           * =================================================
           * LOAD FINAL IMAGE
           * =================================================
           */

          const finalImage =
            await loadImage(
              finalFile
            );

          if (!finalImage) {
            throw new Error(
              "Transparent image could not be loaded."
            );
          }

          /*
           * =================================================
           * MEMORY CACHE RESULT
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
           * IMPORTANT:
           *
           * Active button operation owns progress.
           * Therefore DO NOT complete it here.
           */

          if (
            !removeOperationActiveRef.current
          ) {
            completeProgress();
          }

          setBackgroundReady(
            true
          );

          setBackgroundPreparing(
            false
          );

          console.log(
            "[BG] READY"
          );

          return result;
        })();

      preparedCacheRef.current.set(
        key,
        {
          promise,
          ready:
            false,
        }
      );

      try {
        return await promise;
      } catch (
        error
      ) {
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

        if (
          !removeOperationActiveRef.current
        ) {
          stopProgressAnimation();
        }

        if (
          error?.message !==
          "Background preparation cancelled."
        ) {
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
      if (
        !removeOperationActiveRef.current
      ) {
        stopProgressAnimation();

        setBackgroundReady(
          false
        );

        setBackgroundPreparing(
          false
        );

        resetProgress(
          0
        );
      }

      backgroundRemovedOutputKeyRef.current =
        "";

      setBackgroundRemoved(
        false
      );

      return;
    }

    const key =
      getFileKey(
        workingFile
      );

    /*
     * ===================================================
     * BACKGROUND REMOVED STATE
     * ===================================================
     */

    if (
      backgroundRemovedOutputKeyRef.current &&
      key ===
        backgroundRemovedOutputKeyRef.current
    ) {
      setBackgroundRemoved(
        true
      );
    } else if (
      key !==
      backgroundRemovedOutputKeyRef.current
    ) {
      setBackgroundRemoved(
        false
      );
    }

    if (!key) {
      return;
    }

    preparingKeyRef.current =
      key;

    setBackgroundError(
      ""
    );

    /*
     * ===================================================
     * MEMORY CACHE HIT
     * ===================================================
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

      if (
        !removeOperationActiveRef.current
      ) {
        completeProgress();
      }

      return;
    }

    /*
     * ===================================================
     * AUTOMATIC PREPARATION
     * ===================================================
     */

    setBackgroundReady(
      false
    );

    setBackgroundPreparing(
      true
    );

    if (
      !removeOperationActiveRef.current
    ) {
      resetProgress(
        1
      );
    }

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

      if (
        !removeOperationActiveRef.current
      ) {
        stopProgressAnimation();
      }
    };
  }, [
    workingFile,
  ]);

  /*
   * =======================================================
   * HANDLE REMOVE
   * =======================================================
   */

  async function handleBackgroundRemove() {
    /*
     * Once removed, button stays disabled until
     * image changes/reset.
     */
    if (
      !workingFile ||
      removingBackground ||
      backgroundRemoved
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

    /*
     * Button owns visible progress.
     */
    removeOperationActiveRef.current =
      true;

    backgroundRemoveFailedRef.current =
      false;

    clearRemoveLoaderTimer();

    const startedAt =
      Date.now();

    try {
      /*
       * =================================================
       * START LOADER
       * =================================================
       */

      setRemovingBackground(
        true
      );

      startProgressAnimation();

      setBackgroundError(
        ""
      );

      setImageOffset({
        x: 0,
        y: 0,
      });

      resetImageDrag();

      /*
       * =================================================
       * CACHE
       * =================================================
       */

      const cached =
        preparedCacheRef.current.get(
          key
        );

      let result =
        cached?.ready
          ? cached
          : null;

      /*
       * =================================================
       * PREPARE
       * =================================================
       */

      if (
        !result?.file ||
        !result?.image
      ) {
        result =
          await prepareBackgroundRemoval(
            workingFile,
            key
          );
      }

      /*
       * =================================================
       * VALIDATE
       * =================================================
       */

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
       * =================================================
       * APPLY RESULT
       * =================================================
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
       * =================================================
       * SUCCESS
       * =================================================
       */

      /*
       * IMPORTANT:
       *
       * DO NOT call completeProgress() here.
       *
       * Otherwise fast AI instantly changes
       * 1% -> 100%.
       *
       * RAF will continue naturally to 100%.
       */

      setBackgroundReady(
        false
      );

      setBackgroundPreparing(
        false
      );

      setBackgroundError(
        ""
      );

      const outputKey =
        getFileKey(
          newFile
        );

      backgroundRemovedOutputKeyRef.current =
        outputKey;

      /*
       * Button becomes disabled immediately.
       */
      setBackgroundRemoved(
        true
      );

      console.log(
        "[BG] REMOVE COMPLETE"
      );
    } catch (
      error
    ) {
      /*
       * =================================================
       * ERROR
       * =================================================
       */

      console.error(
        "[BG] REMOVE FAILED:",
        error
      );

      backgroundRemoveFailedRef.current =
        true;

      removeOperationActiveRef.current =
        false;

      stopProgressAnimation();

      clearRemoveLoaderTimer();

      progressValueRef.current =
        0;

      progressTargetRef.current =
        0;

      setBackgroundProgress(
        0
      );

      setBackgroundError(
        error?.message ||
          "Background removal failed."
      );

      setBackgroundPreparing(
        false
      );

      setBackgroundReady(
        false
      );

      setBackgroundRemoved(
        false
      );

      backgroundRemovedOutputKeyRef.current =
        "";

      setRemovingBackground(
        false
      );
    } finally {
      /*
       * =================================================
       * FAILURE
       * =================================================
       */

      if (
        backgroundRemoveFailedRef.current
      ) {
        clearRemoveLoaderTimer();

        setRemovingBackground(
          false
        );

        resetProgress(
          0
        );

        removeOperationActiveRef.current =
          false;

        return;
      }

      /*
       * =================================================
       * SUCCESS
       * =================================================
       *
       * IMPORTANT:
       *
       * DO NOT stop RAF here.
       *
       * It must continue from current value to 100%.
       * =================================================
       */

      const elapsed =
        Date.now() -
        startedAt;

      const remaining =
        Math.max(
          0,
          VISIBLE_PROGRESS_DURATION -
            elapsed
        );

      clearRemoveLoaderTimer();

      /*
       * AI took 2+ seconds.
       *
       * RAF should already be at 100,
       * so hide immediately.
       */
      if (
        remaining <= 0
      ) {
        completeProgress();

        setRemovingBackground(
          false
        );

        removeOperationActiveRef.current =
          false;

        return;
      }

      /*
       * AI finished early.
       *
       * Keep loader visible until the full
       * 2-second visual progress finishes.
       */
      removeLoaderTimerRef.current =
        setTimeout(() => {
          removeLoaderTimerRef.current =
            null;

          /*
           * Force exact final 100%.
           */
          completeProgress();

          setRemovingBackground(
            false
          );

          removeOperationActiveRef.current =
            false;

          console.log(
            "[BG] VISUAL PROGRESS COMPLETE"
          );
        }, remaining);
    }
  }

  /*
   * =======================================================
   * FINAL CLEANUP
   * =======================================================
   */

  useEffect(() => {
    return () => {
      stopProgressAnimation();

      clearRemoveLoaderTimer();

      removeOperationActiveRef.current =
        false;

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

    backgroundRemoved,

    backgroundElapsedSeconds:
      backgroundProgress,
  };
}

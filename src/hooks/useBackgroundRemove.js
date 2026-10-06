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
 * IMG.LY MODULE / ENGINE SINGLETONS
 * =========================================================
 *
 * IMPORTANT:
 *
 * These live OUTSIDE the React hook.
 *
 * So:
 * - component re-render does not reload IMG.LY
 * - hook remount does not reload IMG.LY
 * - multiple callers share one module import
 * - model initialization is shared
 * - same image preparation is shared
 * =========================================================
 */

let backgroundRemovalModulePromise = null;
let backgroundEngineWarmupPromise = null;

const globalPreparationPromises = new Map();

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
 * LOAD IMG.LY MODULE
 * =========================================================
 */

async function getBackgroundRemovalModule() {
  if (!isBrowser()) {
    throw new Error(
      "Background removal is only available in the browser."
    );
  }

  if (!backgroundRemovalModulePromise) {
    backgroundRemovalModulePromise =
      import("@imgly/background-removal").catch(
        (error) => {
          backgroundRemovalModulePromise =
            null;

          throw error;
        }
      );
  }

  return backgroundRemovalModulePromise;
}

/*
 * =========================================================
 * ENGINE CONFIG SINGLETON
 * =========================================================
 */

function getGlobalConfig() {
  if (!globalWorkingConfig) {
    globalWorkingConfig =
      getCpuConfig();
  }

  return globalWorkingConfig;
}

/*
 * =========================================================
 * MODEL PRELOAD / WARM-UP
 * =========================================================
 *
 * This starts as soon as the first image arrives.
 *
 * preload() initializes the IMG.LY inference session
 * before the user presses Remove Background.
 *
 * The same session is then reused by removeBackground().
 * =========================================================
 */

async function warmupBackgroundEngine() {
  if (!isBrowser()) {
    throw new Error(
      "Background removal is only available in the browser."
    );
  }

  if (backgroundEngineWarmupPromise) {
    return backgroundEngineWarmupPromise;
  }

  backgroundEngineWarmupPromise =
    (async () => {
      const module =
        await getBackgroundRemovalModule();

      const config =
        getGlobalConfig();

      console.log(
        "[BG] WARMING AI ENGINE..."
      );

      if (
        typeof module.preload ===
        "function"
      ) {
        await module.preload({
          device:
            config.device,

          model:
            config.model,

          proxyToWorker:
            config.proxyToWorker,
        });
      } else {
        /*
         * Compatibility fallback for older
         * IMG.LY versions.
         *
         * removeBackground() will initialize
         * the engine itself.
         */
        console.log(
          "[BG] preload() unavailable - using lazy engine init."
        );
      }

      console.log(
        "[BG] AI ENGINE READY"
      );

      return module;
    })().catch(
      (error) => {
        /*
         * Allow retry if model download or
         * initialization failed.
         */
        backgroundEngineWarmupPromise =
          null;

        console.error(
          "[BG] ENGINE WARM-UP FAILED:",
          error
        );

        throw error;
      }
    );

  return backgroundEngineWarmupPromise;
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
   * RAF PROGRESS
   * =======================================================
   */

  const progressAnimationFrameRef =
    useRef(null);

  const progressAnimationActiveRef =
    useRef(false);

  const progressTargetRef =
    useRef(0);

  const progressValueRef =
    useRef(0);

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
   * STOP PROGRESS
   * =======================================================
   */

  function stopProgressAnimation() {
    progressAnimationActiveRef.current =
      false;

    if (
      progressAnimationFrameRef.current !==
      null
    ) {
      clearTimeout(
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

    progressAnimationActiveRef.current =
      true;

    progressValueRef.current =
      1;

    progressTargetRef.current =
      100;

    setBackgroundProgress(
      1
    );

    const startedAt =
      performance.now();

    const animate = () => {
      if (
        !progressAnimationActiveRef.current
      ) {
        return;
      }

      const elapsed =
        performance.now() -
        startedAt;

      const ratio =
        Math.min(
          1,
          elapsed /
            VISIBLE_PROGRESS_DURATION
        );

      const nextValue =
        Math.min(
          100,
          Math.max(
            1,
            Math.floor(
              1 +
                ratio *
                  99
            )
          )
        );

      if (
        nextValue !==
        progressValueRef.current
      ) {
        progressValueRef.current =
          nextValue;

        setBackgroundProgress(
          nextValue
        );
      }

      if (
        ratio >= 1
      ) {
        progressValueRef.current =
          100;

        progressTargetRef.current =
          100;

        setBackgroundProgress(
          100
        );

        progressAnimationActiveRef.current =
          false;

        progressAnimationFrameRef.current =
          null;

        return;
      }

      progressAnimationFrameRef.current =
        setTimeout(
          animate,
          10
        );
    };

    animate();
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
       * LOCAL MEMORY CACHE
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
       * GLOBAL PREPARATION DEDUPLICATION
       * ===================================================
       *
       * If another hook/component is already preparing
       * this exact image, reuse that promise.
       * ===================================================
       */

      const globalExisting =
        globalPreparationPromises.get(
          key
        );

      if (globalExisting) {
        console.log(
          "[BG] GLOBAL PREPARATION PROMISE HIT"
        );

        const sharedResult =
          await globalExisting;

        if (
          sharedResult
        ) {
          preparedCacheRef.current.set(
            key,
            sharedResult
          );
        }

        return sharedResult;
      }

      /*
       * ===================================================
       * LOCAL PROMISE
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

      /*
       * ===================================================
       * ACTUAL PREPARATION
       * ===================================================
       */

      const preparationPromise =
        (async () => {
          /*
           * =================================================
           * FIRST: CHECK INDEXEDDB
           * =================================================
           */

          console.log(
            "[BG] CHECKING INDEXEDDB CACHE..."
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

          /*
           * IMPORTANT:
           *
           * Do not cancel the shared preparation
           * just because React changed image.
           *
           * The result can still be cached and reused.
           */

          if (
            indexedDbBlob
          ) {
            console.log(
              "[BG] INDEXEDDB CACHE HIT"
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

            setBackgroundReady(
              true
            );

            setBackgroundPreparing(
              false
            );

            if (
              !removeOperationActiveRef.current &&
              preparingKeyRef.current ===
                key
            ) {
              completeProgress();
            }

            return cachedResult;
          }

          /*
           * =================================================
           * WARM ENGINE FIRST
           * =================================================
           *
           * This is the major performance improvement.
           *
           * The model/session is initialized before
           * removeBackground() is called.
           * =================================================
           */

          console.log(
            "[BG] WARMING ENGINE BEFORE INFERENCE..."
          );

          const module =
            await warmupBackgroundEngine();

          const {
            removeBackground,
          } = module;

          const config =
            getGlobalConfig();

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

          /*
           * =================================================
           * INFERENCE
           * =================================================
           */

          console.log(
            "[BG] BEFORE removeBackground"
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
                   * Keep logging available for debugging,
                   * but don't cause React renders for every
                   * model progress event.
                   */

                  if (
                    progressKey ===
                      "compute:inference" ||
                    progressKey ===
                      "compute:mask" ||
                    progressKey ===
                      "compute:encode"
                  ) {
                    console.log(
                      "[BG] ENGINE:",
                      progressKey,
                      current,
                      "/",
                      total
                    );
                  }
                },
              }
            );

          console.log(
            "[BG] AFTER removeBackground"
          );

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

          /*
           * =================================================
           * SAVE INDEXEDDB CACHE
           * =================================================
           */

          try {
            await savePreparedBackground(
              file,
              finalBlob
            );

            console.log(
              "[BG] RESULT SAVED TO INDEXEDDB"
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
           * FINAL RESULT
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

          setBackgroundReady(
            true
          );

          setBackgroundPreparing(
            false
          );

          if (
            !removeOperationActiveRef.current &&
            preparingKeyRef.current ===
              key
          ) {
            completeProgress();
          }

          console.log(
            "[BG] READY"
          );

          return result;
        })();

      /*
       * ===================================================
       * REGISTER GLOBAL PROMISE
       * ===================================================
       */

      globalPreparationPromises.set(
        key,
        preparationPromise
      );

      /*
       * ===================================================
       * REGISTER LOCAL PROMISE
       * ===================================================
       */

      preparedCacheRef.current.set(
        key,
        {
          promise:
            preparationPromise,

          ready:
            false,
        }
      );

      try {
        const result =
          await preparationPromise;

        /*
         * Replace promise entry with actual
         * prepared result.
         */

        if (
          result
        ) {
          preparedCacheRef.current.set(
            key,
            result
          );
        }

        return result;
      } catch (
        error
      ) {
        const current =
          preparedCacheRef.current.get(
            key
          );

        if (
          current?.promise ===
          preparationPromise
        ) {
          preparedCacheRef.current.delete(
            key
          );
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

        setBackgroundPreparing(
          false
        );

        if (
          !removeOperationActiveRef.current
        ) {
          stopProgressAnimation();
        }

        throw error;
      } finally {
        /*
         * Remove global promise only after completion.
         *
         * IndexedDB + local memory now contain the result.
         */

        if (
          globalPreparationPromises.get(
            key
          ) ===
          preparationPromise
        ) {
          globalPreparationPromises.delete(
            key
          );
        }
      }
    };

  /*
   * =======================================================
   * AUTOMATIC PREPARATION
   * =======================================================
   *
   * Image upload/change:
   *
   * 1. Check memory
   * 2. Check IndexedDB
   * 3. Warm IMG.LY engine
   * 4. Download model if needed
   * 5. Run AI inference
   * 6. Restore original size
   * 7. Save transparent result
   *
   * Therefore pressing Remove Background later
   * does NOT need to start the AI work again.
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

    if (!key) {
      return;
    }

    /*
     * New image means new remove operation.
     */

    if (
      backgroundRemovedOutputKeyRef.current &&
      key ===
        backgroundRemovedOutputKeyRef.current
    ) {
      setBackgroundRemoved(
        true
      );
    } else {
      setBackgroundRemoved(
        false
      );
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

    /*
     * IMPORTANT:
     *
     * This starts immediately when the image changes.
     */

    prepareBackgroundRemoval(
      workingFile,
      key
    ).catch(
      (error) => {
        console.error(
          "[BG] automatic preparation:",
          error
        );
      }
    );

    return () => {
      /*
       * Do NOT cancel the actual preparation.
       *
       * It may continue in the background and populate
       * IndexedDB/global cache.
       */

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
     * Once removed, button remains disabled until
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
       * START UI LOADER
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
       * GET READY RESULT
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
       * If preparation is already running,
       * wait for the SAME promise.
       *
       * No second AI inference.
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

        name:
          "Background Removed",

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
       * SUCCESS STATE
       * =================================================
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
       * Button disabled immediately.
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

      removeLoaderTimerRef.current =
        setTimeout(
          () => {
            removeLoaderTimerRef.current =
              null;

            completeProgress();

            setRemovingBackground(
              false
            );

            removeOperationActiveRef.current =
              false;

            console.log(
              "[BG] VISUAL PROGRESS COMPLETE"
            );
          },
          remaining
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
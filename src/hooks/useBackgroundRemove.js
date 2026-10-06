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
 */

let backgroundRemovalModulePromise = null;
let backgroundEngineWarmupPromise = null;

const globalPreparationPromises = new Map();

/*
 * =========================================================
 * CONFIG
 * =========================================================
 *
 * No manual resize is performed.
 *
 * Strong:
 *   isnet
 *
 * Normal:
 *   isnet_fp16
 *
 * Weak:
 *   isnet_quint8
 * =========================================================
 */

let globalWorkingConfig = null;

/*
 * =========================================================
 * VISIBLE PROGRESS
 * =========================================================
 *
 * This is only the minimum visual duration after an actual
 * successful operation.
 *
 * We DO NOT fake the entire AI operation as 0 -> 100 in
 * one second.
 * =========================================================
 */

const VISIBLE_PROGRESS_DURATION = 1200;

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

/*
 * =========================================================
 * DEVICE CONFIG
 * =========================================================
 */

function getCpuConfig() {
  const memory = getMemory();
  const cores = getCores();

  const veryWeak =
    (memory > 0 && memory <= 4) ||
    (cores > 0 && cores <= 4);

  const strong =
    memory >= 8 &&
    cores >= 8;

  let model;

  if (veryWeak) {
    model = "isnet_quint8";
  } else if (strong) {
    model = "isnet";
  } else {
    model = "isnet_fp16";
  }

  return {
    device: "cpu",

    model,

    proxyToWorker: true,

    weak: veryWeak,

    strong,
  };
}

function getGlobalConfig() {
  if (!globalWorkingConfig) {
    globalWorkingConfig =
      getCpuConfig();

    console.log(
      "[BG] GLOBAL CONFIG:",
      {
        device:
          globalWorkingConfig.device,

        model:
          globalWorkingConfig.model,

        proxyToWorker:
          globalWorkingConfig.proxyToWorker,

        weak:
          globalWorkingConfig.weak,

        strong:
          globalWorkingConfig.strong,

        memory:
          getMemory(),

        cores:
          getCores(),
      }
    );
  }

  return globalWorkingConfig;
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

  if (
    !backgroundRemovalModulePromise
  ) {
    console.log(
      "[BG] LOADING IMG.LY MODULE..."
    );

    backgroundRemovalModulePromise =
      import(
        "@imgly/background-removal"
      ).catch(
        (error) => {
          backgroundRemovalModulePromise =
            null;

          console.error(
            "[BG] IMG.LY MODULE IMPORT FAILED:",
            error
          );

          throw error;
        }
      );
  }

  return backgroundRemovalModulePromise;
}

/*
 * =========================================================
 * MODEL / ENGINE WARM-UP
 * =========================================================
 *
 * preload() is only an optimization.
 *
 * If preload fails, we DO NOT block inference.
 * =========================================================
 */

async function warmupBackgroundEngine() {
  if (!isBrowser()) {
    throw new Error(
      "Background removal is only available in the browser."
    );
  }

  if (
    backgroundEngineWarmupPromise
  ) {
    return backgroundEngineWarmupPromise;
  }

  backgroundEngineWarmupPromise =
    (async () => {
      const module =
        await getBackgroundRemovalModule();

      const config =
        getGlobalConfig();

      console.log(
        "[BG] AI MODULE READY:",
        {
          model:
            config.model,

          device:
            config.device,
        }
      );

      if (
        typeof module.preload ===
        "function"
      ) {
        try {
          console.log(
            "[BG] AI PRELOAD START:",
            config.model
          );

          await module.preload({
            device:
              config.device,

            model:
              config.model,

            proxyToWorker:
              config.proxyToWorker,
          });

          console.log(
            "[BG] AI PRELOAD READY:",
            config.model
          );
        } catch (
          preloadError
        ) {
          /*
           * IMPORTANT:
           *
           * preload failure must never prevent
           * actual removeBackground() inference.
           */

          console.warn(
            "[BG] AI PRELOAD FAILED - CONTINUING WITH LAZY INFERENCE:",
            preloadError
          );
        }
      }

      return module;
    })().catch(
      (error) => {
        backgroundEngineWarmupPromise =
          null;

        console.error(
          "[BG] MODULE LOAD FAILED:",
          error
        );

        throw error;
      }
    );

  return backgroundEngineWarmupPromise;
}

/*
 * =========================================================
 * PREPARE SOURCE
 * =========================================================
 *
 * ORIGINAL FILE IS USED.
 *
 * No manual 512px / 640px resize.
 * =========================================================
 */

async function createAiInput(
  source
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

  return source;
}

/*
 * =========================================================
 * PROGRESS HELPER
 * =========================================================
 */

function normalizeProgress(
  value
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      number
    )
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
   * PROGRESS
   * =======================================================
   */

  const progressAnimationFrameRef =
    useRef(null);

  const progressAnimationActiveRef =
    useRef(false);

  const progressValueRef =
    useRef(0);

  const progressTargetRef =
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

  /*
   * This stores the FILE KEY of the generated transparent
   * output.
   */

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
   * START PROGRESS
   * =======================================================
   *
   * Used only for the visible Remove Background action.
   *
   * Preparation itself does not fake 0 -> 100.
   * =======================================================
   */

  function startProgressAnimation() {
    stopProgressAnimation();

    progressAnimationActiveRef.current =
      true;

    progressValueRef.current =
      1;

    progressTargetRef.current =
      99;

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

      /*
       * Slowly approach 99%.
       *
       * Actual completion sets 100%.
       */

      const ratio =
        Math.min(
          1,
          elapsed /
            30000
        );

      const nextValue =
        Math.min(
          99,
          Math.max(
            1,
            Math.floor(
              1 +
                ratio *
                  98
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
        nextValue >= 99
      ) {
        progressAnimationActiveRef.current =
          false;

        progressAnimationFrameRef.current =
          null;

        return;
      }

      progressAnimationFrameRef.current =
        setTimeout(
          animate,
          80
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
      normalizeProgress(
        value
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
       * GLOBAL DEDUPLICATION
       * ===================================================
       */

      const globalExisting =
        globalPreparationPromises.get(
          key
        );

      if (
        globalExisting
      ) {
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

      /*
       * DO NOT fake progress during automatic
       * preparation.
       */

      if (
        !removeOperationActiveRef.current
      ) {
        resetProgress(1);
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
           * INDEXEDDB CACHE
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
              "[BG] IndexedDB CACHE READ FAILED:",
              cacheError
            );
          }

          /*
           * =================================================
           * INDEXEDDB CACHE HIT
           * =================================================
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

            console.log(
              "[BG] CACHED RESULT READY"
            );

            return cachedResult;
          }

          /*
           * =================================================
           * WARM ENGINE
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
            "[BG] USING ENGINE:",
            {
              device:
                config.device,

              model:
                config.model,

              proxyToWorker:
                config.proxyToWorker,

              weak:
                config.weak,

              strong:
                config.strong,
            }
          );

          /*
           * =================================================
           * ORIGINAL IMAGE
           * =================================================
           */

          const aiInput =
            await createAiInput(
              file
            );

          console.log(
            "[BG] USING ORIGINAL IMAGE FOR AI"
          );

          /*
           * =================================================
           * INFERENCE
           * =================================================
           */

          console.log(
            "[BG] BEFORE removeBackground"
          );

          let transparentPreview;

          /*
           * =================================================
           * PRIMARY MODEL
           * =================================================
           */

          try {
            console.log(
              "[BG] INFERENCE START:",
              {
                model:
                  config.model,

                device:
                  config.device,
              }
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
                    /*
                     * Do not set React state from
                     * every engine callback.
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
              "[BG] AFTER removeBackground:",
              config.model
            );
          } catch (
            primaryError
          ) {
            /*
             * =================================================
             * ISNET FALLBACK
             * =================================================
             *
             * Strong devices use ISNet first.
             *
             * If ISNet cannot initialize/infer,
             * retry with FP16.
             * =================================================
             */

            if (
              config.model !==
              "isnet"
            ) {
              console.error(
                "[BG] INFERENCE FAILED:",
                primaryError
              );

              throw primaryError;
            }

            console.warn(
              "[BG] ISNET FAILED - RETRYING WITH ISNET_FP16:",
              primaryError
            );

            try {
              transparentPreview =
                await removeBackground(
                  aiInput,
                  {
                    device:
                      "cpu",

                    model:
                      "isnet_fp16",

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
                        progressKey ===
                          "compute:inference" ||
                        progressKey ===
                          "compute:mask" ||
                        progressKey ===
                          "compute:encode"
                      ) {
                        console.log(
                          "[BG] FALLBACK ENGINE:",
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
                "[BG] FALLBACK INFERENCE COMPLETE"
              );
            } catch (
              fallbackError
            ) {
              console.error(
                "[BG] FALLBACK INFERENCE FAILED:",
                fallbackError
              );

              throw fallbackError;
            }
          }

          /*
           * =================================================
           * VALIDATE AI OUTPUT
           * =================================================
           */

          if (
            !transparentPreview
          ) {
            throw new Error(
              "AI returned an empty result."
            );
          }

          /*
           * =================================================
           * FINAL BLOB
           * =================================================
           *
           * Do not manually upscale/downscale.
           * =================================================
           */

          const finalBlob =
            transparentPreview;

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
            const saved =
              await savePreparedBackground(
                file,
                finalBlob
              );

            console.log(
              "[BG] RESULT SAVED TO INDEXEDDB:",
              saved
            );
          } catch (
            cacheError
          ) {
            /*
             * Cache failure must NEVER make
             * background removal fail.
             */

            console.warn(
              "[BG] IndexedDB CACHE WRITE FAILED:",
              cacheError
            );
          }

          /*
           * =================================================
           * CREATE FINAL PNG FILE
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

        setBackgroundError(
          error?.message ||
            "Background preparation failed."
        );

        setBackgroundPreparing(
          false
        );

        setBackgroundReady(
          false
        );

        if (
          !removeOperationActiveRef.current
        ) {
          resetProgress(0);
        }

        throw error;
      } finally {
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
   * Every time the source image changes:
   *
   * image
   *   ↓
   * preparation starts immediately
   *   ↓
   * model warmup
   *   ↓
   * AI inference
   *   ↓
   * cache result
   *
   * So when the user presses Remove Background,
   * the result is normally already prepared.
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

        setBackgroundError(
          ""
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
     * ===================================================
     * DETECT CURRENT OUTPUT
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
     * START PREPARATION IMMEDIATELY
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
        console.error(
          "[BG] AUTOMATIC PREPARATION FAILED:",
          error
        );
      }
    );

    return () => {
      /*
       * Do not cancel the actual preparation.
       *
       * Global promise deduplication allows the next
       * render/effect to reuse the same operation.
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
       * GET PREPARED RESULT
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

      if (
        !result?.file ||
        !result?.image
      ) {
        console.log(
          "[BG] REMOVE CLICK - WAITING FOR PREPARATION..."
        );

        result =
          await prepareBackgroundRemoval(
            workingFile,
            key
          );
      }

      /*
       * =================================================
       * VALIDATE RESULT
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
       * FAILURE
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
       * FAILURE CLEANUP
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
       * SUCCESS VISUAL COMPLETION
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
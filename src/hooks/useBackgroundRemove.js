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
 * Architecture:
 *
 * APP START
 *    ↓
 * AI MODEL WARM-UP
 *
 * IMAGE UPLOAD
 *    ↓
 * resize small
 *    ↓
 * AI inference
 *    ↓
 * transparent result
 *    ↓
 * final PNG
 *    ↓
 * File + Image cached
 *
 * REMOVE CLICK
 *    ↓
 * cache hit
 *    ↓
 * instant apply
 *
 * IMPORTANT:
 *
 * We never run AI again on Remove click if preparation
 * already completed.
 */

/*
 * =========================================================
 * SPEED SETTINGS
 * =========================================================
 *
 * 768 is intentionally used instead of 1024.
 *
 * 1024 -> ~1,048,576 pixels
 * 768  ->   589,824 pixels
 *
 * That is roughly 44% fewer pixels for inference.
 *
 * It keeps substantially better edges than extremely small
 * 512px processing while being much faster than 1024px.
 */

const AI_MAX_SIZE_GPU = 768;
const AI_MAX_SIZE_CPU = 768;
const AI_MAX_SIZE_WEAK = 640;

/*
 * =========================================================
 * GLOBAL MODEL WARM-UP
 * =========================================================
 *
 * The important improvement:
 *
 * Model initialization does NOT wait for image upload.
 *
 * The browser starts preparing the AI engine while the user
 * is using the editor.
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
  /*
   * If WebGPU exists, prefer GPU.
   */
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

async function warmupModel(config = getConfig()) {
  const key = getConfigKey(config);

  /*
   * Same model already warming/ready.
   */
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

  globalWarmupPromise = preload({
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
          device: config.device,
          model: config.model,
        }
      );

      return result;
    })
    .catch((error) => {
      /*
       * Allow retry if warm-up failed.
       */
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
 *
 * We don't block React rendering.
 */

if (
  typeof window !== "undefined"
) {
  const start = () => {
    warmupModel().catch(() => {
      /*
       * Actual image preparation will retry.
       */
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

      /*
       * PNG gives predictable alpha/input behavior.
       */
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
 *
 * This happens during background preparation.
 *
 * Therefore Remove click doesn't wait for it.
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
   * TIMER
   * =======================================================
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
   * TIMER FUNCTIONS
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
     * Always begin at 1.
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

      startElapsedTimer();

      /*
       * Internal progress only.
       *
       * User-facing UI uses seconds.
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
           * MODEL
           * =================================================
           *
           * If global warmup already finished, this is
           * basically instant.
           */

          console.log(
            "[BG] WAITING FOR MODEL..."
          );

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
           * DIRECT AI
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
                  /*
                   * Keep this completely separate from
                   * the user-facing seconds counter.
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
                      15
                    );
                  } else if (
                    progressKey ===
                    "compute:inference"
                  ) {
                    setBackgroundProgress(
                      50
                    );
                  } else if (
                    progressKey ===
                    "compute:mask"
                  ) {
                    setBackgroundProgress(
                      75
                    );
                  } else if (
                    progressKey ===
                    "compute:encode"
                  ) {
                    setBackgroundProgress(
                      90
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
           * =================================================
           * STEP 4
           * RESTORE ORIGINAL SIZE
           * =================================================
           *
           * Still happens BEFORE Remove click.
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

          /*
           * =================================================
           * STEP 5
           * CREATE FILE NOW
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

          /*
           * =================================================
           * STEP 6
           * LOAD IMAGE NOW
           * =================================================
           *
           * This removes another delay from Remove click.
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

          const seconds =
            Math.max(
              1,
              Math.round(
                (
                  performance.now() -
                  elapsedStartRef.current
                ) /
                  1000
              )
            );

          console.log(
            "[BG] READY",
            {
              seconds,
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

      setBackgroundProgress(
        100
      );

      setBackgroundElapsedSeconds(
        0
      );

      return;
    }

    /*
     * Start from 1.
     */
    setBackgroundReady(
      false
    );

    setBackgroundPreparing(
      true
    );

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
       * Make old image stale.
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

      setImageOffset({
        x: 0,
        y: 0,
      });

      resetImageDrag();

      /*
       * ===================================================
       * CACHE HIT
       * ===================================================
       *
       * This is now the intended normal path.
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
         * Do NOT run a second inference.
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
       * IMPORTANT
       * ===================================================
       *
       * File + Image were already prepared.
       *
       * No:
       *
       * makePngFile()
       *
       * loadImage()
       *
       * resize
       *
       * AI inference
       *
       * happens here.
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
      stopElapsedTimer();

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

    backgroundElapsedSeconds,
  };
}
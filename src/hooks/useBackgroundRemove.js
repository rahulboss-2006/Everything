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

/*
 * =========================================================
 * BROWSER-ONLY MODULES
 * =========================================================
 */

let backgroundRemovalModulePromise = null;
let ortModulePromise = null;

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
    backgroundRemovalModulePromise =
      import("@imgly/background-removal");
  }

  return backgroundRemovalModulePromise;
}

async function getOrtModule() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    throw new Error(
      "ONNX runtime is only available in the browser."
    );
  }

  if (!ortModulePromise) {
    ortModulePromise =
      import("onnxruntime-web");
  }

  return ortModulePromise;
}

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const AI_MAX_SIZE_CPU = 768;
const AI_MAX_SIZE_WEAK = 640;

/*
 * =========================================================
 * GLOBAL STATE
 * =========================================================
 */

let globalWorkingConfig = null;
let runtimeConfigured = false;

/*
 * =========================================================
 * BROWSER
 * =========================================================
 */

function isBrowser() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof navigator !== "undefined"
  );
}

/*
 * =========================================================
 * DEVICE DETECTION
 * =========================================================
 */

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
 * FORCE SAFE WASM RUNTIME
 * =========================================================
 *
 * GitHub Pages is not guaranteed to be crossOriginIsolated.
 *
 * Therefore:
 *
 * numThreads = 1
 *
 * This avoids:
 *
 * "env.wasm.numThreads is set to 16"
 *
 * followed by:
 *
 * "Falling back to single-threading."
 */

async function configureOrtRuntime() {
  if (
    runtimeConfigured ||
    !isBrowser()
  ) {
    return;
  }

  try {
    const ort =
      await getOrtModule();

    if (
      ort?.env?.wasm
    ) {
      ort.env.wasm.numThreads = 1;

      /*
       * Keep WASM execution local.
       */

      if (
        "proxy" in ort.env.wasm
      ) {
        ort.env.wasm.proxy = false;
      }
    }

    runtimeConfigured = true;

    console.log(
      "[BG] WASM RUNTIME READY",
      {
        numThreads:
          ort?.env?.wasm?.numThreads ?? 1,
      }
    );
  } catch (error) {
    /*
     * Do not fail background removal only because
     * explicit runtime configuration is unavailable.
     */

    console.warn(
      "[BG] WASM runtime configuration skipped:",
      error
    );

    runtimeConfigured = true;
  }
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
        "[BG] createImageBitmap fallback:",
        error
      );
    }
  }

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
 * PROGRESS
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
  const preparedCacheRef =
    useRef(
      new Map()
    );

  const preparingKeyRef =
    useRef("");

  const progressTimerRef =
    useRef(null);

  const progressTargetRef =
    useRef(0);

  const progressValueRef =
    useRef(0);

  /*
   * Prevent processing the result produced by our own
   * background-removal operation.
   */

  const skipNextWorkingFilePreparationRef =
    useRef(false);

  const lastProcessedSourceKeyRef =
    useRef("");

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
   * PROGRESS ANIMATION
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
          30
        );
    }
  }

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
          console.log(
            "[BG] LOADING ENGINE..."
          );

          setProgressTarget(5);

          /*
           * Configure ONNX BEFORE IMG.LY starts inference.
           */

          await configureOrtRuntime();

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
            }
          );

          setProgressTarget(10);

          const aiSize =
            getAiSize(
              config
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

          setProgressTarget(18);

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

          let transparentPreview;

          try {
            transparentPreview =
              await removeBackground(
                aiInput,
                {
                  device:
                    "cpu",

                  model:
                    config.model,

                  proxyToWorker:
                    false,

                  output: {
                    format:
                      "image/png",
                    quality:
                      1,
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

                    const engineProgress =
                      getProgressFromEngine(
                        progressKey,
                        current,
                        total
                      );

                    if (
                      engineProgress !==
                      null
                    ) {
                      setProgressTarget(
                        engineProgress
                      );
                    }
                  },
                }
              );
          } catch (error) {
            console.error(
              "[BG] AI INFERENCE FAILED:",
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

          console.log(
            "[BG] AI INFERENCE COMPLETE"
          );

          setProgressTarget(95);

          const finalBlob =
            await scaleTransparentResult(
              transparentPreview,
              file
            );

          setProgressTarget(97);

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

          setProgressTarget(98);

          const finalImage =
            await loadImage(
              finalFile
            );

          if (!finalImage) {
            throw new Error(
              "Transparent image could not be loaded."
            );
          }

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

          lastProcessedSourceKeyRef.current =
            key;

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

      setBackgroundReady(false);

      setBackgroundPreparing(false);

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
     * IMPORTANT:
     *
     * After Background Removal succeeds, setWorkingFile()
     * changes workingFile to the newly-created PNG.
     *
     * That new PNG must NOT automatically start another
     * background-removal inference.
     */

    if (
      skipNextWorkingFilePreparationRef.current
    ) {
      skipNextWorkingFilePreparationRef.current =
        false;

      preparingKeyRef.current =
        "";

      stopProgressAnimation();

      setBackgroundReady(false);

      setBackgroundPreparing(false);

      resetProgress(100);

      return;
    }

    preparingKeyRef.current =
      key;

    setBackgroundError("");

    const cached =
      preparedCacheRef.current.get(
        key
      );

    if (
      cached?.ready &&
      cached?.file &&
      cached?.image
    ) {
      setBackgroundReady(true);

      setBackgroundPreparing(false);

      completeProgress();

      return;
    }

    /*
     * If this exact source was already processed, do not
     * run inference again.
     */

    if (
      lastProcessedSourceKeyRef.current ===
      key
    ) {
      setBackgroundReady(false);

      setBackgroundPreparing(false);

      completeProgress();

      return;
    }

    setBackgroundReady(false);

    setBackgroundPreparing(true);

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

      setBackgroundError("");

      setImageOffset({
        x: 0,
        y: 0,
      });

      resetImageDrag();

      const cached =
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
          "[BG] REMOVE -> CACHE HIT"
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
       * Tell the workingFile effect not to process
       * the newly-created transparent PNG again.
       */

      skipNextWorkingFilePreparationRef.current =
        true;

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

      setBackgroundReady(false);

      setBackgroundPreparing(false);

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

    backgroundElapsedSeconds:
      backgroundProgress,
  };
}
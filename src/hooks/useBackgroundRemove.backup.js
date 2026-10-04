import { useRef, useState, useEffect } from "react";
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
 * BACKGROUND REMOVAL PERFORMANCE SETTINGS
 * =========================================================
 *
 * AI does NOT need to process the original 4K/8K image.
 *
 * Example:
 *
 * 6000 x 4000 original
 *        ↓
 * ~1024px AI image
 *        ↓
 * AI segmentation
 *        ↓
 * mask
 *        ↓
 * original 6000 x 4000 image
 *        ↓
 * apply mask
 *
 * This keeps the final output at the original resolution
 * while dramatically reducing AI inference work.
 */

const AI_MAX_SIZE = 1024;

/*
 * For very weak devices use a smaller AI image.
 *
 * 768 is still enough for most normal product/person images
 * while being considerably lighter on low-end devices.
 */
const AI_MAX_SIZE_WEAK = 768;

/*
 * =========================================================
 * DEVICE DETECTION
 * =========================================================
 */

function getDeviceMemory() {
  try {
    return Number(navigator.deviceMemory || 0);
  } catch {
    return 0;
  }
}

function getCpuCores() {
  try {
    return Number(
      navigator.hardwareConcurrency || 4
    );
  } catch {
    return 4;
  }
}

function isWeakDevice() {
  const memory = getDeviceMemory();
  const cores = getCpuCores();

  if (memory > 0 && memory <= 4) {
    return true;
  }

  if (cores <= 4) {
    return true;
  }

  return false;
}

/*
 * =========================================================
 * WEBGPU DETECTION
 * =========================================================
 *
 * IMG.LY supports:
 *
 * device: "gpu"
 *
 * for WebGPU-capable browsers.
 *
 * We only request GPU mode when navigator.gpu exists.
 * IMG.LY itself performs the final capability check.
 */

function canUseWebGPU() {
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
 * MODEL SELECTION
 * =========================================================
 *
 * GPU:
 *   isnet
 *
 * CPU normal:
 *   isnet_fp16
 *
 * Weak CPU:
 *   isnet_quint8
 *
 * The AI input is already reduced to ~1024px,
 * so we can use the better model on capable devices.
 */

function getBackgroundConfig() {
  const weak = isWeakDevice();
  const gpu = canUseWebGPU();

  if (gpu) {
    return {
      model: "isnet",
      device: "gpu",
      weak,
    };
  }

  return {
    model: weak
      ? "isnet_quint8"
      : "isnet_fp16",
    device: "cpu",
    weak,
  };
}

/*
 * =========================================================
 * AI IMAGE SIZE
 * =========================================================
 */

function getAiMaxSize() {
  return isWeakDevice()
    ? AI_MAX_SIZE_WEAK
    : AI_MAX_SIZE;
}

/*
 * =========================================================
 * CREATE SMALL AI INPUT
 * =========================================================
 *
 * This is one of the most important optimizations.
 *
 * We do NOT send the original 4K/8K image through AI
 * inference.
 *
 * Only a small working copy is used for segmentation.
 */

async function createAiInput(
  sourceFile,
  maxSize
) {
  if (!sourceFile) {
    throw new Error(
      "No image was provided for background removal."
    );
  }

  /*
   * createImageBitmap is much faster than creating
   * a full-size HTMLImageElement on many browsers.
   */
  if (
    typeof createImageBitmap ===
    "function"
  ) {
    let bitmap = null;

    try {
      /*
       * Let the browser decode the source and resize
       * during bitmap creation where supported.
       *
       * First determine dimensions.
       */
      const originalBitmap =
        await createImageBitmap(
          sourceFile,
          {
            imageOrientation:
              "from-image",
          }
        );

      const sourceWidth =
        originalBitmap.width;

      const sourceHeight =
        originalBitmap.height;

      const scale = Math.min(
        1,
        maxSize /
          Math.max(
            sourceWidth,
            sourceHeight
          )
      );

      const targetWidth =
        Math.max(
          1,
          Math.round(
            sourceWidth * scale
          )
        );

      const targetHeight =
        Math.max(
          1,
          Math.round(
            sourceHeight * scale
          )
        );

      /*
       * If image is already small enough,
       * use the decoded bitmap directly.
       */
      if (scale >= 1) {
        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width =
          sourceWidth;

        canvas.height =
          sourceHeight;

        const ctx =
          canvas.getContext("2d", {
            alpha: true,
            willReadFrequently: false,
          });

        if (!ctx) {
          originalBitmap.close();

          throw new Error(
            "Could not create canvas context."
          );
        }

        ctx.drawImage(
          originalBitmap,
          0,
          0
        );

        originalBitmap.close();

        const blob =
          await new Promise(
            (resolve, reject) => {
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
      }

      /*
       * Resize during canvas rendering.
       */
      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        targetWidth;

      canvas.height =
        targetHeight;

      const ctx =
        canvas.getContext("2d", {
          alpha: true,
          willReadFrequently: false,
        });

      if (!ctx) {
        originalBitmap.close();

        throw new Error(
          "Could not create canvas context."
        );
      }

      /*
       * High-quality browser resize.
       */
      ctx.imageSmoothingEnabled =
        true;

      ctx.imageSmoothingQuality =
        "high";

      ctx.drawImage(
        originalBitmap,
        0,
        0,
        targetWidth,
        targetHeight
      );

      originalBitmap.close();

      const blob =
        await new Promise(
          (resolve, reject) => {
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
      console.warn(
        "[Background Remove] createImageBitmap failed, using image fallback:",
        error
      );
    }
  }

  /*
   * =======================================================
   * FALLBACK IMAGE DECODER
   * =======================================================
   */

  const image =
    await loadImage(sourceFile);

  if (!image) {
    throw new Error(
      "Could not decode the source image."
    );
  }

  const sourceWidth =
    image.naturalWidth ||
    image.width;

  const sourceHeight =
    image.naturalHeight ||
    image.height;

  const scale = Math.min(
    1,
    maxSize /
      Math.max(
        sourceWidth,
        sourceHeight
      )
  );

  const targetWidth =
    Math.max(
      1,
      Math.round(
        sourceWidth * scale
      )
    );

  const targetHeight =
    Math.max(
      1,
      Math.round(
        sourceHeight * scale
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
    canvas.getContext("2d", {
      alpha: true,
      willReadFrequently: false,
    });

  if (!ctx) {
    throw new Error(
      "Could not create canvas context."
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

  const blob =
    await new Promise(
      (resolve, reject) => {
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
}

/*
 * =========================================================
 * MASK CLEANUP
 * =========================================================
 *
 * The AI mask contains alpha information.
 *
 * We remove extremely tiny alpha values that can create
 * faint transparent background pixels / dirty edges.
 *
 * IMPORTANT:
 *
 * We do NOT aggressively threshold the mask.
 *
 * Hair, fur and soft edges need intermediate alpha.
 */

async function cleanSegmentationMask(
  maskBlob
) {
  if (!maskBlob) {
    throw new Error(
      "Segmentation mask is empty."
    );
  }

  if (
    typeof createImageBitmap !==
    "function"
  ) {
    return maskBlob;
  }

  let bitmap = null;

  try {
    bitmap =
      await createImageBitmap(
        maskBlob
      );

    const width =
      bitmap.width;

    const height =
      bitmap.height;

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = width;
    canvas.height = height;

    const ctx =
      canvas.getContext(
        "2d",
        {
          alpha: true,
          willReadFrequently: true,
        }
      );

    if (!ctx) {
      bitmap.close();

      return maskBlob;
    }

    ctx.drawImage(
      bitmap,
      0,
      0
    );

    bitmap.close();

    const imageData =
      ctx.getImageData(
        0,
        0,
        width,
        height
      );

    const data =
      imageData.data;

    /*
     * Very small alpha values are usually unwanted
     * background residue.
     *
     * Preserve soft edges between 8 and 247.
     */
    for (
      let i = 0;
      i < data.length;
      i += 4
    ) {
      const alpha =
        data[i + 3];

      if (alpha <= 8) {
        data[i + 3] = 0;
      } else if (alpha >= 247) {
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(
      imageData,
      0,
      0
    );

    const cleaned =
      await new Promise(
        (resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(
                  new Error(
                    "Could not clean segmentation mask."
                  )
                );
              }
            },
            "image/png"
          );
        }
      );

    return cleaned;
  } catch (error) {
    console.warn(
      "[Background Remove] mask cleanup skipped:",
      error
    );

    if (bitmap) {
      try {
        bitmap.close();
      } catch {
        // Ignore
      }
    }

    return maskBlob;
  }
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
  const progressFrameRef =
    useRef(null);

  const progressTargetRef =
    useRef(0);

  const displayedProgressRef =
    useRef(0);

  const operationFinishedRef =
    useRef(false);

  const [backgroundProgress, setBackgroundProgress] =
    useState(0);

  const [backgroundError, setBackgroundError] =
    useState("");

  /*
   * =======================================================
   * PROGRESS ANIMATION
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

    animateProgress();
  };

  const animateProgress = () => {
    if (
      progressFrameRef.current
    ) {
      return;
    }

    const frame = () => {
      const current =
        displayedProgressRef.current;

      /*
       * When the entire operation has really finished,
       * immediately show 100.
       */
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

      /*
       * Fast smooth progress.
       *
       * Never artificially waits at 99.
       */
      const step =
        Math.max(
          0.7,
          difference * 0.28
        );

      const next =
        Math.min(
          current + step,
          target
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
    };
  }, []);

  /*
   * =======================================================
   * REAL IMG.LY PROGRESS
   * =======================================================
   *
   * IMG.LY currently reports processing stages rather than
   * a continuously increasing AI inference percentage.
   *
   * decode
   * inference
   * mask
   * encode
   *
   * So we map those real stages to useful UI ranges.
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
      /*
       * Model/resource loading and image decode.
       */
      if (
        current <= 0
      ) {
        setProgressTarget(3);
      } else {
        setProgressTarget(12);
      }

      return;
    }

    if (
      key === "compute:inference"
    ) {
      /*
       * Segmentation starts.
       */
      setProgressTarget(55);

      return;
    }

    if (
      key === "compute:mask"
    ) {
      /*
       * AI mask generated.
       */
      setProgressTarget(78);

      return;
    }

    if (
      key === "compute:encode"
    ) {
      /*
       * Mask/output encoding.
       */
      if (
        Number(current) >=
        Number(total)
      ) {
        setProgressTarget(88);
      } else {
        setProgressTarget(84);
      }

      return;
    }

    /*
     * Unknown event.
     *
     * Keep UI alive but don't fake a huge jump.
     */
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
   * BACKGROUND REMOVE
   * =======================================================
   */

  async function handleBackgroundRemove() {
    if (
      !workingFile ||
      removingBackground
    ) {
      return;
    }

    try {
      /*
       * ---------------------------------------------------
       * START
       * ---------------------------------------------------
       */

      setRemovingBackground(
        true
      );

      setBackgroundError(
        ""
      );

      /*
       * Reset progress state.
       */
      progressTargetRef.current =
        0;

      displayedProgressRef.current =
        0;

      operationFinishedRef.current =
        false;

      setBackgroundProgress(
        0
      );

      if (
        progressFrameRef.current
      ) {
        cancelAnimationFrame(
          progressFrameRef.current
        );

        progressFrameRef.current =
          null;
      }

      animateProgress();

      /*
       * Keep existing editor behavior.
       */
      setImageOffset({
        x: 0,
        y: 0,
      });

      resetImageDrag();

      /*
       * ---------------------------------------------------
       * DEVICE / MODEL
       * ---------------------------------------------------
       */

      const backgroundConfig =
        getBackgroundConfig();

      const aiMaxSize =
        getAiMaxSize();

      console.log(
        "[Background Remove] configuration:",
        {
          model:
            backgroundConfig.model,
          device:
            backgroundConfig.device,
          weakDevice:
            backgroundConfig.weak,
          aiMaxSize,
        }
      );

      /*
       * ---------------------------------------------------
       * CREATE SMALL AI INPUT
       * ---------------------------------------------------
       *
       * The original image remains untouched.
       *
       * Only this smaller image is used by AI.
       */

      setProgressTarget(5);

      const aiInput =
        await createAiInput(
          workingFile,
          aiMaxSize
        );

      if (!aiInput) {
        throw new Error(
          "Could not create the AI input image."
        );
      }

      setProgressTarget(15);

      /*
       * ---------------------------------------------------
       * SEGMENT FOREGROUND
       * ---------------------------------------------------
       *
       * IMPORTANT:
       *
       * We use segmentForeground instead of
       * removeBackground.
       *
       * This means the AI generates only the mask.
       *
       * The original image is NOT downscaled for final output.
       */

      console.log(
        "[Background Remove] starting segmentation..."
      );

      const mask =
        await segmentForeground(
          aiInput,
          {
            /*
             * GPU when WebGPU is available.
             * CPU otherwise.
             */
            device:
              backgroundConfig.device,

            /*
             * Use the selected model.
             */
            model:
              backgroundConfig.model,

            /*
             * WebGPU can run through a worker.
             * For CPU, current IMG.LY runtime does not
             * actually proxy WASM/CPU calculations.
             */
            proxyToWorker: true,

            /*
             * Mask itself only needs PNG.
             */
            output: {
              format:
                "image/png",
              quality: 1,
            },

            progress: (
              key,
              current,
              total
            ) => {
              handleRealProgress(
                key,
                current,
                total
              );
            },
          }
        );

      if (!mask) {
        throw new Error(
          "AI segmentation returned an empty mask."
        );
      }

      /*
       * Segmentation is actually finished here.
       */
      setProgressTarget(82);

      console.log(
        "[Background Remove] segmentation finished."
      );

      /*
       * ---------------------------------------------------
       * CLEAN MASK
       * ---------------------------------------------------
       */

      const cleanedMask =
        await cleanSegmentationMask(
          mask
        );

      if (!cleanedMask) {
        throw new Error(
          "Could not prepare the segmentation mask."
        );
      }

      setProgressTarget(87);

      /*
       * ---------------------------------------------------
       * APPLY MASK TO ORIGINAL
       * ---------------------------------------------------
       *
       * THIS is the key part.
       *
       * The original full-resolution image is used here.
       *
       * IMG.LY automatically resizes the mask to the
       * original image dimensions when required.
       */

      console.log(
        "[Background Remove] applying mask to original image..."
      );

      const result =
        await applySegmentationMask(
          workingFile,
          cleanedMask,
          {
            /*
             * Final output should remain PNG because
             * the editor expects transparent PNG.
             */
            output: {
              format:
                "image/png",
              quality: 1,
            },

            /*
             * We don't need another AI pass here.
             */
            proxyToWorker: true,

            /*
             * Keep config valid for IMG.LY.
             */
            device:
              backgroundConfig.device,

            model:
              backgroundConfig.model,
          }
        );

      if (!result) {
        throw new Error(
          "Could not apply the AI background mask."
        );
      }

      /*
       * At this point the actual transparent image exists.
       */
      setProgressTarget(94);

      /*
       * ---------------------------------------------------
       * CREATE EDITOR PNG FILE
       * ---------------------------------------------------
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
          "Could not create the transparent PNG file."
        );
      }

      setProgressTarget(97);

      /*
       * ---------------------------------------------------
       * LOAD FINAL IMAGE
       * ---------------------------------------------------
       */

      const newImage =
        await loadImage(
          newFile
        );

      if (!newImage) {
        throw new Error(
          "The generated transparent image could not be loaded."
        );
      }

      /*
       * ---------------------------------------------------
       * REGISTER LAYER
       * ---------------------------------------------------
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
       * ---------------------------------------------------
       * APPLY RESULT
       * ---------------------------------------------------
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
       * ---------------------------------------------------
       * REAL FINISH
       * ---------------------------------------------------
       *
       * We only show 100 AFTER:
       *
       * 1. AI finished
       * 2. mask was cleaned
       * 3. mask applied to original
       * 4. PNG created
       * 5. final image loaded
       * 6. editor state updated
       *
       * Therefore there is no fake 99% waiting.
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

      if (
        progressFrameRef.current
      ) {
        cancelAnimationFrame(
          progressFrameRef.current
        );

        progressFrameRef.current =
          null;
      }

      console.log(
        "[Background Remove] completed successfully."
      );
    } catch (error) {
      console.error(
        "[Background Remove] failed:",
        error
      );

      setBackgroundError(
        error?.message ||
          "Background removal failed."
      );

      /*
       * Stop progress animation.
       */
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
   * RETURN
   * =======================================================
   */

  return {
    backgroundProgress,
    backgroundError,
    handleBackgroundRemove,
  };
}
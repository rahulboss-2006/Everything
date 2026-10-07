
import { useEffect, useState } from "react";
import {
  Crop,
  Eraser,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Check,
  Loader2,
  Scissors,
  Sparkles,
  Maximize2,
} from "lucide-react";

function EditorControls({
  brightness,
  setBrightness,

  contrast,
  setContrast,

  saturation,
  setSaturation,

  editorControlsDisabled,

  activeTool,

  startCrop,
  startResize,

  removingBackground,
  backgroundPreparing,
  backgroundReady,
  backgroundRemoved,
  handleBackgroundRemove,
  handleObjectRemove,

  canvasRef,
  setEffectPreviewSrc,
  setShowEffects,

  handleAIObjectRemove,
  aiObjectMode,
  aiObjectRemoved = false,
  objectApplying,

  handleRotate,
  handleFlipHorizontal,
  handleFlipVertical,

  handleReset,
  handleApply,
  applying,
}) {
  const [showObjectRemoved, setShowObjectRemoved] =
    useState(false);

  /*
   * A.O.R success feedback only.
   *
   * IMPORTANT:
   * This does NOT disable A.O.R.
   *
   * User can use A.O.R again and again.
   */
  useEffect(() => {
    if (!aiObjectRemoved) {
      return;
    }

    setShowObjectRemoved(true);

    const timeoutId = setTimeout(() => {
      setShowObjectRemoved(false);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [aiObjectRemoved]);

  /*
   * A.O.R can always be clicked unless the editor itself
   * is globally disabled or an operation is currently running.
   */
  const aiObjectButtonDisabled =
    editorControlsDisabled ||
    objectApplying;

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* ADJUSTMENTS */}
      <div className="w-full min-w-0 rounded-2xl border border-slate-200/70 bg-slate-50 p-3 sm:p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles
            size={18}
            className="shrink-0 text-violet-500"
          />

          <h3 className="truncate font-semibold text-slate-900 dark:text-white">
            Adjustments
          </h3>
        </div>

        {[
          [
            "Brightness",
            brightness,
            setBrightness,
          ],
          [
            "Contrast",
            contrast,
            setContrast,
          ],
          [
            "Saturation",
            saturation,
            setSaturation,
          ],
        ].map((item) => (
          <div
            key={item[0]}
            className={
              item[0] === "Saturation"
                ? ""
                : "mb-4"
            }
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="min-w-0 truncate text-sm text-slate-600 dark:text-slate-300">
                {item[0]}
              </label>

              <span className="shrink-0 text-xs text-slate-500">
                {item[1]}
              </span>
            </div>

            <input
              type="range"
              min="-100"
              max="100"
              step="10"
              value={item[1]}
              disabled={
                editorControlsDisabled
              }
              onChange={(event) =>
                item[2](
                  Number(
                    event.target.value
                  )
                )
              }
              className="block w-full min-w-0"
            />
          </div>
        ))}
      </div>

      {/* TOOLS */}
      <div className="w-full min-w-0 rounded-2xl border border-slate-200/70 bg-slate-50 p-3 sm:p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
          Tools
        </h3>

        <div className="grid w-full min-w-0 grid-cols-2 gap-2">
          {/* Crop */}
          <button
            type="button"
            onClick={startCrop}
            disabled={
              editorControlsDisabled
            }
            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium transition sm:px-3 disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTool === "crop"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            }`}
          >
            <Crop
              size={17}
              className="shrink-0"
            />

            <span className="truncate">
              Crop
            </span>
          </button>

          {/* Resize */}
          <button
            type="button"
            onClick={startResize}
            disabled={
              editorControlsDisabled
            }
            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium transition sm:px-3 disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTool === "resize"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            }`}
          >
            <Maximize2
              size={17}
              className="shrink-0"
            />

            <span className="truncate">
              Resize
            </span>
          </button>

          {/* Remove Background */}
          <button
            type="button"
            onClick={
              handleBackgroundRemove
            }
            disabled={
              editorControlsDisabled ||
              removingBackground ||
              backgroundRemoved
            }
            className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-white px-2 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            {removingBackground ? (
              <Loader2
                size={17}
                className="shrink-0 animate-spin"
              />
            ) : (
              <Eraser
                size={17}
                className="shrink-0"
              />
            )}

            <span className="truncate">
              {removingBackground
                ? "Removing..."
                : "Remove BG"}
            </span>
          </button>

          {/* Object */}
          <button
            type="button"
            onClick={handleObjectRemove}
            disabled={
              editorControlsDisabled
            }
            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium transition sm:px-3 disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTool === "object"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            }`}
          >
            <Scissors
              size={17}
              className="shrink-0"
            />

            <span className="truncate">
              Object
            </span>
          </button>

          {/* Effects */}
          <button
            type="button"
            title="Total 100 effects have"
            aria-label="Total 100 effects have"
            onClick={() => {
              const canvas =
                canvasRef.current;

              if (canvas) {
                try {
                  setEffectPreviewSrc(
                    canvas.toDataURL(
                      "image/png"
                    )
                  );
                } catch (error) {
                  console.error(
                    "Could not prepare Effects preview:",
                    error
                  );
                }
              }

              setShowEffects(true);
            }}
            disabled={
              editorControlsDisabled
            }
            className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-white px-2 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <Sparkles
              size={17}
              className="shrink-0"
            />

            <span className="truncate">
              Effects
            </span>
          </button>

          {/* =================================================
              AI OBJECT REMOVE — REUSABLE
          ================================================= */}
          <button
            type="button"
            title="AI Object Remove"
            aria-label="AI Object Remove"
            onClick={
              handleAIObjectRemove
            }
            disabled={
              aiObjectButtonDisabled
            }
            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium transition sm:px-3 disabled:cursor-not-allowed disabled:opacity-50 ${
              aiObjectMode
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            }`}
          >
            {objectApplying &&
            aiObjectMode ? (
              <Loader2
                size={17}
                className="shrink-0 animate-spin"
              />
            ) : (
              <Sparkles
                size={17}
                className="shrink-0"
              />
            )}

            <span className="truncate">
              {objectApplying
                ? "Removing..."
                : showObjectRemoved
                  ? "Removed"
                  : "A.O.R"}
            </span>
          </button>
        </div>
      </div>

      {/* TRANSFORM */}
      <div className="w-full min-w-0 rounded-2xl border border-slate-200/70 bg-slate-50 p-3 sm:p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
          Transform
        </h3>

        <div className="grid w-full min-w-0 grid-cols-3 gap-2">
          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            disabled={
              editorControlsDisabled
            }
            className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-white px-1.5 py-2.5 text-xs text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <RotateCcw
              size={10}
              className="shrink-0"
            />

            <span className="truncate">
              Rotate
            </span>
          </button>

          {/* Flip X */}
          <button
            type="button"
            onClick={
              handleFlipHorizontal
            }
            disabled={
              editorControlsDisabled
            }
            className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-white px-1.5 py-2.5 text-xs text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <FlipHorizontal
              size={10}
              className="shrink-0"
            />

            <span className="truncate">
              Flip X
            </span>
          </button>

          {/* Flip Y */}
          <button
            type="button"
            onClick={
              handleFlipVertical
            }
            disabled={
              editorControlsDisabled
            }
            className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-white px-1.5 py-2.5 text-xs text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <FlipVertical
              size={10}
              className="shrink-0"
            />

            <span className="truncate">
              Flip Y
            </span>
          </button>
        </div>
      </div>

      {/* RESET */}
      <button
        type="button"
        onClick={handleReset}
        disabled={
          editorControlsDisabled
        }
        className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
      >
        <RotateCcw
          size={17}
          className="shrink-0"
        />

        <span className="truncate">
          Reset Changes
        </span>
      </button>

      {/* APPLY */}
      <button
        type="button"
        onClick={handleApply}
        disabled={
          editorControlsDisabled
        }
        className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
      >
        {applying ? (
          <>
            <Loader2
              size={18}
              className="shrink-0 animate-spin"
            />

            <span className="truncate">
              Applying...
            </span>
          </>
        ) : (
          <>
            <Check
              size={18}
              className="shrink-0"
            />

            <span className="truncate">
              Apply Changes
            </span>
          </>
        )}
      </button>
    </div>
  );
}

export default EditorControls;

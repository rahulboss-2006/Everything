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
  handleBackgroundRemove,

  handleObjectRemove,

  canvasRef,
  setEffectPreviewSrc,
  setShowEffects,

  handleAIObjectRemove,
  aiObjectMode,
  objectApplying,

  handleRotate,
  handleFlipHorizontal,
  handleFlipVertical,

  handleReset,
  handleApply,
  applying,
}) {
  return (
    <div className="space-y-5">
      {/* ADJUSTMENTS */}
      <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles
            size={18}
            className="text-violet-500"
          />

          <h3 className="font-semibold text-slate-900 dark:text-white">
            Adjustments
          </h3>
        </div>

        {[
          ["Brightness", brightness, setBrightness],
          ["Contrast", contrast, setContrast],
          ["Saturation", saturation, setSaturation],
        ].map((item) => (
          <div
            key={item[0]}
            className={
              item[0] === "Saturation"
                ? ""
                : "mb-4"
            }
          >
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-slate-600 dark:text-slate-300">
                {item[0]}
              </label>

              <span className="text-xs text-slate-500">
                {item[1]}
              </span>
            </div>

            <input
              type="range"
              min="-100"
              max="100"
              step="10"
              value={item[1]}
              disabled={editorControlsDisabled}
              onChange={(event) =>
                item[2](Number(event.target.value))
              }
              className="w-full"
            />
          </div>
        ))}
      </div>

      {/* TOOLS */}
      <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
          Tools
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {/* Crop */}
          <button
            type="button"
            onClick={startCrop}
            disabled={editorControlsDisabled}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTool === "crop"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            }`}
          >
            <Crop size={17} />
            Crop
          </button>

          {/* Resize */}
          <button
            type="button"
            onClick={startResize}
            disabled={editorControlsDisabled}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTool === "resize"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            }`}
          >
            <Maximize2 size={17} />
            Resize
          </button>

          {/* Remove Background */}
          <button
            type="button"
            onClick={handleBackgroundRemove}
            disabled={editorControlsDisabled}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            {removingBackground ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Eraser size={17} />
            )}

            {removingBackground
              ? "Removing..."
              : "Remove BG"}
          </button>

          {/* Object */}
          <button
            type="button"
            onClick={handleObjectRemove}
            disabled={editorControlsDisabled}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTool === "object"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            }`}
          >
            <Scissors size={17} />
            Object
          </button>

          {/* Effects */}
          <button
            type="button"
            title="Total 100 effects have"
            aria-label="Total 100 effects have"
            onClick={() => {
              const canvas = canvasRef.current;

              if (canvas) {
                try {
                  setEffectPreviewSrc(
                    canvas.toDataURL("image/png")
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
            disabled={editorControlsDisabled}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <Sparkles size={17} />
            Effects
          </button>

          {/* AI Object Remove */}
          <button
            type="button"
            title="AI Object Remove"
            aria-label="AI Object Remove"
            onClick={handleAIObjectRemove}
            disabled={editorControlsDisabled}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              aiObjectMode
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            }`}
          >
            {objectApplying && aiObjectMode ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Sparkles size={17} />
            )}

            A.O.R
          </button>
        </div>
      </div>

      {/* TRANSFORM */}
      <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
          Transform
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            disabled={editorControlsDisabled}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <RotateCcw size={17} />
            Rotate
          </button>

          {/* Flip X */}
          <button
            type="button"
            onClick={handleFlipHorizontal}
            disabled={editorControlsDisabled}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <FlipHorizontal size={17} />
            Flip X
          </button>

          {/* Flip Y */}
          <button
            type="button"
            onClick={handleFlipVertical}
            disabled={editorControlsDisabled}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            <FlipVertical size={17} />
            Flip Y
          </button>
        </div>
      </div>

      {/* RESET */}
      <button
        type="button"
        onClick={handleReset}
        disabled={editorControlsDisabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
      >
        <RotateCcw size={17} />
        Reset Changes
      </button>

      {/* APPLY */}
      <button
        type="button"
        onClick={handleApply}
        disabled={editorControlsDisabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {applying ? (
          <>
            <Loader2
              size={18}
              className="animate-spin"
            />
            Applying...
          </>
        ) : (
          <>
            <Check size={18} />
            Apply Changes
          </>
        )}
      </button>
    </div>
  );
}

export default EditorControls;
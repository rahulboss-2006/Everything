import {
  Check,
  X,
  Loader2,
  Link2,
  Maximize2,
  GripHorizontal,
} from "lucide-react";

export default function ResizeDock({
  resizeMode,
  resizeWidth,
  resizeHeight,
  resizeUnit,
  resizeResolution,
  resizeResample,
  resizeLockRatio,
  applying,
  getDisplayValue,
  handleResizeWidthChange,
  handleResizeHeightChange,
  handleResizeUnitChange,
  handleResolutionChange,
  setResizeLockRatio,
  setResizeResample,
  resetResizeDimensions,
  cancelResize,
  applyResize,
}) {
  if (!resizeMode) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center px-1 pb-[max(0.15rem,env(safe-area-inset-bottom))] sm:px-3 sm:pb-3">
      <div className="pointer-events-auto w-full max-w-2xl min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {/* Independent scroll prevents the dock from becoming taller than short screens. */}
        <div className="max-h-[min(38dvh,300px)] overflow-y-auto sm:max-h-[min(72dvh,560px)] overscroll-contain">
          <div
            title="Drag to move  •  Double-click to reset position"
            className="flex select-none items-center justify-center px-1 pt-0.5 text-slate-500 sm:px-2 sm:pt-1.5 transition hover:text-slate-300"
          >
            <GripHorizontal size={18} />
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-1.5 pb-1 pt-0 sm:px-4 sm:pb-3 sm:pt-1">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-violet-600/15 text-violet-400">
                <Maximize2 size={16} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">Image Size</div>
                <div className="hidden text-[10px] text-slate-500 sm:block">
                  Resize image dimensions
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={resetResizeDimensions}
              disabled={applying}
              className="shrink-0 rounded-lg px-2 py-1 text-[10px] sm:px-2.5 sm:py-1.5 sm:text-[11px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              Reset
            </button>
          </div>

          <div className="grid gap-1.5 px-1.5 py-1.5 sm:grid-cols-2 sm:gap-4 sm:px-4 sm:py-4 lg:grid-cols-[1fr_1fr_150px]">
            <div className="min-w-0">
              <div className="mb-0.5 text-[8px] font-semibold sm:mb-2 sm:text-[10px] uppercase tracking-wider text-slate-500">
                Pixel Dimensions
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-end gap-1.5 sm:gap-2">
                <label className="block min-w-0">
                  <span className="mb-0 block text-[8px] sm:mb-1 sm:text-[10px] font-medium text-slate-400">Width</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={getDisplayValue(resizeWidth, resizeUnit, "width")}
                    onChange={handleResizeWidthChange}
                    className="h-7 w-full min-w-0 sm:h-9 rounded-lg border border-white/10 bg-white/5 px-1 text-[11px] sm:px-2.5 sm:text-sm text-white outline-none transition focus:border-violet-500 focus:bg-white/10 sm:px-2.5"
                  />
                </label>

                <button
                  type="button"
                  title={resizeLockRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
                  onClick={() => setResizeLockRatio((current) => !current)}
                  className={`mb-0.5 flex h-6 w-5 shrink-0 sm:h-8 sm:w-7 items-center justify-center rounded-md transition ${
                    resizeLockRatio ? "text-violet-400" : "text-slate-600 hover:text-slate-300"
                  }`}
                >
                  <Link2 size={15} />
                </button>

                <label className="block min-w-0">
                  <span className="mb-0 block text-[8px] sm:mb-1 sm:text-[10px] font-medium text-slate-400">Height</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={getDisplayValue(resizeHeight, resizeUnit, "height")}
                    onChange={handleResizeHeightChange}
                    className="h-7 w-full min-w-0 sm:h-9 rounded-lg border border-white/10 bg-white/5 px-1 text-[11px] sm:px-2.5 sm:text-sm text-white outline-none transition focus:border-violet-500 focus:bg-white/10 sm:px-2.5"
                  />
                </label>
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-0.5 text-[8px] font-semibold sm:mb-2 sm:text-[10px] uppercase tracking-wider text-slate-500">
                Document Size
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_78px] gap-2 sm:grid-cols-[minmax(0,1fr)_86px]">
                <label className="block min-w-0">
                  <span className="mb-0 block text-[8px] sm:mb-1 sm:text-[10px] font-medium text-slate-400">Unit</span>
                  <select
                    value={resizeUnit}
                    onChange={handleResizeUnitChange}
                    className="h-7 w-full min-w-0 sm:h-9 rounded-lg border border-white/10 bg-slate-900 px-1 text-[10px] sm:px-2.5 sm:text-xs text-white outline-none focus:border-violet-500 sm:px-2.5"
                  >
                    <option value="pixels">Pixels</option>
                    <option value="inches">Inches</option>
                    <option value="cm">Centimeters</option>
                    <option value="percent">Percent</option>
                  </select>
                </label>

                <label className="block min-w-0">
                  <span className="mb-0 block text-[8px] sm:mb-1 sm:text-[10px] font-medium text-slate-400">Resolution</span>
                  <input
                    type="number"
                    min="1"
                    max="2400"
                    value={resizeResolution}
                    onChange={handleResolutionChange}
                    disabled={resizeUnit === "percent" || resizeUnit === "pixels"}
                    className="h-7 w-full min-w-0 sm:h-9 rounded-lg border border-white/10 bg-white/5 px-1 text-[10px] sm:px-2.5 sm:text-xs text-white outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-40 sm:px-2.5"
                  />
                </label>
              </div>
            </div>

            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <div className="mb-0.5 text-[8px] font-semibold sm:mb-2 sm:text-[10px] uppercase tracking-wider text-slate-500">
                Resample
              </div>

              <button
                type="button"
                onClick={() => setResizeResample((current) => !current)}
                className="flex h-9 w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-1.5 text-[10px] text-slate-200 sm:px-2.5 sm:text-xs transition hover:bg-white/10"
              >
                <span>{resizeResample ? "Automatic" : "Nearest"}</span>
                <span className={`h-2 w-2 rounded-full ${resizeResample ? "bg-violet-500" : "bg-slate-600"}`} />
              </button>

              <div className="hidden sm:mt-1.5 sm:block sm:text-[9px] text-slate-500">
                {resizeResample ? "High quality smoothing" : "Hard pixel edges"}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-white/10 px-1.5 py-1 sm:flex sm:px-4 sm:py-3-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
            <div className="text-[10px] text-slate-500">
              {Math.round(resizeWidth).toLocaleString()} × {Math.round(resizeHeight).toLocaleString()} px
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                type="button"
                onClick={cancelResize}
                disabled={applying}
                className="flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[10px] sm:gap-1.5 sm:px-3 sm:py-2 sm:text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={15} />
                Cancel
              </button>

              <button
                type="button"
                onClick={applyResize}
                disabled={applying || resizeWidth < 1 || resizeHeight < 1}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applying ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Resizing...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Apply Resize
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  Check,
  X,
  Loader2,
  ZoomIn,
  ZoomOut,
  GripHorizontal,
} from "lucide-react";

// Same limits as the mouse-wheel zoom in ImageEditor.jsx.
const MIN_ZOOM = 1;
const MAX_ZOOM = 1000;
const ZOOM_FACTOR = 1.1;

function clampZoom(value) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

/*
  Zoom buttons behave exactly like the mouse wheel:
  the step is proportional to the current zoom, so it feels the same at 5%
  and at 500%, and it never gets stuck because of rounding.
*/
function stepZoom(current, direction) {
  const factor = direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
  let next = current * factor;

  if (Math.round(next) === current) {
    next = current + direction;
  }

  return clampZoom(Math.round(next));
}

const CropDock = ({
  activeTool,
  CROP_PRESETS,
  cropPreset,
  handleCropPreset,
  zoom,
  setZoom,
  cancelCrop,
  applyCrop,
  applying,
}) => {
  if (activeTool !== "crop") {
    return null;
  }

  return (
    <div className="absolute bottom-3 left-[40.6%] z-50 w-[calc(100%-1rem)] max-w-2xl -translate-x-1/2 sm:bottom-4 sm:w-[calc(100%-2rem)]">

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">

        {/* DRAG GRIP
            Wrapped by <DraggableDock> in ImageEditor.jsx.
            Grab this bar (or any empty part of the dock) to move it.
            Double-click to put it back. */}

        <div
          title="Drag to move  •  Double-click to reset position"
          className="flex select-none items-center justify-center pt-1.5 text-slate-500 transition hover:text-slate-300"
        >
          <GripHorizontal size={18} />
        </div>

        <div className="flex gap-2 overflow-x-auto overscroll-contain border-b border-white/10 px-3 pb-2.5 pt-1"
  onWheel={(event) => {
    const el = event.currentTarget;

    const delta =
      Math.abs(event.deltaY) > Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;

    if (!delta) {
      return;
    }

    if (el.scrollWidth <= el.clientWidth) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    el.scrollLeft += delta;
  }}>

          {CROP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleCropPreset(preset.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                cropPreset === preset.id
                  ? "bg-violet-600 text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {preset.label}
            </button>
          ))}

        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-3">

          <div className="flex items-center gap-1">

            <button
              type="button"
              onClick={() => setZoom((current) => stepZoom(current, -1))}
              disabled={zoom <= MIN_ZOOM}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomOut size={18} />
            </button>

            <span
              className="min-w-[52px] cursor-ns-resize select-none text-center text-sm font-semibold text-white"
              onWheel={(event) => {
                event.preventDefault();
                event.stopPropagation();

                const direction = event.deltaY < 0 ? 1 : -1;

                setZoom((current) =>
                  stepZoom(current, direction)
                );
              }}
            >
              {zoom}%
            </span>

            <button
              type="button"
              onClick={() => setZoom((current) => stepZoom(current, 1))}
              disabled={zoom >= MAX_ZOOM}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomIn size={18} />
            </button>

            <button
              type="button"
              onClick={() => setZoom(100)}
              className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              Reset
            </button>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={cancelCrop}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <X size={15} />
              Cancel
            </button>

            <button
              type="button"
              onClick={applyCrop}
              disabled={applying}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applying ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Check size={15} />
              )}

              Apply
            </button>

          </div>

        </div>

      </div>

    </div>
  );
};

export default CropDock;

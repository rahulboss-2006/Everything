
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
  const factor =
    direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;

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
    <div
      className="
        absolute
        bottom-3
        z-50

        /* Desktop: KEEP YOUR EXISTING POSITION */
        left-[40.6%]
        w-[calc(100%-1rem)]
        max-w-2xl
        -translate-x-1/2

        /* Tablet */
        md:bottom-4

        /* Small screens */
        max-md:left-2
        max-md:right-2
        max-md:w-auto
        max-md:max-w-none
        max-md:translate-x-0

        /* Very small screens */
        max-[480px]:bottom-2
        max-[480px]:left-2
        max-[480px]:right-2
      "
    >
      <div
        className="
          w-full
          overflow-hidden
          rounded-2xl
          border
          border-white/10
          bg-slate-950/90
          shadow-[0_20px_80px_rgba(0,0,0,0.45)]
          backdrop-blur-xl
        "
      >
        {/* DRAG GRIP */}
        <div
          title="Drag to move  •  Double-click to reset position"
          className="
            flex
            min-h-6
            select-none
            items-center
            justify-center
            pt-1.5
            text-slate-500
            transition
            hover:text-slate-300

            max-[480px]:min-h-5
            max-[480px]:pt-1
          "
        >
          <GripHorizontal
            size={18}
            className="max-[480px]:h-4 max-[480px]:w-4"
          />
        </div>

        {/* CROP PRESETS */}
        <div
          className="
            flex
            min-w-0
            gap-2
            overflow-x-auto
            overscroll-contain
            border-b
            border-white/10
            px-3
            pb-2.5
            pt-1

            scrollbar-none

            max-[480px]:gap-1.5
            max-[480px]:px-2.5
            max-[480px]:pb-2
          "
          onWheel={(event) => {
            const el = event.currentTarget;

            const delta =
              Math.abs(event.deltaY) >
              Math.abs(event.deltaX)
                ? event.deltaY
                : event.deltaX;

            if (!delta) {
              return;
            }

            if (
              el.scrollWidth <=
              el.clientWidth
            ) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            el.scrollLeft += delta;
          }}
        >
          {CROP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                handleCropPreset(preset.id)
              }
              className={`
                shrink-0
                whitespace-nowrap
                rounded-lg
                px-3
                py-1.5
                text-xs
                font-medium
                transition

                max-[480px]:px-2.5
                max-[480px]:py-1.5
                max-[480px]:text-[11px]

                ${
                  cropPreset === preset.id
                    ? "bg-violet-600 text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* BOTTOM CONTROLS */}
        <div
          className="
            flex
            min-w-0
            items-center
            justify-between
            gap-3
            px-3
            py-3

            /* Tablet */
            max-md:gap-2

            /* Mobile */
            max-[640px]:flex-col
            max-[640px]:items-stretch
            max-[640px]:gap-2.5
            max-[640px]:px-2.5
            max-[640px]:py-2.5
          "
        >
          {/* ZOOM CONTROLS */}
          <div
            className="
              flex
              min-w-0
              shrink
              items-center
              gap-1

              max-[640px]:justify-center
            "
          >
            {/* Zoom Out */}
            <button
              type="button"
              onClick={() =>
                setZoom((current) =>
                  stepZoom(current, -1)
                )
              }
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-slate-300
                transition
                hover:bg-white/10
                hover:text-white
                disabled:cursor-not-allowed
                disabled:opacity-40

                max-[480px]:h-8
                max-[480px]:w-8
              "
            >
              <ZoomOut
                size={18}
                className="max-[480px]:h-4 max-[480px]:w-4"
              />
            </button>

            {/* Zoom Value */}
            <span
              className="
                min-w-[52px]
                cursor-ns-resize
                select-none
                text-center
                text-sm
                font-semibold
                text-white

                max-[480px]:min-w-[48px]
                max-[480px]:text-xs
              "
              onWheel={(event) => {
                event.preventDefault();
                event.stopPropagation();

                const direction =
                  event.deltaY < 0 ? 1 : -1;

                setZoom((current) =>
                  stepZoom(
                    current,
                    direction
                  )
                );
              }}
            >
              {zoom}%
            </span>

            {/* Zoom In */}
            <button
              type="button"
              onClick={() =>
                setZoom((current) =>
                  stepZoom(current, 1)
                )
              }
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-slate-300
                transition
                hover:bg-white/10
                hover:text-white
                disabled:cursor-not-allowed
                disabled:opacity-40

                max-[480px]:h-8
                max-[480px]:w-8
              "
            >
              <ZoomIn
                size={18}
                className="max-[480px]:h-4 max-[480px]:w-4"
              />
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="
                ml-1
                shrink-0
                rounded-lg
                px-2.5
                py-1.5
                text-xs
                font-medium
                text-slate-400
                transition
                hover:bg-white/10
                hover:text-white

                max-[480px]:px-2
                max-[480px]:text-[11px]
              "
            >
              Reset
            </button>
          </div>

          {/* CANCEL / APPLY */}
          <div
            className="
              flex
              shrink-0
              items-center
              gap-2

              max-[640px]:w-full
            "
          >
            {/* Cancel */}
            <button
              type="button"
              onClick={cancelCrop}
              className="
                flex
                min-w-0
                shrink
                items-center
                justify-center
                gap-1.5
                rounded-lg
                px-3
                py-2
                text-xs
                font-semibold
                text-slate-300
                transition
                hover:bg-white/10
                hover:text-white

                max-[640px]:flex-1
                max-[480px]:py-2
              "
            >
              <X
                size={15}
                className="shrink-0"
              />

              <span>Cancel</span>
            </button>

            {/* Apply */}
            <button
              type="button"
              onClick={applyCrop}
              disabled={applying}
              className="
                flex
                min-w-0
                shrink
                items-center
                justify-center
                gap-1.5
                rounded-lg
                bg-violet-600
                px-3
                py-2
                text-xs
                font-semibold
                text-white
                transition
                hover:bg-violet-700
                disabled:cursor-not-allowed
                disabled:opacity-50

                max-[640px]:flex-1
                max-[480px]:py-2
              "
            >
              {applying ? (
                <Loader2
                  size={15}
                  className="
                    shrink-0
                    animate-spin
                  "
                />
              ) : (
                <Check
                  size={15}
                  className="shrink-0"
                />
              )}

              <span>
                {applying ? "Applying..." : "Apply"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropDock;

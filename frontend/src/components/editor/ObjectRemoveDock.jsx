
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, Loader2, GripHorizontal } from "lucide-react";

// Elements that should keep their normal behaviour.
const NO_DRAG_SELECTOR =
  'button, input, select, textarea, label, a, [role="slider"], [data-no-drag]';

const EDGE = 8;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const ObjectRemoveDock = ({
  objectMode,
  aiObjectMode,
  objectBrushSize,
  setObjectBrushSize,
  cancelObjectRemove,
  applyObjectRemove,
  objectApplying,
  anchor, // { left, width, top }
}) => {
  const dockRef = useRef(null);
  const dragRef = useRef(null);
  const rafRef = useRef(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  /*
   * Reset the dock when the viewport changes.
   * This keeps the default position correct on:
   * - desktop resize
   * - mobile orientation change
   * - browser resize
   */
  useEffect(() => {
    const handleResize = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      dragRef.current = null;
      setDragging(false);
      setOffset({ x: 0, y: 0 });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  /*
   * Cleanup animation frame on unmount.
   */
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  /*
   * Global pointer listeners while dragging.
   *
   * requestAnimationFrame prevents React from rendering on every
   * pointermove event, which makes the movement much smoother.
   */
  useEffect(() => {
    if (!dragging) return undefined;

    const handleMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;

      drag.latestX = event.clientX;
      drag.latestY = event.clientY;

      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;

        const currentDrag = dragRef.current;
        if (!currentDrag) return;

        const dx = currentDrag.latestX - currentDrag.startX;
        const dy = currentDrag.latestY - currentDrag.startY;

        const nextX = clamp(
          currentDrag.originX + dx,
          currentDrag.minX,
          currentDrag.maxX
        );

        const nextY = clamp(
          currentDrag.originY + dy,
          currentDrag.minY,
          currentDrag.maxY
        );

        setOffset({
          x: nextX,
          y: nextY,
        });
      });
    };

    const handleUp = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      dragRef.current = null;
      setDragging(false);
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;

      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [dragging]);

  if (!objectMode || !anchor) {
    return null;
  }

  /*
   * Responsive width.
   *
   * Desktop: up to 672px
   * Mobile: viewport minus 16px
   */
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : anchor.width;

  const dockWidth = Math.min(
    672,
    Math.max(240, viewportWidth - EDGE * 2)
  );

  function handlePointerDown(event) {
    if (event.button !== 0) return;

    if (event.target.closest?.(NO_DRAG_SELECTOR)) {
      return;
    }

    const dock = dockRef.current;
    if (!dock) return;

    event.preventDefault();

    /*
     * Capture the pointer so dragging remains smooth even when the
     * pointer moves outside the dock.
     */
    try {
      dock.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is not available in some environments.
    }

    const rect = dock.getBoundingClientRect();

    /*
     * Current offset is already reflected in rect.
     *
     * Calculate how much the dock is allowed to move from its
     * current position while remaining inside the viewport.
     */
    const minX = EDGE - rect.left + offset.x;
    const maxX = window.innerWidth - EDGE - rect.right + offset.x;

    const minY = EDGE - rect.top + offset.y;
    const maxY = window.innerHeight - EDGE - rect.bottom + offset.y;

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,

      originX: offset.x,
      originY: offset.y,

      minX,
      maxX,
      minY,
      maxY,

      latestX: event.clientX,
      latestY: event.clientY,
    };

    setDragging(true);
  }

  function handleDoubleClick(event) {
    if (event.target.closest?.(NO_DRAG_SELECTOR)) {
      return;
    }

    setOffset({ x: 0, y: 0 });
  }

  return createPortal(
    <div
      ref={dockRef}
      className={[
        "fixed z-[150]",
        "select-none",
        "touch-none",
        dragging ? "cursor-grabbing" : "cursor-grab",
      ].join(" ")}
      style={{
        left: anchor.left + anchor.width / 2,
        top: anchor.top,
        width: dockWidth,

        /*
         * GPU-friendly transform.
         *
         * translate3d() generally gives smoother movement than
         * repeatedly changing left/top.
         */
        transform: `translate3d(
          calc(-50% + ${offset.x}px),
          ${offset.y}px,
          0
        )`,

        /*
         * Helps the browser optimize this element for dragging.
         */
        willChange: dragging ? "transform" : "auto",

        /*
         * Prevents mobile browsers from interpreting the drag
         * as scrolling/zooming.
         */
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 px-3 pb-3 pt-1.5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        {/* Drag grip */}
        <div
          title="Drag to move • Double-click to reset position"
          className="flex select-none items-center justify-center pb-1 text-slate-500 transition-colors hover:text-slate-300"
        >
          <GripHorizontal size={18} />
        </div>

        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-white">
            {aiObjectMode ? "AI Object Remove" : "Object Eraser"}
          </div>

          <div className="break-words text-[10px] leading-snug text-slate-400">
            {aiObjectMode
              ? "Brush over the object — AI will reconstruct the matching background"
              : "Brush over the object"}
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-3">
          <input
            type="range"
            min="10"
            max="150"
            step="10"
            value={objectBrushSize}
            onChange={(event) =>
              setObjectBrushSize(Number(event.target.value))
            }
            className="min-w-0 flex-1"
          />

          <span className="min-w-[36px] shrink-0 text-center text-xs font-semibold text-white">
            {objectBrushSize}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={cancelObjectRemove}
            disabled={objectApplying}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X size={15} />
            Cancel
          </button>

          <button
            type="button"
            onClick={applyObjectRemove}
            disabled={objectApplying}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {objectApplying ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}

            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ObjectRemoveDock;

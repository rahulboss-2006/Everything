import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, Loader2, GripHorizontal } from "lucide-react";

// Elements that must keep their normal behaviour instead of starting a drag.
const NO_DRAG_SELECTOR =
  'button, input, select, textarea, label, a, [role="slider"], [data-no-drag]';

const EDGE = 8;

function clampRange(value, min, max) {
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
  /*
    All hooks MUST stay above the early return below, otherwise React
    throws "Rendered more hooks than during the previous render" when
    objectMode toggles.
  */

  const dockRef = useRef(null);
  const dragRef = useRef(null);

  // Offset from the default position (just below the canvas).
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // The default position depends on the window size, so snap back on resize.
  useEffect(() => {
    function handleResize() {
      setOffset({ x: 0, y: 0 });
    }

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Global listeners only while a drag is active.
  useEffect(() => {
    if (!dragging) return undefined;

    function handleMove(event) {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = clampRange(
        event.clientX - drag.startX,
        drag.minDx,
        drag.maxDx
      );

      const dy = clampRange(
        event.clientY - drag.startY,
        drag.minDy,
        drag.maxDy
      );

      setOffset({ x: drag.originX + dx, y: drag.originY + dy });
    }

    function handleUp() {
      dragRef.current = null;
      setDragging(false);
    }

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;

      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dragging]);

  if (!objectMode || !anchor) {
    return null;
  }

  const dockWidth = Math.max(280, Math.min(anchor.width - 16, 672));

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    if (event.target.closest?.(NO_DRAG_SELECTOR)) return;

    const dock = dockRef.current;
    if (!dock) return;

    event.preventDefault();

    // Current on-screen box (already includes the current offset).
    const rect = dock.getBoundingClientRect();

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      minDx: EDGE - rect.left,
      maxDx: window.innerWidth - EDGE - rect.right,
      minDy: EDGE - rect.top,
      maxDy: window.innerHeight - EDGE - rect.bottom,
    };

    setDragging(true);
  }

  function handleDoubleClick(event) {
    if (event.target.closest?.(NO_DRAG_SELECTOR)) return;

    setOffset({ x: 0, y: 0 });
  }

  return createPortal(
    <div
      ref={dockRef}
      className={`fixed z-[150] ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        left: anchor.left + anchor.width / 2,
        top: anchor.top,
        width: dockWidth,
        // Centers the dock on the canvas (was `-translate-x-1/2`) and adds
        // the drag offset. Inline so it works with any Tailwind version.
        transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)`,
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="rounded-2xl border border-white/10 bg-slate-950/90 px-3 pb-3 pt-1.5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">

        {/* DRAG GRIP
            Grab this bar (or any empty part of the dock) to move it.
            Double-click to put it back. */}

        <div
          title="Drag to move  •  Double-click to reset position"
          className="flex select-none items-center justify-center pb-1 text-slate-500 transition hover:text-slate-300"
        >
          <GripHorizontal size={18} />
        </div>

        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <div className="text-xs font-semibold text-white">
              {aiObjectMode ? "AI Object Remove" : "Object Eraser"}
            </div>

            <div className="text-[10px] text-slate-400">
              {aiObjectMode
                ? "Brush over the object — AI will reconstruct the matching background"
                : "Brush over the object"}
            </div>
          </div>

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

          <span className="min-w-[36px] text-center text-xs font-semibold text-white">
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

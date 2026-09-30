import { useEffect, useRef, useState } from "react";

/*
  DraggableDock

  Wrap a dock/panel to make it draggable anywhere on the screen:

    <DraggableDock>
      <CropDock ... />
    </DraggableDock>

  - Drag by grabbing any empty part of the dock. Buttons, inputs, sliders,
    selects and labels keep working normally.
  - Double-click an empty part of the dock to snap it back to its place.
  - The dock is kept inside the browser window.

  How it works: the wrapper is a transparent `fixed inset-0` layer, which is
  the same containing block the dock had before (the editor's fixed overlay),
  so `absolute bottom-3 left-[40.6%]` resolves to exactly the same place.
  Moving the layer with `transform` moves the dock without touching the dock's
  own classes, so it works with any Tailwind version and any `-translate-*`
  centering.
*/

// Elements that must keep their normal behaviour instead of starting a drag.
const NO_DRAG_SELECTOR =
  'button, input, select, textarea, label, a, [role="slider"], [data-no-drag]';

const EDGE = 8;

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function DraggableDock({ children, disabled = false }) {
  const layerRef = useRef(null);
  const dragRef = useRef(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const getDock = () => layerRef.current?.firstElementChild || null;

  // The layer ignores the mouse, so the dock itself must accept it.
  // Runs after every render because the dock mounts/unmounts with the tool.
  useEffect(() => {
    const dock = getDock();
    if (!dock) return;

    dock.style.pointerEvents = "auto";

    if (!disabled) {
      dock.style.cursor = dragging ? "grabbing" : "grab";
    }
  });

  // Snap back if the window is resized, so the dock can never get lost.
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

  function handlePointerDown(event) {
    if (disabled || event.button !== 0) return;
    if (event.target.closest?.(NO_DRAG_SELECTOR)) return;

    const dock = getDock();
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
    if (disabled) return;
    if (event.target.closest?.(NO_DRAG_SELECTOR)) return;

    setOffset({ x: 0, y: 0 });
  }

  return (
    <div
      ref={layerRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        transform:
          offset.x || offset.y
            ? `translate(${offset.x}px, ${offset.y}px)`
            : undefined,
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      {children}
    </div>
  );
}

export default DraggableDock;

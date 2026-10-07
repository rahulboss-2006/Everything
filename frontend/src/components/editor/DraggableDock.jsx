import { useEffect, useRef, useState } from "react";

/*
  DraggableDock

  Features:
  - Moves only the actual dock, NOT the whole website.
  - Drag from empty area.
  - Buttons, inputs, selects, sliders, links and labels work normally.
  - Mouse + touch + pen supported.
  - Dock stays inside viewport.
  - Double-click / double-tap empty area resets position.
  - Keeps the dock's original Tailwind positioning intact.
  - Shows grab hand normally and grabbing hand while dragging.
*/

const NO_DRAG_SELECTOR =
  'button, input, select, textarea, label, a, [role="slider"], [data-no-drag]';

const EDGE = 8;

/*
  Find the element that should actually move.

  A dock can mark its visible card with [data-dock-card]. Some docks use a
  full-width positioning wrapper as their first child (ResizeDock does), and
  moving that wrapper breaks the viewport bounds and blocks the canvas under
  it, so the real card is preferred and the first child is the fallback.
*/
function findDock(layer) {
  if (!layer) return null;
  return layer.querySelector("[data-dock-card]") || layer.firstElementChild;
}

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function DraggableDock({ children, disabled = false }) {
  const layerRef = useRef(null);
  const dockRef = useRef(null);
  const dragRef = useRef(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  /*
    Keep the actual dock element in sync after every render.

    The full-screen layer is only a positioning/event layer.
    IMPORTANT:
    We do NOT transform the full-screen layer, only the real dock card.
    Running after every render also re-applies the saved position when a
    dock is closed and opened again (the element is new, the offset is not).
  */
  useEffect(() => {
    const dock = findDock(layerRef.current);

    dockRef.current = dock;

    if (!dock) return;

    dock.style.pointerEvents = "auto";

    if (offset.x || offset.y) {
      dock.style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0)`;
    } else {
      dock.style.transform = "";
    }

    dock.style.cursor = disabled ? "" : dragging ? "grabbing" : "grab";
    dock.style.touchAction = disabled ? "auto" : "none";
    dock.style.userSelect = dragging ? "none" : "";
    dock.style.webkitUserSelect = dragging ? "none" : "";
  });

  /*
    Reset when viewport size changes.
  */
  useEffect(() => {
    function handleResize() {
      setOffset({ x: 0, y: 0 });
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  /*
    Global pointer movement.

    Only active while dragging.
  */
  useEffect(() => {
    if (!dragging) return undefined;

    function handleMove(event) {
      const drag = dragRef.current;
      if (!drag) return;

      event.preventDefault();

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

      setOffset({
        x: drag.originX + dx,
        y: drag.originY + dy,
      });
    }

    function handleUp() {
      dragRef.current = null;
      setDragging(false);
    }

    const previousUserSelect = document.body.style.userSelect;

    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handleMove, {
      passive: false,
    });

    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;

      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dragging]);

  /*
    Start dragging.
  */
  function handlePointerDown(event) {
    if (disabled) return;

    /*
      Only left mouse button.
      Touch / pen normally use button === 0.
    */
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    /*
      Do not drag when clicking controls.
    */
    if (event.target.closest?.(NO_DRAG_SELECTOR)) {
      return;
    }

    const dock = findDock(layerRef.current) || dockRef.current;

    if (!dock) return;

    const rect = dock.getBoundingClientRect();

    /*
      Prevent text selection and native mobile gestures.
    */
    event.preventDefault();

    /*
      Capture pointer on the ACTUAL dock,
      not on the full-screen layer.
    */
    try {
      dock.setPointerCapture?.(event.pointerId);
    } catch {
      // Ignore unsupported pointer capture.
    }

    /*
      Calculate how far the dock is allowed to move.

      rect already contains the current offset,
      so we calculate the remaining movement from here.
    */
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

  /*
    Double-click / double-tap empty area = reset.
  */
  function handleDoubleClick(event) {
    if (disabled) return;

    if (event.target.closest?.(NO_DRAG_SELECTOR)) {
      return;
    }

    setOffset({
      x: 0,
      y: 0,
    });
  }

  return (
    <div
      ref={layerRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        /*
          IMPORTANT:
          No transform here.

          The wrapper covers the viewport only so the dock
          can sit above the editor. It does NOT move.
        */
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      {children}
    </div>
  );
}

export default DraggableDock;
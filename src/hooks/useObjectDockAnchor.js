import { useEffect, useState } from "react";

export default function useObjectDockAnchor(
  objectMode,
  { previewRef, zoomAreaRef, canvasRef }
) {
  const [objectDockAnchor, setObjectDockAnchor] = useState(null);

  useEffect(() => {
    if (!objectMode) {
      setObjectDockAnchor(null);
      return;
    }

    const DOCK_HEIGHT = 140;
    const GAP = 16;
    const EDGE = 8;

    const getTarget = () =>
      previewRef.current || zoomAreaRef.current || canvasRef.current;

    function updateAnchor() {
      const el = getTarget();
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const wantedTop = rect.bottom + GAP;
      const maxTop = window.innerHeight - DOCK_HEIGHT - EDGE;

      setObjectDockAnchor({
        left: rect.left,
        width: rect.width,
        top: Math.max(EDGE, Math.min(wantedTop, maxTop)),
      });
    }

    updateAnchor();

    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);

    let observer = null;
    const el = getTarget();
    if (el && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateAnchor);
      observer.observe(el);
    }

    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectMode]);

  return objectDockAnchor;
}

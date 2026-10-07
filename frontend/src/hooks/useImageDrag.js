import { useRef } from "react";
import { getCanvasPoint } from "../utils/editorTools/canvasHelpers";

/* Drag the image around on the canvas (normal mode). */
export default function useImageDrag({
  canvasRef,
  imageOffset,
  setImageOffset,
  disabled,
}) {
  const imageDraggingRef = useRef(false);
  const imageDragStartRef = useRef(null);

  function handleImagePointerDown(event) {
    if (disabled) return;

    event.preventDefault();

    const point = getCanvasPoint(canvasRef.current, event);
    if (!point) return;

    imageDraggingRef.current = true;

    imageDragStartRef.current = {
      pointerX: point.x,
      pointerY: point.y,
      offsetX: imageOffset.x,
      offsetY: imageOffset.y,
    };

    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {}
  }

  function handleImagePointerMove(event) {
    if (!imageDraggingRef.current || !imageDragStartRef.current) return;

    event.preventDefault();

    const point = getCanvasPoint(canvasRef.current, event);
    if (!point) return;

    const start = imageDragStartRef.current;

    setImageOffset({
      x: start.offsetX + point.x - start.pointerX,
      y: start.offsetY + point.y - start.pointerY,
    });
  }

  function handleImagePointerUp(event) {
    imageDraggingRef.current = false;
    imageDragStartRef.current = null;

    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {}
  }

  function resetImageDrag() {
    imageDraggingRef.current = false;
    imageDragStartRef.current = null;
  }

  return {
    handleImagePointerDown,
    handleImagePointerMove,
    handleImagePointerUp,
    resetImageDrag,
  };
}

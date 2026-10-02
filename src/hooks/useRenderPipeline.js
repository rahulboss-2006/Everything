import { useEffect, useRef } from "react";
import { renderImageEdits } from "../utils/imageEditorPipeline";

const PREVIEW_MAX_SIDE = 1280;

/*
  SINGLE SOURCE-OF-TRUTH RENDER PIPELINE

  Adjustments + transforms + effects are ALWAYS rendered from the original
  current image. Nothing is rendered on top of an already-filtered canvas.

  Performance:
  - Slider changes are coalesced to at most one render per animation frame.
  - The effects preview is a downscaled WEBP object URL made with the async
    canvas.toBlob(); the old full-size synchronous toDataURL("image/png")
    on every slider tick was the main source of lag.
*/
export default function useRenderPipeline({
  canvasRef,
  image,
  brightness,
  contrast,
  saturation,
  rotation,
  flipX,
  flipY,
  imageOffset,
  selectedEffects,
  showEffects,
  objectMode,
  objectBaseCanvasRef,
  setEffectPreviewSrc,
}) {
  const rafRef = useRef(0);
  const lastImageRef = useRef(null);
  const previewJobRef = useRef(0);
  const previewUrlRef = useRef("");

  function updatePreview(canvas) {
    const job = ++previewJobRef.current;
    const scale = Math.min(
      1,
      PREVIEW_MAX_SIDE / Math.max(canvas.width, canvas.height)
    );

    let source = canvas;

    if (scale < 1) {
      source = document.createElement("canvas");
      source.width = Math.max(1, Math.round(canvas.width * scale));
      source.height = Math.max(1, Math.round(canvas.height * scale));
      source.getContext("2d").drawImage(canvas, 0, 0, source.width, source.height);
    }

    source.toBlob(
      (blob) => {
        if (!blob || job !== previewJobRef.current) return;

        const url = URL.createObjectURL(blob);
        const previous = previewUrlRef.current;

        previewUrlRef.current = url;
        setEffectPreviewSrc(url);

        if (previous) setTimeout(() => URL.revokeObjectURL(previous), 1000);
      },
      "image/webp",
      0.85
    );
  }

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !image) return;
    if (objectMode && objectBaseCanvasRef.current) return;

    function render() {
      try {
        renderImageEdits({
          image,
          brightness,
          contrast,
          saturation,
          rotation,
          flipX,
          flipY,
          imageOffset,
          selectedEffects,
          outputCanvas: canvas,
        });

        if (showEffects) updatePreview(canvas);
      } catch (error) {
        console.error("Image render pipeline failed:", error);
      }
    }

    // New image -> render immediately. Slider/effect changes -> next frame.
    if (lastImageRef.current !== image) {
      lastImageRef.current = image;
      cancelAnimationFrame(rafRef.current);
      render();
      return;
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    image,
    brightness,
    contrast,
    saturation,
    rotation,
    flipX,
    flipY,
    imageOffset,
    selectedEffects,
    showEffects,
    objectMode,
  ]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );
}

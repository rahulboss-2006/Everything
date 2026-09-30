import { useEffect } from "react";
import { renderImageEdits } from "../utils/imageEditorPipeline";

/*
  SINGLE SOURCE-OF-TRUTH RENDER PIPELINE

  Adjustments + transforms + effects are ALWAYS rendered
  from the original current image. Nothing is rendered on
  top of an already-rendered/filtered canvas.
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
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !image) return;

    if (objectMode && objectBaseCanvasRef.current) return;

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

      if (showEffects) {
        try {
          setEffectPreviewSrc(canvas.toDataURL("image/png"));
        } catch (previewError) {
          console.warn("Effects preview generation failed:", previewError);
          setEffectPreviewSrc("");
        }
      }
    } catch (error) {
      console.error("Image render pipeline failed:", error);
    }
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
}

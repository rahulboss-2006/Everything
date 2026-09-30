import { useRef, useState } from "react";
import { removeBackground } from "@imgly/background-removal";
import { loadImage } from "../utils/imageEditor";
import { getBaseName, makePngFile } from "../utils/editorTools/canvasHelpers";

export default function useBackgroundRemove({
  workingFile,
  removingBackground,
  setRemovingBackground,
  setWorkingFile,
  setImage,
  setImageOffset,
  setActiveTool,
  resetImageDrag,
  objectBaseCanvasRef,
  objectDrawingRef,
  layers,
}) {
  const backgroundRealProgressRef = useRef(0);
  const backgroundProgressFrameRef = useRef(null);

  const [backgroundProgress, setBackgroundProgress] = useState(0);
  const [backgroundError, setBackgroundError] = useState("");

  async function handleBackgroundRemove() {
    if (!workingFile || removingBackground) return;

    try {
      setRemovingBackground(true);
      setBackgroundProgress(0);
      setBackgroundError("");

      backgroundRealProgressRef.current = 0;

      setImageOffset({ x: 0, y: 0 });
      resetImageDrag();

      const buffer = await workingFile.arrayBuffer();

      const inputFile = new File([buffer], workingFile.name || "image.png", {
        type: workingFile.type || "image/png",
        lastModified: Date.now(),
      });

      const result = await removeBackground(inputFile, {
        model: "isnet",

        output: {
          format: "image/png",
          quality: 1,
        },

        progress: (key, current, total) => {
          if (!total || total <= 0) return;

          const percent = Math.round((current / total) * 100);
          const safePercent = Math.min(99, Math.max(0, percent));

          backgroundRealProgressRef.current = Math.max(
            backgroundRealProgressRef.current,
            safePercent
          );

          setBackgroundProgress(safePercent);
        },
      });

      if (!result) {
        throw new Error("Background removal returned an empty result.");
      }

      const newFile = makePngFile(
        result,
        getBaseName(workingFile),
        "no-background"
      );

      const newImage = await loadImage(newFile);

      if (!newImage) {
        throw new Error("The generated transparent image could not be loaded.");
      }

      layers.addToolLayer({
        type: "background",
        name: "Background Removed",
        detail: "AI background removal",
        beforeFile: workingFile,
        summary: "Background removed",
      });

      setWorkingFile(newFile);
      setImage(newImage);

      setActiveTool(null);

      objectBaseCanvasRef.current = null;
      objectDrawingRef.current = false;

      layers.addAppliedAction("Background removed");

      setBackgroundProgress(100);
    } catch (error) {
      console.error("Background removal failed:", error);

      setBackgroundError(error?.message || "Background removal failed.");
    } finally {
      if (backgroundProgressFrameRef.current) {
        cancelAnimationFrame(backgroundProgressFrameRef.current);
        backgroundProgressFrameRef.current = null;
      }

      setRemovingBackground(false);
    }
  }

  return { backgroundProgress, backgroundError, handleBackgroundRemove };
}

import { loadImage } from "../utils/imageEditor";

/* "Revert" a tool layer (crop / resize / background / apply). */
export default function useRestoreToolLayer({
  editorControlsDisabled,
  layers,
  setShowLayers,
  setWorkingFile,
  setImage,
  resetLiveEdits,
}) {
  async function restoreToolLayer(layerId) {
    if (editorControlsDisabled) return;

    const layer = layers.toolLayersRef.current.find((l) => l.id === layerId);
    if (!layer || !layer.beforeFile) return;

    try {
      const restored = await loadImage(layer.beforeFile);
      if (!restored) throw new Error("Could not restore this layer.");

      setShowLayers(false);
      setWorkingFile(layer.beforeFile);
      setImage(restored);
      resetLiveEdits();

      // Remove this layer and everything created after it.
      layers.pruneLayersFrom(layer.seq);
      layers.rebuildAppliedEdits();
    } catch (error) {
      console.error("Restore layer failed:", error);
      alert(error?.message || "Could not restore this layer.");
    }
  }

  return { restoreToolLayer };
}

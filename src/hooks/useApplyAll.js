import { canvasToBlob, getBaseName, makePngFile } from "../utils/editorTools/canvasHelpers";
import { getLiveEditLabels } from "../utils/editorTools/liveEdits";

/* "Apply" button: export the visible canvas once and finish. */
export default function useApplyAll({
  canvasRef,
  workingFile,
  setWorkingFile,
  objectMode,
  resizeMode,
  cropMode,
  applying,
  setApplying,
  liveState, // { brightness, contrast, saturation, rotation, flipX, flipY, selectedEffects }
  layers,
  clearLiveEdits,
  setEffectPreviewSrc,
  setShowEffects,
  setShowComplete,
}) {
  async function handleApply() {
    if (
      !canvasRef.current ||
      !workingFile ||
      objectMode ||
      resizeMode ||
      cropMode ||
      applying
    ) {
      return;
    }

    try {
      setApplying(true);

      /*
        The visible canvas is already the complete result of the pure render
        pipeline. Export exactly that result once.
      */
      const canvas = canvasRef.current;
      const liveEdits = getLiveEditLabels(liveState);
      const edits = [...layers.appliedActionsRef.current, ...liveEdits];
      const blob = await canvasToBlob(canvas, "image/png", 1);

      const editedFile = makePngFile(
        blob,
        getBaseName(workingFile),
        "edited"
      );

      // Create the layer BEFORE the live state is cleared.
      if (liveEdits.length > 0) {
        layers.addToolLayer({
          type: "apply",
          name: "Applied Adjustments",
          detail: liveEdits.join(", "),
          beforeFile: workingFile,
          summary: liveEdits.join(", "),
        });
      }

      /*
        The exported file already contains the live adjustments/effects, so
        every live edit value MUST be cleared, otherwise React would render
        the same edits a second time on the exported image.
      */
      layers.setAppliedActions(edits);

      clearLiveEdits();
      setEffectPreviewSrc("");
      setShowEffects(false);

      setWorkingFile(editedFile);
      setShowComplete(true);
    } catch (error) {
      console.error("Applying changes failed:", error);

      alert(
        error?.message ||
          "Could not apply the image changes. Please try again."
      );
    } finally {
      setApplying(false);
    }
  }

  return { handleApply };
}

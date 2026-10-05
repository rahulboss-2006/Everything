import {
  canvasToBlob,
  getBaseName,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";

import {
  getLiveEditLabels,
} from "../utils/editorTools/liveEdits";

/*
=========================================================
APPLY ALL EDITS
=========================================================

IMPORTANT:

- Every edit is kept as a separate item.
- Duplicate edits are NOT removed.
- Previous applied actions are preserved.
- Previous applied effects are preserved.
- Current live edits are added.
- The exported PNG is created before clearing live state.
- The new workingFile is NOT applied until the completion
  overlay finishes.
=========================================================
*/

export default function useApplyAll({
  canvasRef,
  workingFile,
  setWorkingFile,

  objectMode,
  resizeMode,
  cropMode,

  applying,
  setApplying,

  liveState,

  layers,
  effects,

  clearLiveEdits,

  setEffectPreviewSrc,
  setShowEffects,
  setShowComplete,
}) {
  async function handleApply() {
    /*
    =======================================================
    GUARDS
    =======================================================
    */

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
      =====================================================
      CURRENT CANVAS
      =====================================================
      */

      const canvas =
        canvasRef.current;

      /*
      =====================================================
      1. PREVIOUS APPLIED ACTIONS
      =====================================================

      These are actions already stored by useEditLayers.
      =====================================================
      */

      const previousEdits =
        Array.isArray(
          layers?.appliedActionsRef?.current
        )
          ? [
              ...layers.appliedActionsRef.current,
            ]
          : [];

      /*
      =====================================================
      2. PREVIOUS APPLIED EFFECT HISTORY
      =====================================================

      IMPORTANT:

      Use appliedEffectHistoryRef if available.

      Do NOT use only effectLayersRef here because
      effectLayersRef represents LIVE effects.
      =====================================================
      */

      const previousEffects =
        Array.isArray(
          effects?.appliedEffectHistoryRef
            ?.current
        )
          ? [
              ...effects
                .appliedEffectHistoryRef
                .current,
            ]
          : [];

      /*
      =====================================================
      3. CURRENT LIVE EFFECTS
      =====================================================
      */

      const currentEffects =
        Array.isArray(
          effects?.effectLayersRef?.current
        )
          ? effects.effectLayersRef.current
              .filter(
                (layer) =>
                  layer &&
                  layer.visible !== false
              )
              .map(
                (layer) =>
                  layer.name ||
                  layer.effectId
              )
              .filter(Boolean)
          : [];

      /*
      =====================================================
      4. CURRENT LIVE NORMAL EDITS
      =====================================================
      */

      const liveEdits =
        getLiveEditLabels(
          liveState
        );

      /*
      =====================================================
      5. BUILD COMPLETE EDIT LIST
      =====================================================

      IMPORTANT:

      NO Set()

      NO duplicate removal.

      Every block stays separate.

      Example:

      Brightness
      Contrast
      Blur
      Blur
      Rotate
      Brightness

      All 6 remain.
      =====================================================
      */

      const allEdits = [
        ...previousEdits,
        ...previousEffects,
        ...currentEffects,
        ...liveEdits,
      ];

      const edits =
        allEdits
          .filter(Boolean)
          .map((edit) =>
            String(edit).trim()
          )
          .filter(Boolean);

      /*
      =====================================================
      DEBUG
      =====================================================
      */

      console.log(
        "========================================"
      );

      console.log(
        "[APPLY] Previous actions:",
        previousEdits
      );

      console.log(
        "[APPLY] Previous effects:",
        previousEffects
      );

      console.log(
        "[APPLY] Current effects:",
        currentEffects
      );

      console.log(
        "[APPLY] Live edits:",
        liveEdits
      );

      console.log(
        "[APPLY] ALL EDITS:",
        allEdits
      );

      console.log(
        "[APPLY] FINAL EDIT COUNT:",
        edits.length
      );

      console.log(
        "[APPLY] FINAL completion edits:",
        edits
      );

      console.log(
        "========================================"
      );

      /*
      =====================================================
      6. EXPORT CURRENT CANVAS
      =====================================================

      Export BEFORE clearing live state.
      =====================================================
      */

      const blob =
        await canvasToBlob(
          canvas,
          "image/png",
          1
        );

      /*
      =====================================================
      7. CREATE FINAL FILE
      =====================================================
      */

      const editedFile =
        makePngFile(
          blob,
          getBaseName(
            workingFile
          ),
          "edited"
        );

      console.log(
        "[APPLY] Final edited file:",
        editedFile
      );

      /*
      =====================================================
      8. SAVE CURRENT NORMAL EDITS
      =====================================================
      */

      if (
        liveEdits.length > 0
      ) {
        layers.addToolLayer({
          type: "apply",

          name:
            "Applied Adjustments",

          detail:
            liveEdits.join(", "),

          beforeFile:
            workingFile,

          summary:
            liveEdits.join(", "),
        });
      }

      /*
      =====================================================
      9. SAVE CURRENT EFFECTS INTO EFFECT HISTORY
      =====================================================
      */

      if (
        currentEffects.length > 0 &&
        effects?.addAppliedEffectHistory
      ) {
        effects.addAppliedEffectHistory(
          currentEffects
        );
      }

      /*
      =====================================================
      10. SAVE COMPLETE HISTORY
      =====================================================
      */

      layers.setAppliedActions(
        edits
      );

      /*
      =====================================================
      11. CLEAR LIVE STATE
      =====================================================
      */

      clearLiveEdits();

      setEffectPreviewSrc("");

      setShowEffects(false);

      /*
      =====================================================
      12. IMPORTANT

      DO NOT UPDATE workingFile HERE.

      Previously you had:

          setWorkingFile(editedFile)

      That caused the final image to change before the
      completion animation finished.

      We now pass the edited file to the completion
      callback.
      =====================================================
      */

      console.log(
        "[APPLY] Opening completion overlay..."
      );

      setShowComplete(
        edits,
        editedFile
      );
    } catch (error) {
      console.error(
        "[APPLY] Applying changes failed:",
        error
      );

      alert(
        error?.message ||
          "Could not apply the image changes. Please try again."
      );
    } finally {
      setApplying(false);
    }
  }

  return {
    handleApply,
  };
}
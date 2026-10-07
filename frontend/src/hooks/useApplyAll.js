import {
  canvasToBlob,
} from "../utils/editorTools/canvasHelpers";

import {
  getBaseName,
  makePngFile,
} from "../utils/editorTools/canvasHelpers";

import {
  getLiveEditLabels,
} from "../utils/editorTools/liveEdits";

import {
  renderImageEdits,
} from "../utils/imageEditorPipeline";


/* =========================================================
   APPLY ALL
   ---------------------------------------------------------
   IMPORTANT:

   The visible canvas is now PREVIEW resolution.

   Therefore:

       canvasRef.current
              ❌
       must NOT be exported.

   Instead:

       Original Image
             ↓
       renderImageEdits()
             ↓
       renderScale = 1
             ↓
       Full-resolution PNG
========================================================= */

export default function useApplyAll({
  canvasRef,

  image,

  workingFile,
  setWorkingFile,

  brightness,
  contrast,
  saturation,

  rotation,

  flipX,
  flipY,

  imageOffset,

  selectedEffects,

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


  /* =======================================================
     HANDLE APPLY
  ======================================================= */

  async function handleApply() {
    if (
      !canvasRef.current ||
      !workingFile ||
      !image ||
      objectMode ||
      resizeMode ||
      cropMode ||
      applying
    ) {
      return;
    }


    try {
      setApplying(
        true
      );


      /*
       * Keep the existing visible canvas
       * only as an editor-state guard.
       *
       * It is NOT used for final export.
       */
      const visibleCanvas =
        canvasRef.current;


      if (
        !visibleCanvas
      ) {
        return;
      }


      /* ===================================================
         PREVIOUS LAYER HISTORY
      =================================================== */

      const previousEdits =
        Array.isArray(
          layers
            ?.appliedActionsRef
            ?.current
        )
          ? [
              ...layers
                .appliedActionsRef
                .current,
            ]
          : [];


      /* ===================================================
         PREVIOUS EFFECT HISTORY
      =================================================== */

      const previousEffects =
        Array.isArray(
          effects
            ?.appliedEffectHistoryRef
            ?.current
        )
          ? [
              ...effects
                .appliedEffectHistoryRef
                .current,
            ]
          : [];


      /* ===================================================
         CURRENT VISIBLE EFFECT LAYERS
      =================================================== */

      const currentEffects =
        Array.isArray(
          effects
            ?.effectLayersRef
            ?.current
        )
          ? effects
              .effectLayersRef
              .current
              .filter(
                (layer) =>
                  layer &&
                  layer.visible !==
                    false
              )
              .map(
                (layer) =>
                  layer.name ||
                  layer.effectId
              )
              .filter(
                Boolean
              )
          : [];


      /* ===================================================
         LIVE ADJUSTMENTS
      =================================================== */

      const liveEdits =
        getLiveEditLabels(
          liveState
        );


      /* ===================================================
         COMBINE EDIT HISTORY
      =================================================== */

      const allEdits = [
        ...previousEdits,
        ...previousEffects,
        ...currentEffects,
        ...liveEdits,
      ];


      const edits =
        Array.from(
          new Set(
            allEdits
              .filter(Boolean)
              .map((edit) => String(edit).trim())
              .filter(Boolean)
          )
        );

      /*
       * Paint the processing overlay BEFORE starting the
       * synchronous full-resolution canvas work.
       */
      setShowComplete(
        edits,
        workingFile,
        true
      );

      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      /* ===================================================
         FULL RESOLUTION RENDER
         --------------------------------------------------
         THIS is the important part.

         The visible canvas may be:

             1280 × 853

         but the export canvas becomes:

             6000 × 4000

         for a 6000 × 4000 original.
      =================================================== */

      const exportCanvas =
        document.createElement(
          "canvas"
        );


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

        outputCanvas:
          exportCanvas,

        /*
         * FULL RESOLUTION.
         */
        renderScale: 1,
      });


      /* ===================================================
         CONVERT FULL-RES CANVAS TO PNG
      =================================================== */

      const blob =
        await canvasToBlob(
          exportCanvas,
          "image/png",
          1
        );


      /* ===================================================
         CREATE FINAL FILE
      =================================================== */

      const editedFile =
        makePngFile(
          blob,
          getBaseName(
            workingFile
          ),
          "edited"
        );


      /* ===================================================
         ADD ADJUSTMENT LAYER
      =================================================== */

      if (
        liveEdits.length >
        0
      ) {
        layers.addToolLayer({
          type: "apply",

          name:
            "Applied Adjustments",

          detail:
            liveEdits.join(
              ", "
            ),

          beforeFile:
            workingFile,

          summary:
            liveEdits.join(
              ", "
            ),
        });
      }


      /* ===================================================
         ADD EFFECT HISTORY
      =================================================== */

      if (
        currentEffects.length >
          0 &&
        effects
          ?.addAppliedEffectHistory
      ) {
        effects.addAppliedEffectHistory(
          currentEffects
        );
      }


      /* ===================================================
         SAVE ALL EDIT LABELS
      =================================================== */

      layers.setAppliedActions(
        edits
      );


      /* ===================================================
         RESET LIVE STATE
      =================================================== */

      clearLiveEdits();


      setEffectPreviewSrc(
        ""
      );


      setShowEffects(
        false
      );


      /* ===================================================
         COMPLETION OVERLAY
      =================================================== */

      setShowComplete(
        edits,
        editedFile,
        false
      );

    } catch (
      error
    ) {
      setShowComplete(
        [],
        null,
        false
      );

      console.error(
        "[APPLY] Applying changes failed:",
        error
      );


      alert(
        error?.message ||
          "Could not apply the image changes. Please try again."
      );

    } finally {
      setApplying(
        false
      );
    }
  }


  return {
    handleApply,
  };
}
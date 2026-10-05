import {
  useEffect,
  useRef,
} from "react";

import {
  renderImageEdits,
} from "../utils/imageEditorPipeline";


/* =========================================================
   PREVIEW CONFIG
========================================================= */

const PREVIEW_MAX_SIDE = 1280;


/* =========================================================
   RENDER PIPELINE
   ---------------------------------------------------------
   Interactive editing uses a bounded preview resolution.

   Example:

      6000 × 4000
          ↓
      1280 × 853

   Final Apply does NOT use this preview.
   useApplyAll renders the original image at renderScale=1.
========================================================= */

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
  const rafRef =
    useRef(0);

  const lastImageRef =
    useRef(null);

  const previewJobRef =
    useRef(0);

  const previewUrlRef =
    useRef("");


  /* =======================================================
     PREVIEW SCALE
  ======================================================= */

  function getPreviewScale(
    sourceImage
  ) {
    const width =
      sourceImage?.naturalWidth ||
      sourceImage?.width ||
      1;

    const height =
      sourceImage?.naturalHeight ||
      sourceImage?.height ||
      1;

    const maxSide =
      Math.max(
        width,
        height
      );

    if (
      maxSide <=
      PREVIEW_MAX_SIDE
    ) {
      return 1;
    }

    return (
      PREVIEW_MAX_SIDE /
      maxSide
    );
  }


  /* =======================================================
     EFFECT PANEL PREVIEW
  ======================================================= */

  function updatePreview(
    canvas
  ) {
    const job =
      ++previewJobRef.current;


    const scale =
      Math.min(
        1,
        PREVIEW_MAX_SIDE /
          Math.max(
            canvas.width,
            canvas.height
          )
      );


    let source =
      canvas;


    /*
     * EffectsPanel preview gets
     * an even smaller/optimized image
     * when necessary.
     */

    if (
      scale < 1
    ) {
      source =
        document.createElement(
          "canvas"
        );


      source.width =
        Math.max(
          1,
          Math.round(
            canvas.width *
              scale
          )
        );


      source.height =
        Math.max(
          1,
          Math.round(
            canvas.height *
              scale
          )
        );


      const ctx =
        source.getContext(
          "2d"
        );


      if (ctx) {
        ctx.imageSmoothingEnabled =
          true;

        try {
          ctx.imageSmoothingQuality =
            "medium";
        } catch {
          // Older browsers.
        }


        ctx.drawImage(
          canvas,

          0,
          0,

          source.width,
          source.height
        );
      }
    }


    source.toBlob(
      (blob) => {
        if (
          !blob ||
          job !==
            previewJobRef.current
        ) {
          return;
        }


        const url =
          URL.createObjectURL(
            blob
          );


        const previous =
          previewUrlRef.current;


        previewUrlRef.current =
          url;


        setEffectPreviewSrc(
          url
        );


        if (previous) {
          setTimeout(
            () => {
              try {
                URL.revokeObjectURL(
                  previous
                );
              } catch {
                // Ignore revoked URL errors.
              }
            },
            1000
          );
        }
      },

      "image/webp",

      0.82
    );
  }


  /* =======================================================
     MAIN RENDER
  ======================================================= */

  useEffect(
    () => {
      const canvas =
        canvasRef.current;


      if (
        !canvas ||
        !image
      ) {
        return;
      }


      /*
       * Object removal owns the canvas while active.
       */
      if (
        objectMode &&
        objectBaseCanvasRef.current
      ) {
        return;
      }


      function render() {
        try {
          const renderScale =
            getPreviewScale(
              image
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
              canvas,

            /*
             * TRUE PREVIEW RESOLUTION.
             */
            renderScale,
          });


          if (
            showEffects
          ) {
            updatePreview(
              canvas
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Image render pipeline failed:",
            error
          );
        }
      }


      /*
       * First render after a new image:
       * do not wait an extra frame.
       */
      if (
        lastImageRef.current !==
        image
      ) {
        lastImageRef.current =
          image;


        cancelAnimationFrame(
          rafRef.current
        );


        render();


        return;
      }


      /*
       * All slider/effect/transform
       * updates are limited to one
       * render per browser frame.
       */
      cancelAnimationFrame(
        rafRef.current
      );


      rafRef.current =
        requestAnimationFrame(
          render
        );


      return () => {
        cancelAnimationFrame(
          rafRef.current
        );
      };
    },

    [
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
    ]
  );


  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(
    () => {
      return () => {
        cancelAnimationFrame(
          rafRef.current
        );


        if (
          previewUrlRef.current
        ) {
          try {
            URL.revokeObjectURL(
              previewUrlRef.current
            );
          } catch {
            // Ignore cleanup errors.
          }
        }
      };
    },
    []
  );
}
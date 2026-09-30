import {
  removeBackground,
} from "@imgly/background-removal";


/* =========================================================
   REMOVE IMAGE BACKGROUND
========================================================= */

export async function removeImageBackground(
  workingFile,
  onProgress
) {

  if (!workingFile) {
    throw new Error(
      "Image file is required."
    );
  }


  /* =======================================================
     CREATE A CLEAN INPUT FILE
  ======================================================= */

  const buffer =
    await workingFile.arrayBuffer();

  const inputFile =
    new File(
      [buffer],
      workingFile.name ||
        "image.png",
      {
        type:
          workingFile.type ||
          "image/png",

        lastModified:
          Date.now(),
      }
    );


  /* =======================================================
     IMG.LY BACKGROUND REMOVAL
  ======================================================= */

  const result =
    await removeBackground(
      inputFile,
      {

        /* -----------------------------------------------
           MODEL
        ----------------------------------------------- */

        model:
          "isnet",


        /* -----------------------------------------------
           OUTPUT
        ----------------------------------------------- */

        output: {
          format:
            "image/png",

          quality:
            1,

          type:
            "foreground",
        },


        /* -----------------------------------------------
           DEBUG
        ----------------------------------------------- */

        debug:
          true,


        /* -----------------------------------------------
           PROGRESS
        ----------------------------------------------- */

        progress: (
          key,
          current,
          total
        ) => {

          if (
            !total ||
            total <= 0
          ) {
            return;
          }


          const percent =
            Math.round(
              (current / total) *
                100
            );


          const safePercent =
            Math.min(
              99,
              Math.max(
                0,
                percent
              )
            );


          if (
            typeof onProgress ===
            "function"
          ) {

            onProgress(
              safePercent,
              key,
              current,
              total
            );

          }

        },

      }
    );


  /* =======================================================
     VALIDATE RESULT
  ======================================================= */

  if (!result) {

    throw new Error(
      "Background removal returned an empty result."
    );

  }


  /* =======================================================
     CREATE FINAL PNG FILE
  ======================================================= */

  const originalName =
    workingFile.name?.replace(
      /\.[^/.]+$/,
      ""
    ) ||
    "image";


  const finalFile =
    new File(
      [result],
      `${originalName}-no-background.png`,
      {
        type:
          "image/png",

        lastModified:
          Date.now(),
      }
    );


  return finalFile;
}
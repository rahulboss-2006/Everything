export function createEditedFile(
  canvas,
  originalFile,
  quality = 0.92
) {
  return new Promise((resolve, reject) => {
    // Determine output format before calling toBlob
    const extension =
      originalFile.type === "image/png"
        ? "png"
        : "jpeg";

    const mimeType =
      extension === "png"
        ? "image/png"
        : "image/jpeg";

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              "Unable to create edited image."
            )
          );
          return;
        }

        const baseName =
          originalFile.name.replace(
            /\.[^/.]+$/,
            ""
          );

        const editedFile = new File(
          [blob],
          `${baseName}-edited.${extension}`,
          {
            type: mimeType,
            lastModified: Date.now(),
          }
        );

        resolve(editedFile);
      },
      mimeType,
      quality
    );
  });
}

export function loadImage(file) {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      const objectUrl =
        URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);

        reject(
          new Error(
            "Unable to load image."
          )
        );
      };

      image.src = objectUrl;
    }
  );
}
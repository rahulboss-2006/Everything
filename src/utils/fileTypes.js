const SUPPORTED_FORMATS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "pdf",
];


export function getFileExtension(filename) {
  if (!filename) return "";

  const lastDot = filename.lastIndexOf(".");

  if (lastDot === -1) return "";

  return filename
    .slice(lastDot + 1)
    .toLowerCase();
}


export function getFileCategory(file) {
  if (!file) return "unknown";

  const extension =
    getFileExtension(file.name);

  if (
    SUPPORTED_FORMATS.includes(extension)
  ) {
    return extension === "pdf"
      ? "pdf"
      : "image";
  }

  if (file.type === "application/pdf") {
    return "pdf";
  }

  if (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
  ) {
    return "image";
  }

  return "unknown";
}


export function getDetectedFormat(file) {
  if (!file) return "";

  /*
    IMPORTANT:

    Original filename has priority.

    photo.jpeg -> jpeg
    photo.jpg  -> jpg
    photo.png  -> png
    photo.webp -> webp
    file.pdf   -> pdf
  */

  const extension =
    getFileExtension(file.name);

  if (
    SUPPORTED_FORMATS.includes(extension)
  ) {
    return extension;
  }

  /*
    MIME fallback.

    JPEG stays JPEG.
    We do NOT convert it to JPG.
  */

  const mimeMap = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };

  return mimeMap[file.type] || "";
}


export function isSupportedFile(file) {
  const format =
    getDetectedFormat(file);

  return SUPPORTED_FORMATS.includes(
    format
  );
}
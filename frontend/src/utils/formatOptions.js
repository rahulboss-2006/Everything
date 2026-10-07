const conversionMap = {
  jpg: ["jpeg", "png", "webp", "pdf"],
  jpeg: ["jpg", "png", "webp", "pdf"],
  png: ["jpg", "jpeg", "webp", "pdf"],
  webp: ["jpg", "jpeg", "png", "pdf"],
  pdf: ["jpg", "jpeg", "png", "webp"],
};

export function getConversionOptions(extension) {
  if (!extension) return [];

  return (
    conversionMap[
      extension.toLowerCase()
    ] || []
  );
}

export default conversionMap;
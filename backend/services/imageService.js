const sharp = require("sharp");

async function convertImage(
  inputPath,
  outputPath,
  outputFormat
) {
  const image = sharp(inputPath);

  switch (outputFormat.toLowerCase()) {
    case "jpg":
      await image
        .jpeg({
          quality: 90,
        })
        .toFile(outputPath);
      break;

    case "jpeg":
      await image
        .jpeg({
          quality: 90,
        })
        .toFile(outputPath);
      break;

    case "png":
      await image
        .png()
        .toFile(outputPath);
      break;

    case "webp":
      await image
        .webp({
          quality: 90,
        })
        .toFile(outputPath);
      break;

    default:
      throw new Error(
        `Unsupported output format: ${outputFormat}`
      );
  }

  return outputPath;
}

module.exports = {
  convertImage,
};
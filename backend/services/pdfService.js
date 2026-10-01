const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");
const { createCanvas } = require("@napi-rs/canvas");

const PDFJS_PATH =
  "pdfjs-dist/legacy/build/pdf.mjs";

/* =========================================
   IMAGE → PDF
========================================= */

async function imageToPdf(
  inputPath,
  outputPath
) {
  const image = sharp(inputPath);

  const metadata =
    await image.metadata();

  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    throw new Error(
      "Unable to read image dimensions."
    );
  }

  const pngBuffer =
    await image.png().toBuffer();

  const pdfDoc =
    await PDFDocument.create();

  const pngImage =
    await pdfDoc.embedPng(
      pngBuffer
    );

  const page =
    pdfDoc.addPage([
      width,
      height,
    ]);

  page.drawImage(
    pngImage,
    {
      x: 0,
      y: 0,
      width,
      height,
    }
  );

  const pdfBytes =
    await pdfDoc.save();

  await fs.promises.writeFile(
    outputPath,
    pdfBytes
  );

  return outputPath;
}

/* =========================================
   GET PDF PAGE COUNT
========================================= */

async function getPdfPageCount(
  inputPath
) {
  const pdfjsLib =
    await import(PDFJS_PATH);

  const data =
    new Uint8Array(
      await fs.promises.readFile(
        inputPath
      )
    );

  const loadingTask =
    pdfjsLib.getDocument({
      data,
    });

  const pdfDocument =
    await loadingTask.promise;

  const pageCount =
    pdfDocument.numPages;

  return pageCount;
}

/* =========================================
   PDF PAGE → IMAGE
========================================= */

async function renderPdfPage(
  inputPath,
  pageNumber,
  outputPath,
  outputFormat
) {
  const pdfjsLib =
    await import(PDFJS_PATH);

  const data =
    new Uint8Array(
      await fs.promises.readFile(
        inputPath
      )
    );

  const loadingTask =
    pdfjsLib.getDocument({
      data,
    });

  const pdfDocument =
    await loadingTask.promise;

  const page =
    await pdfDocument.getPage(
      pageNumber
    );

  /*
    1.5 scale gives better image quality
  */

  const scale = 1.5;

  const viewport =
    page.getViewport({
      scale,
    });

  const width =
    Math.ceil(viewport.width);

  const height =
    Math.ceil(viewport.height);

  const canvas =
    createCanvas(
      width,
      height
    );

  const context =
    canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  /*
    Convert canvas → PNG buffer
  */

  const pngBuffer =
    canvas.toBuffer("image/png");

  /*
    Use Sharp to create requested format
  */

  let image =
    sharp(pngBuffer);

  switch (
    outputFormat.toLowerCase()
  ) {
    case "jpg":
    case "jpeg":
      image = image
        .flatten({
          background: "#ffffff",
        })
        .jpeg({
          quality: 90,
        });
      break;

    case "png":
      image = image.png();
      break;

    case "webp":
      image = image.webp({
        quality: 90,
      });
      break;

    default:
      throw new Error(
        `Unsupported output format: ${outputFormat}`
      );
  }

  await image.toFile(
    outputPath
  );

  page.cleanup();

  return outputPath;
}

/* =========================================
   PDF → MULTIPLE IMAGES
========================================= */

async function pdfToImages(
  inputPath,
  outputDir,
  outputFormat
) {
  const pageCount =
    await getPdfPageCount(
      inputPath
    );

  if (pageCount < 1) {
    throw new Error(
      "PDF contains no pages."
    );
  }

  const imageFiles = [];

  for (
    let pageNumber = 1;
    pageNumber <= pageCount;
    pageNumber++
  ) {
    const extension =
      outputFormat.toLowerCase();

    const fileName =
      `page-${pageNumber}.${extension}`;

    const outputPath =
      path.join(
        outputDir,
        fileName
      );

    await renderPdfPage(
      inputPath,
      pageNumber,
      outputPath,
      outputFormat
    );

    imageFiles.push({
      fileName,
      filePath: outputPath,
    });
  }

  return {
    pageCount,
    imageFiles,
  };
}

module.exports = {
  imageToPdf,
  getPdfPageCount,
  renderPdfPage,
  pdfToImages,
};
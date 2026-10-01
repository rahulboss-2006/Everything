const fs = require("fs");
const path = require("path");

const {
  getExtension,
} = require("../utils/fileUtils");

const {
  imageToPdf,
  pdfToImages,
} = require("../services/pdfService");

const {
  createZip,
} = require("../services/zipService");

const {
  deductCredits,
  WORK_COST,
} = require("../utils/deductCredits");

const OUTPUT_DIR = path.join(
  __dirname,
  "..",
  "outputs"
);

const TEMP_DIR = path.join(
  __dirname,
  "..",
  "temp"
);

/* =========================================
   IMAGE → PDF
========================================= */

async function convertImageToPdf(req, res) {
  let uploadedFilePath = null;
  let outputPath = null;

  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (req.user.credits < WORK_COST) {
      return res.status(402).json({
        success: false,
        message: "Insufficient credits.",
        credits: req.user.credits,
        requiredCredits: WORK_COST,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image.",
      });
    }

    uploadedFilePath = req.file.path;

    const inputFormat = getExtension(
      req.file.originalname
    );

    const allowedFormats = [
      "jpg",
      "jpeg",
      "png",
      "webp",
    ];

    if (!allowedFormats.includes(inputFormat)) {
      return res.status(400).json({
        success: false,
        message:
          "Only JPG, JPEG, PNG and WEBP images are allowed.",
      });
    }

    const randomValue = Math.floor(
      100000 + Math.random() * 900000
    );

    const outputFileName =
      `Everything-${randomValue}.pdf`;

    outputPath = path.join(
      OUTPUT_DIR,
      outputFileName
    );

    /*
      Convert image → PDF
    */

    await imageToPdf(
      uploadedFilePath,
      outputPath
    );

    /*
      Delete uploaded source file
    */

    if (fs.existsSync(uploadedFilePath)) {
      await fs.promises.unlink(
        uploadedFilePath
      );
      uploadedFilePath = null;
    }

    /*
      Deduct 2 credits ONLY after
      successful conversion
    */

    const creditResult =
      await deductCredits(req.user._id);

    if (!creditResult.success) {
      if (
        outputPath &&
        fs.existsSync(outputPath)
      ) {
        try {
          await fs.promises.unlink(
            outputPath
          );
        } catch (deleteError) {
          console.error(
            "Output cleanup error:",
            deleteError
          );
        }
      }

      return res.status(402).json({
        success: false,
        message: "Insufficient credits.",
        credits: req.user.credits,
        requiredCredits: WORK_COST,
      });
    }

    return res.json({
      success: true,

      message:
        "Image converted to PDF successfully.",

      fileName:
        outputFileName,

      downloadUrl:
        `/outputs/${encodeURIComponent(
          outputFileName
        )}`,

      creditsUsed: WORK_COST,

      creditsRemaining:
        creditResult.credits,
    });
  } catch (error) {
    console.error(
      "Image to PDF error:",
      error
    );

    /*
      Cleanup uploaded file if conversion failed
    */

    if (
      uploadedFilePath &&
      fs.existsSync(uploadedFilePath)
    ) {
      try {
        await fs.promises.unlink(
          uploadedFilePath
        );
      } catch (deleteError) {
        console.error(
          "Uploaded file cleanup error:",
          deleteError
        );
      }
    }

    /*
      Cleanup output if something failed
    */

    if (
      outputPath &&
      fs.existsSync(outputPath)
    ) {
      try {
        await fs.promises.unlink(
          outputPath
        );
      } catch (deleteError) {
        console.error(
          "Output cleanup error:",
          deleteError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Image to PDF conversion failed.",
    });
  }
}

/* =========================================
   PDF → IMAGE
========================================= */

async function convertPdfToImage(req, res) {
  let tempJobDir = null;
  let uploadedFilePath = null;
  let outputPath = null;

  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (req.user.credits < WORK_COST) {
      return res.status(402).json({
        success: false,
        message: "Insufficient credits.",
        credits: req.user.credits,
        requiredCredits: WORK_COST,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF.",
      });
    }

    uploadedFilePath = req.file.path;

    const outputFormat = String(
      req.body.outputFormat || ""
    )
      .toLowerCase()
      .trim();

    const allowedFormats = [
      "jpg",
      "jpeg",
      "png",
      "webp",
    ];

    if (!allowedFormats.includes(outputFormat)) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported image format.",
      });
    }

    /*
      Create temporary job folder
    */

    const randomValue = Math.floor(
      100000 + Math.random() * 900000
    );

    tempJobDir = path.join(
      TEMP_DIR,
      `job-${randomValue}`
    );

    await fs.promises.mkdir(
      tempJobDir,
      {
        recursive: true,
      }
    );

    /*
      Convert every PDF page
    */

    const result = await pdfToImages(
      uploadedFilePath,
      tempJobDir,
      outputFormat
    );

    const pageCount = result.pageCount;

    /*
      =====================================
      ONE PAGE
      =====================================
    */

    if (pageCount === 1) {
      const extension = outputFormat;

      const outputFileName =
        `Everything-${randomValue}.${extension}`;

      outputPath = path.join(
        OUTPUT_DIR,
        outputFileName
      );

      await fs.promises.copyFile(
        result.imageFiles[0].filePath,
        outputPath
      );

      /*
        Delete uploaded PDF
      */

      if (
        uploadedFilePath &&
        fs.existsSync(uploadedFilePath)
      ) {
        await fs.promises.unlink(
          uploadedFilePath
        );
        uploadedFilePath = null;
      }

      /*
        Deduct 2 credits
      */

      const creditResult =
        await deductCredits(req.user._id);

      if (!creditResult.success) {
        if (
          outputPath &&
          fs.existsSync(outputPath)
        ) {
          try {
            await fs.promises.unlink(
              outputPath
            );
          } catch (deleteError) {
            console.error(
              "Output cleanup error:",
              deleteError
            );
          }
        }

        return res.status(402).json({
          success: false,
          message: "Insufficient credits.",
          credits: req.user.credits,
          requiredCredits: WORK_COST,
        });
      }

      return res.json({
        success: true,

        type: "image",

        pageCount: 1,

        message:
          "PDF converted to image successfully.",

        fileName:
          outputFileName,

        downloadUrl:
          `/outputs/${encodeURIComponent(
            outputFileName
          )}`,

        creditsUsed: WORK_COST,

        creditsRemaining:
          creditResult.credits,
      });
    }

    /*
      =====================================
      MULTIPLE PAGES
      =====================================
    */

    const zipFileName =
      `Everything-${randomValue}.zip`;

    const zipPath = path.join(
      OUTPUT_DIR,
      zipFileName
    );

    outputPath = zipPath;

    await createZip(
      result.imageFiles,
      zipPath
    );

    /*
      Delete uploaded PDF
    */

    if (
      uploadedFilePath &&
      fs.existsSync(uploadedFilePath)
    ) {
      await fs.promises.unlink(
        uploadedFilePath
      );
      uploadedFilePath = null;
    }

    /*
      Deduct 2 credits
    */

    const creditResult =
      await deductCredits(req.user._id);

    if (!creditResult.success) {
      if (
        outputPath &&
        fs.existsSync(outputPath)
      ) {
        try {
          await fs.promises.unlink(
            outputPath
          );
        } catch (deleteError) {
          console.error(
            "ZIP cleanup error:",
            deleteError
          );
        }
      }

      return res.status(402).json({
        success: false,
        message: "Insufficient credits.",
        credits: req.user.credits,
        requiredCredits: WORK_COST,
      });
    }

    return res.json({
      success: true,

      type: "zip",

      pageCount,

      message:
        "PDF pages converted and zipped successfully.",

      fileName:
        zipFileName,

      downloadUrl:
        `/outputs/${encodeURIComponent(
          zipFileName
        )}`,

      creditsUsed: WORK_COST,

      creditsRemaining:
        creditResult.credits,
    });
  } catch (error) {
    console.error(
      "PDF to image error:",
      error
    );

    /*
      Cleanup uploaded PDF
    */

    if (
      uploadedFilePath &&
      fs.existsSync(uploadedFilePath)
    ) {
      try {
        await fs.promises.unlink(
          uploadedFilePath
        );
      } catch (deleteError) {
        console.error(
          "Uploaded PDF cleanup error:",
          deleteError
        );
      }
    }

    /*
      Cleanup generated output
    */

    if (
      outputPath &&
      fs.existsSync(outputPath)
    ) {
      try {
        await fs.promises.unlink(
          outputPath
        );
      } catch (deleteError) {
        console.error(
          "Output cleanup error:",
          deleteError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "PDF to image conversion failed.",
    });
  } finally {
    /*
      Remove temporary rendering folder
    */

    if (
      tempJobDir &&
      fs.existsSync(tempJobDir)
    ) {
      try {
        await fs.promises.rm(
          tempJobDir,
          {
            recursive: true,
            force: true,
          }
        );
      } catch (cleanupError) {
        console.error(
          "Temp cleanup error:",
          cleanupError
        );
      }
    }
  }
}

module.exports = {
  convertImageToPdf,
  convertPdfToImage,
};
const path = require("path");
const fs = require("fs");

const {
  isAllowedFormat,
  getOutputExtension,
} = require("../utils/fileUtils");

const {
  convertImage,
} = require("../services/imageService");

const {
  deductCredits,
  WORK_COST,
} = require("../utils/deductCredits");

// =====================================
// Output Directory
// =====================================

const OUTPUT_DIR = path.join(
  __dirname,
  "..",
  "outputs"
);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, {
    recursive: true,
  });
}

// =====================================
// Image Conversion Controller
// =====================================

async function imageConversion(req, res) {
  let uploadedFilePath = null;
  let conversionCompleted = false;

  try {
    // =================================
    // Authentication Check
    // =================================

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // =================================
    // Check Credits BEFORE Conversion
    // =================================

    if (req.user.credits < WORK_COST) {
      return res.status(402).json({
        success: false,
        message: "Insufficient credits.",
        credits: req.user.credits,
        requiredCredits: WORK_COST,
      });
    }

    // =================================
    // Check Uploaded File
    // =================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image.",
      });
    }

    uploadedFilePath = req.file.path;

    // =================================
    // Get Output Format
    // =================================

    const { outputFormat } = req.body;

    if (!outputFormat) {
      return res.status(400).json({
        success: false,
        message: "Output format is required.",
      });
    }

    const format = String(outputFormat)
      .toLowerCase()
      .trim();

    // =================================
    // Validate Output Format
    // =================================

    if (!isAllowedFormat(format)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported output format.",
      });
    }

    // =================================
    // Get Extension
    // =================================

    const extension =
      getOutputExtension(format);

    // =================================
    // Generate Output Filename
    // =================================

    const randomValue =
      Math.floor(
        100000 +
          Math.random() * 900000
      );

    const outputFileName =
      `Everything-${randomValue}.${extension}`;

    const outputPath = path.join(
      OUTPUT_DIR,
      outputFileName
    );

    // =================================
    // Convert Image
    // =================================

    await convertImage(
      uploadedFilePath,
      outputPath,
      format
    );

    conversionCompleted = true;

    // =================================
    // Delete Uploaded Temporary File
    // =================================

    if (
      fs.existsSync(uploadedFilePath)
    ) {
      fs.unlinkSync(uploadedFilePath);
      uploadedFilePath = null;
    }

    // =================================
    // Deduct 2 Credits
    // =================================

    const creditResult =
      await deductCredits(req.user._id);

    if (!creditResult.success) {
      // Conversion already completed.
      // Remove generated output because
      // payment/credit authorization failed.

      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch (deleteError) {
          console.error(
            "Failed to delete output after credit failure:",
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

    // =================================
    // Send Response
    // =================================

    return res.status(200).json({
      success: true,

      message:
        "Image converted successfully.",

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
      "Image conversion error:",
      error
    );

    // =================================
    // Delete Uploaded File On Error
    // =================================

    if (
      uploadedFilePath &&
      fs.existsSync(
        uploadedFilePath
      )
    ) {
      try {
        fs.unlinkSync(
          uploadedFilePath
        );
      } catch (deleteError) {
        console.error(
          "Failed to delete uploaded file:",
          deleteError
        );
      }
    }

    // =================================
    // Delete Output If Conversion
    // Completed But Something Failed
    // =================================

    if (
      conversionCompleted &&
      typeof outputPath !== "undefined" &&
      fs.existsSync(outputPath)
    ) {
      try {
        fs.unlinkSync(outputPath);
      } catch (deleteError) {
        console.error(
          "Failed to delete output file:",
          deleteError
        );
      }
    }

    // =================================
    // Send Error
    // =================================

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Image conversion failed.",
    });
  }
}

module.exports = {
  imageConversion,
};
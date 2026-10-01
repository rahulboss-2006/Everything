const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const protect = require("../middleware/auth");

const {
  convertImageToPdf,
  convertPdfToImage,
} = require("../controllers/pdfController");

const router = express.Router();

/* =========================================
   UPLOAD DIRECTORY
========================================= */

const uploadDir = path.join(
  __dirname,
  "..",
  "uploads"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

/* =========================================
   MULTER STORAGE
========================================= */

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(null, uploadDir);
    },

    /*
      Keep original filename
    */

    filename: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        file.originalname
      );
    },
  });

/* =========================================
   IMAGE FILTER
========================================= */

const imageFileFilter = (
  req,
  file,
  cb
) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (
    allowedTypes.includes(
      file.mimetype
    )
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG and WEBP images are allowed."
      )
    );
  }
};

/* =========================================
   PDF FILTER
========================================= */

const pdfFileFilter = (
  req,
  file,
  cb
) => {
  if (
    file.mimetype ===
    "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only PDF files are allowed."
      )
    );
  }
};

/* =========================================
   IMAGE UPLOAD
========================================= */

const upload = multer({
  storage,

  fileFilter:
    imageFileFilter,

  limits: {
    fileSize:
      Number(
        process.env.MAX_FILE_SIZE
      ) || 52428800,
  },
});

/* =========================================
   PDF UPLOAD
========================================= */

const pdfUpload = multer({
  storage,

  fileFilter:
    pdfFileFilter,

  limits: {
    fileSize:
      Number(
        process.env.MAX_FILE_SIZE
      ) || 52428800,
  },
});

/* =========================================
   IMAGE → PDF
========================================= */

router.post(
  "/image-to-pdf",
  protect,
  upload.single("file"),
  convertImageToPdf
);

/* =========================================
   PDF → IMAGE
========================================= */

router.post(
  "/pdf-to-image",
  protect,
  pdfUpload.single("file"),
  convertPdfToImage
);

module.exports = router;
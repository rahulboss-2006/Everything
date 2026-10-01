const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const protect = require("../middleware/auth");

const {
    imageConversion,
} = require("../controllers/imageController");

const router = express.Router();

// ===============================
// Upload Directory
// ===============================
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

// ===============================
// Multer Storage
// ===============================
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },

    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);

        const name = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_]/g, "_");

        const uniqueName =
            `${name}-${Date.now()}${ext}`;

        cb(null, uniqueName);
    },
});

// ===============================
// File Filter
// ===============================
const fileFilter = (_req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Only JPG, JPEG, PNG and WEBP images are allowed."
            )
        );
    }
};

// ===============================
// Multer
// ===============================
const upload = multer({
    storage,
    fileFilter,

    limits: {
        fileSize:
            Number(process.env.MAX_FILE_SIZE) ||
            52428800,
    },
});

// ===============================
// Image Conversion Route
// ===============================
router.post(
  "/image",
  protect,
  upload.single("file"),
  imageConversion
);

module.exports = router;
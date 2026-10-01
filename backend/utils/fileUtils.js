const path = require("path");

// =====================================
// Allowed Output Formats
// =====================================

const ALLOWED_FORMATS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
];

// =====================================
// Allowed Input MIME Types
// =====================================

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// =====================================
// Get File Extension
// =====================================

function getExtension(filename) {
  return path
    .extname(filename)
    .slice(1)
    .toLowerCase();
}

// =====================================
// Get File Base Name
// =====================================

function getBaseName(filename) {
  return path.parse(filename).name;
}

// =====================================
// Check Allowed Output Format
// =====================================

function isAllowedFormat(format) {
  return ALLOWED_FORMATS.includes(
    String(format).toLowerCase()
  );
}

// =====================================
// Check Allowed MIME Type
// =====================================

function isAllowedMimeType(mimeType) {
  return ALLOWED_MIME_TYPES.includes(
    mimeType
  );
}

// =====================================
// Get Output Extension
// =====================================

function getOutputExtension(format) {
  const normalized = String(format)
    .toLowerCase();

  if (normalized === "jpg") {
    return "jpg";
  }

  if (normalized === "jpeg") {
    return "jpeg";
  }

  if (normalized === "png") {
    return "png";
  }

  if (normalized === "webp") {
    return "webp";
  }

  throw new Error(
    "Unsupported output format"
  );
}

// =====================================
// Exports
// =====================================

module.exports = {
  ALLOWED_FORMATS,
  ALLOWED_MIME_TYPES,
  getExtension,
  getBaseName,
  isAllowedFormat,
  isAllowedMimeType,
  getOutputExtension,
};
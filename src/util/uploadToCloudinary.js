import cloudinary from "../config/cloudinary.js";

// ─── Cloudinary Folder Constants ─────────────────────────────────────────────
// All folder paths in one place — change here, applies everywhere.
export const FOLDERS = {
  DEPARTMENT: "ramachandra-hospital/departments",
  DOCTOR:     "ramachandra-hospital/doctors",
  BLOG:       "ramachandra-hospital/blogs",
  GALLERY:    "ramachandra-hospital/gallery",
};

// ─── Config ───────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_MB  = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 5 242 880 bytes
const ALLOWED_FORMATS   = ["jpg", "jpeg", "png", "webp", "avif"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Determine if the input is a base64 data URI
const isBase64DataUri = (str) =>
  typeof str === "string" && str.startsWith("data:image");

// Determine if the input is an already-uploaded Cloudinary URL (skip re-upload)
const isCloudinaryUrl = (str) =>
  typeof str === "string" && str.includes("res.cloudinary.com");

// Estimate byte size of a base64 string
// Formula: (base64Length / 4) * 3  — minus padding bytes
const estimateBase64Size = (dataUri) => {
  const base64 = dataUri.split(",")[1] || "";
  const padding = (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  return Math.floor((base64.length / 4) * 3) - padding;
};

// ─── Main Upload Function ─────────────────────────────────────────────────────
/**
 * Upload an image to Cloudinary.
 *
 * @param {string | Buffer} input
 *   - base64 data URI  ("data:image/jpeg;base64,...")
 *   - raw Buffer (from multer memory storage)
 *   - mimetype (needed when input is a Buffer — pass as 3rd arg)
 *   - already a Cloudinary URL → returned as-is (no re-upload)
 *   - empty string / null / undefined → returns null (no upload)
 *
 * @param {string} folder  One of the FOLDERS constants
 * @param {string} [mimetype]  Required when input is a Buffer
 *
 * @returns {Promise<string | null>}  Cloudinary secure_url, or null
 *
 * @throws {Error}  If file exceeds 5 MB or format is not allowed
 */
export const uploadToCloudinary = async (input, folder, mimetype) => {
  // ── Nothing to upload ──────────────────────────────────────────────────────
  if (!input) return null;

  // ── Already a live Cloudinary URL → skip re-upload ──────────────────────
  if (isCloudinaryUrl(input)) return input;

  let dataUri;

  // ── Convert Buffer → data URI (multer memory upload) ──────────────────────
  if (Buffer.isBuffer(input)) {
    if (!mimetype) throw new Error("mimetype is required when uploading a Buffer");
    dataUri = `data:${mimetype};base64,${input.toString("base64")}`;
  } else if (isBase64DataUri(input)) {
    dataUri = input;
  } else {
    // Plain URL that is not Cloudinary — we don't re-upload external URLs
    return input;
  }

  // ── Validate file size (≤ 5 MB) ────────────────────────────────────────────
  const estimatedBytes = estimateBase64Size(dataUri);
  if (estimatedBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (estimatedBytes / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Image size ${sizeMB} MB exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB`
    );
  }

  // ── Upload to Cloudinary ───────────────────────────────────────────────────
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type:   "image",
    allowed_formats: ALLOWED_FORMATS,    // Cloudinary will reject other formats
    // Cloudinary transformation: auto quality + format, cap dimensions at 2000px
    transformation: [
      { quality: "auto", fetch_format: "auto" },
      { width: 2000, height: 2000, crop: "limit" },
    ],
  });

  return result.secure_url;
};

/**
 * Convenience wrapper for multer req.file uploads.
 * Usage: await uploadFileToCloudinary(req.file, FOLDERS.DOCTOR)
 */
export const uploadFileToCloudinary = async (file, folder) => {
  if (!file) return null;
  return uploadToCloudinary(file.buffer, folder, file.mimetype);
};

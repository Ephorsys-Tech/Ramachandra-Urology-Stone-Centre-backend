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
 * Upload an image to Cloudinary and return full details ({ url, public_id }).
 */
export const uploadToCloudinaryDetails = async (input, folder, mimetype) => {
  if (!input) return null;

  // 1. If already a live Cloudinary URL, skip re-upload
  if (typeof input === "string" && isCloudinaryUrl(input)) {
    return { url: input, public_id: null };
  }

  let uploadPayload;

  // 2. Buffer upload (from multer)
  if (Buffer.isBuffer(input)) {
    if (!mimetype) throw new Error("mimetype is required when uploading a Buffer");
    uploadPayload = `data:${mimetype};base64,${input.toString("base64")}`;
  }
  // 3. String upload (Data URI, HTTP URL, or raw base64 string)
  else if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("data:image") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      uploadPayload = trimmed;
    } else {
      // Raw base64 string without data:image header
      uploadPayload = `data:image/jpeg;base64,${trimmed}`;
    }
  } else {
    return null;
  }

  // 4. Validate file size if it's a data URI
  if (typeof uploadPayload === "string" && uploadPayload.startsWith("data:image")) {
    const estimatedBytes = estimateBase64Size(uploadPayload);
    if (estimatedBytes > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (estimatedBytes / (1024 * 1024)).toFixed(2);
      throw new Error(
        `Image size ${sizeMB} MB exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB`
      );
    }
  }

  // 5. Upload to Cloudinary
  const result = await cloudinary.uploader.upload(uploadPayload, {
    folder,
    resource_type:   "image",
    allowed_formats: ALLOWED_FORMATS,
    transformation: [
      { quality: "auto", fetch_format: "auto" },
      { width: 2000, height: 2000, crop: "limit" },
    ],
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
  };
};

/**
 * Upload an image to Cloudinary and return secure_url (legacy helper).
 */
export const uploadToCloudinary = async (input, folder, mimetype) => {
  const result = await uploadToCloudinaryDetails(input, folder, mimetype);
  return result ? result.url : null;
};

/**
 * Convenience wrapper for multer req.file uploads returning details.
 */
export const uploadFileToCloudinaryDetails = async (file, folder) => {
  if (!file) return null;
  return uploadToCloudinaryDetails(file.buffer, folder, file.mimetype);
};

/**
 * Convenience wrapper for multer req.file uploads returning secure_url.
 */
export const uploadFileToCloudinary = async (file, folder) => {
  if (!file) return null;
  return uploadToCloudinary(file.buffer, folder, file.mimetype);
};

/**
 * Delete image from Cloudinary by public_id.
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary deletion error for public_id:", publicId, err);
  }
};


import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ─── Helper: SHA-256 hash ────────────────────────────────────────────────────
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin Name is Required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Admin Email is Required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin", "super_admin"],
      default: "admin",
    },

    // ─── Refresh Token (hashed) stored in DB ──────────────────────────────────
    // The raw token is NEVER stored — only its SHA-256 hash.
    // `select: false` means it is excluded from all queries by default.
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    refreshTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    // ─── Password Reset Fields ────────────────────────────────────────────────
    passwordResetOtp: {
      type: String,
      select: false,
    },
    passwordResetOtpExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetTokenExpires: {
      type: Date,
      select: false,
    },
    passwordResetVerified: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true },
);

// ─── Hash Password Before Save ───────────────────────────────────────────────
adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// ─── Compare Password ────────────────────────────────────────────────────────
adminSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// ─── Save Hashed Refresh Token ───────────────────────────────────────────────
// Call with the RAW (plain-text) refresh token — the model hashes it before save.
adminSchema.methods.saveRefreshToken = async function (rawToken, expiryMs) {
  this.refreshToken = sha256(rawToken);
  this.refreshTokenExpiry = new Date(Date.now() + expiryMs);
  await this.save({ validateBeforeSave: false });
};

// ─── Verify a Raw Refresh Token Against the Stored Hash ──────────────────────
adminSchema.methods.verifyStoredRefreshToken = function (rawToken) {
  if (!this.refreshToken || !this.refreshTokenExpiry) return false;
  if (new Date() > this.refreshTokenExpiry) return false;
  return this.refreshToken === sha256(rawToken);
};

// ─── Clear / Revoke Refresh Token (Logout) ───────────────────────────────────
adminSchema.methods.clearRefreshToken = async function () {
  this.refreshToken = null;
  this.refreshTokenExpiry = null;
  await this.save({ validateBeforeSave: false });
};

const AdminModel = mongoose.model("Admin", adminSchema);
export default AdminModel;

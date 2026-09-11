import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Feature Model
// A Feature belongs to a Department.
// Only features with isActive = true are shown to normal (public) users.
// Admin can see all features regardless of isActive status.
// ─────────────────────────────────────────────────────────────────────────────

const featureSchema = new mongoose.Schema(
  {
    // ── Core Fields ───────────────────────────────────────────────────────────

    name: {
      type: String,
      required: [true, "Feature name is required"],
      trim: true,
      minlength: [2, "Feature name must be at least 2 characters"],
      maxlength: [150, "Feature name cannot exceed 150 characters"],
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    // ── Department Reference ──────────────────────────────────────────────────

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required for a feature"],
      index: true,
    },

    // ── Visibility ────────────────────────────────────────────────────────────
    // Only active features are shown to public users.
    // Admin can manage inactive features without deleting them.

    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Display Order ─────────────────────────────────────────────────────────
    // Lower number = shown first in UI.

    orderIndex: {
      type: Number,
      default: 0,
      min: [0, "Order index cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookup by department + active status
featureSchema.index({ department: 1, isActive: 1, orderIndex: 1 });

const FeatureModel = mongoose.model("Feature", featureSchema);
export default FeatureModel;

import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Disease Model
// A Disease belongs to a Department.
// Only diseases with isActive = true are shown to normal (public) users.
// Admin can see and manage all diseases regardless of isActive.
// ─────────────────────────────────────────────────────────────────────────────

const diseaseSchema = new mongoose.Schema(
  {
    // ── Core Fields ───────────────────────────────────────────────────────────

    name: {
      type: String,
      required: [true, "Disease name is required"],
      trim: true,
      minlength: [2, "Disease name must be at least 2 characters"],
      maxlength: [150, "Disease name cannot exceed 150 characters"],
    },

    description: {
      type: String,
      required: [true, "Disease description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    // ── Department Reference ──────────────────────────────────────────────────

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required for a disease"],
      index: true,
    },

    // ── Visibility ────────────────────────────────────────────────────────────
    // Only active diseases are shown to public users.
    // Admin can manage inactive diseases without deleting them.

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
diseaseSchema.index({ department: 1, isActive: 1, orderIndex: 1 });

const DiseaseModel = mongoose.model("Disease", diseaseSchema);
export default DiseaseModel;

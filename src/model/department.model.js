import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Department Model
//
// Relationships (all via ObjectId refs + populate):
//   doctors  → DoctorModel   (Doctor.department points back here)
//   features → FeatureModel  (Feature.department points back here)
//   diseases → DiseaseModel  (Disease.department points back here)
//
// Public UI shows only:
//   - departments  where published = true
//   - features     where isActive  = true
//   - diseases     where isActive  = true
//   - doctors      where isAvailable = true
// ─────────────────────────────────────────────────────────────────────────────

const scheduleSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },

    openTime: {
      type: String,
      required: true,
    },

    closeTime: {
      type: String,
      required: true,
    },

    isClosed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const departmentSchema = new mongoose.Schema(
  {
    // ======================================================
    // Basic Info
    // ======================================================

    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },



    // ======================================================
    // Features (ObjectId refs → FeatureModel)
    // ======================================================
    // Feature.department points back to this Department.
    // populate("features") fetches full live Feature documents.
    // Public users see only features where isActive = true.
    // ======================================================

    features: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Feature",
      },
    ],

    // ======================================================
    // Doctors (ObjectId refs → DoctorModel)
    // ======================================================
    // This is a virtual-like relationship:
    //   - DoctorModel.department = ObjectId → this Department
    //   - Querying with .populate("doctors") gives full doctor data
    //   - No need to manually add/remove doctors here —
    //     assigning a doctor to this department is enough.
    //   - The `doctors` field below is kept for explicit linking
    //     (e.g. when creating a department and associating existing doctors).
    // ======================================================

    doctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
      },
    ],

    // ======================================================
    // Diseases (ObjectId refs → DiseaseModel)
    // ======================================================
    // Disease.department points back to this Department.
    // populate("diseases") fetches full live Disease documents.
    // Public users see only diseases where isActive = true.
    // ======================================================

    diseases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Disease",
      },
    ],

    // ======================================================
    // Timing & Availability
    // ======================================================

    schedule: [scheduleSchema],

    emergencyAvailable: {
      type: Boolean,
      default: false,
    },

    opdTime: {
      type: String,
      default: "",
    },

    // ======================================================
    // Status
    // ======================================================

    published: {
      type: Boolean,
      default: false,
    },

    category: {
      type: String,
      enum: ["General", "Specialized"],
      default: "General",
    },

    // ======================================================
    // Department Visibility in UI
    // ======================================================

    showInHomePage: {
      type: Boolean,
      default: false,
    },

    showInServicesPage: {
      type: Boolean,
      default: false,
    },

    orderIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Department = mongoose.model("Department", departmentSchema);

export default Department;


import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    specialty: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const diseaseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

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

    image: {
      type: String,
      required: true,
    },

    // icon: {
    //   type: String,
    //   required: true,
    // },

    color: {
      type: String,
      default: "",
    },

    // ======================================================
    // Department Features
    // ======================================================

    features: [
      {
        type: String,
      },
    ],

    // ======================================================
    // Doctors
    // ======================================================

    doctors: [doctorSchema],

    // ======================================================
    // Diseases
    // ======================================================

    diseases: [diseaseSchema],

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



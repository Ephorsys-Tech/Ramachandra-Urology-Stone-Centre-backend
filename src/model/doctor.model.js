import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Doctor email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    phone: {
      type: String,
      required: [true, "Doctor phone number is required"],
      match: [/^[0-9]{10}$/, "Phone number must be exactly 10 digits"],
    },

    specialization: {
      type: String,
      required: [true, "Doctor specialization is required"],
      trim: true,
      minlength: [2, "Specialization is too short"],
    },

    experience: {
      type: Number,
      required: [true, "Doctor experience is required"],
      min: [0, "Experience cannot be negative"],
      max: [60, "Experience seems invalid"],
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Doctor department is required"],
    },
    photo: {
      type: String,
      trim: true,
    },
    photoPublicId: {
      type: String,
      trim: true,
    },
    qualifications: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    about: {
      type: String,
      trim: true,
      default: "",
    },
    expertise: {
      type: [String],
      default: [],
    },
    publications: {
      type: [String],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    languages: {
      type: String,
      trim: true,
      default: "English",
    },
    timing: {
      type: String,
      trim: true,
      default: "14:00 - 16:00 • Mon, Fri & Sat",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const DoctorModel = mongoose.model("Doctor", doctorSchema);
export default DoctorModel;

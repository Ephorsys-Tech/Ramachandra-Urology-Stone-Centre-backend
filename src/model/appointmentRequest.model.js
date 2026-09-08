import mongoose from "mongoose";

const appointmentRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    age: {
      type: Number,
      required: [true, "Patient age is required"],
      min: [0, "Age cannot be negative"],
      max: [150, "Age seems invalid"],
    },

    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["Male", "Female", "Other"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[0-9]{10}$/, "Phone number must be exactly 10 digits"],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    preferredDate: {
      type: Date,
    },

    preferredTimeSlot: {
      type: String,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },

    adminNotes: {
      type: String,
      trim: true,
    },

    appointmentDate: {
      type: Date,
    },

    appointmentTime: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const AppointmentRequestModel = mongoose.model("AppointmentRequest", appointmentRequestSchema);
export default AppointmentRequestModel;

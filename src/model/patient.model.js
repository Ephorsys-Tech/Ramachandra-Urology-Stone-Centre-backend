import mongoose from "mongoose";

const patientHistorySchema = new mongoose.Schema(
  {
    visitDate: {
      type: Date,
      default: Date.now,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    treatment: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const patientSchema = new mongoose.Schema(
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
      required: [true, "Patient gender is required"],
      enum: ["Male", "Female", "Other"],
    },
    phone: {
      type: String,
      required: [true, "Patient phone number is required"],
      trim: true,
      match: [/^[0-9]{10}$/, "Phone number must be exactly 10 digits"],
    },
    bloodGroup: {
      type: String,
      trim: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-","Unknown"],
      default:"Unknown",
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    address: {
      type: String,
      trim: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Assigned doctor is required"],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Assigned department is required"],
    },
    history: {
      type: [patientHistorySchema],
      default: [],
    },
    status: {
      type: String,
      enum: [
        "Admitted",
        "Outpatient",
        "Emergency",
        "Recovery",
        "In Treatment",
        "Discharged",
      ],
      default: "Outpatient",
    },
    dischargeDate: {
      type: Date,
      default: null,
    },
    isDischarged: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ["Organic", "Online"],
      default: "Organic",
    },
    appointmentDate: {
      type: Date,
      default: null,
    },
    appointmentTime: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const PatientModel = mongoose.model("Patient", patientSchema);
export default PatientModel;

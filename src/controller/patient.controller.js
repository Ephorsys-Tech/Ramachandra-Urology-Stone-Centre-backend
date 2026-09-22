import mongoose from "mongoose";
import PatientModel from "../model/patient.model.js";
import DoctorModel from "../model/doctor.model.js";
import DepartmentModel from "../model/department.model.js";
import { io } from "../../server.js";

import { respond } from "../util/respond.js";

import sanitizePatientData from "../util/sanitizePatientData.js";
import validatePatientData from "../util/validatePatientData.js";

const validatePatientReferences = async ({ doctor, department }) => {
  if (doctor) {
    const doctorExists = await DoctorModel.exists({ _id: doctor });
    if (!doctorExists) return "Doctor not found";
  }

  if (department) {
    const departmentExists = await DepartmentModel.exists({ _id: department });
    if (!departmentExists) return "Department not found";
  }

  return null;
};

// ======================================================
// Add Patient
// POST -> /api/v1/patient/add
// ======================================================
export const addPatient = async (req, res) => {
  try {
    // ==================================================
    // Sanitize Data
    // ==================================================
    const sanitizedData = sanitizePatientData(req.body);

    // ==================================================
    // Validate Data
    // ==================================================
    const validationError = validatePatientData(sanitizedData);
    if (validationError) {
      return respond(res, 400, false, validationError);
    }

    const referenceError = await validatePatientReferences(sanitizedData);
    if (referenceError) {
      return respond(res, 404, false, referenceError);
    }

    // ==================================================
    // Duplicate Check
    // ==================================================
    const dupQuery = [];
    if (sanitizedData.email) dupQuery.push({ email: sanitizedData.email });
    if (sanitizedData.phone) dupQuery.push({ phone: sanitizedData.phone });

    if (dupQuery.length > 0) {
      const existingPatient = await PatientModel.findOne({ $or: dupQuery });
      if (existingPatient) {
        // Patient exists. Treat this as a follow-up / new assignment instead of returning 409 Conflict.
        const historyEntry = {
          visitDate: new Date(),
          doctor: sanitizedData.doctor,
          department: sanitizedData.department,
          diagnosis: sanitizedData.disease || "Consultation",
          treatment: "",
          notes: "Auto-generated from new registration attempt",
        };

        // Update the patient's current assignment
        existingPatient.doctor = sanitizedData.doctor;
        existingPatient.department = sanitizedData.department;
        if (sanitizedData.disease) existingPatient.disease = sanitizedData.disease;
        if (sanitizedData.status) existingPatient.status = sanitizedData.status;

        // Optionally update some demographics if provided
        if (sanitizedData.age) existingPatient.age = sanitizedData.age;
        if (sanitizedData.address) existingPatient.address = sanitizedData.address;

        existingPatient.history.push(historyEntry);
        await existingPatient.save();
        await existingPatient.populate("doctor department history.doctor history.department");

        io.emit("patientUpdated", existingPatient);

        return respond(
          res,
          200, // Returning 200 instead of 201 because it's an update
          true,
          "Patient already exists. Details updated and new visit added to history.",
          existingPatient
        );
      }
    }

    // ==================================================
    // Create Patient
    // ==================================================
    const newPatient = new PatientModel(sanitizedData);
    await newPatient.save();
    await newPatient.populate("doctor department history.doctor history.department");
    // Emit real-time event for new patient
    io.emit("patientAdded", newPatient);
    return respond(res, 201, true, "Patient added successfully", newPatient);
  } catch (error) {
    console.error("Error adding patient:", error);
    return respond(
      res,
      500,
      false,
      "An error occurred while adding the patient",
    );
  }
};

// ======================================================
// Get Patient By Email or Phone
// GET -> /api/v1/patient/getByContact?email=&phone=
// ======================================================
export const getPatientByContact = async (req, res) => {
  try {
    const email = req.query.email?.trim().toLowerCase();
    const phone = req.query.phone?.trim();
    // Validate input
    if (!email && !phone) {
      return respond(
        res,
        400,
        false,
        "Email or phone is required to search for a patient",
      );
    }

    // Build query
    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    // Search for patient
    const patient = await PatientModel.findOne({ $or: query });
    // Check if patient exists
    if (!patient) {
      return respond(res, 404, false, "Patient not found");
    }

    return respond(res, 200, true, "Patient found", patient);
  } catch (error) {
    console.error("Error searching patient by contact:", error);
    return respond(
      res,
      500,
      false,
      "An error occurred while searching for the patient",
    );
  }
};

// ======================================================
// Add Follow-Up Treatment By Email or Phone
// PUT -> /api/v1/patient/followup
// ======================================================
export const addFollowUpByContact = async (req, res) => {
  try {
    //===================================================
    // Sanitize input
    //===================================================
    const email = req.body.email?.trim().toLowerCase();
    const phone =
      req.body.phone !== undefined ? String(req.body.phone).trim() : undefined;
    const { doctor, department, diagnosis, treatment, notes, visitDate } =
      req.body;
    //===================================================
    // Validate input
    //===================================================
    if (!email && !phone) {
      return respond(
        res,
        400,
        false,
        "Email or phone is required to locate the patient",
      );
    }
    // At least one follow-up field must be provided

    if (!doctor && !department && !diagnosis && !treatment && !notes) {
      return respond(
        res,
        400,
        false,
        "At least one follow-up field is required",
      );
    }
    // Build query to find patient
    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });
    // Search for patient
    const patient = await PatientModel.findOne({ $or: query });
    // Check if patient exists
    if (!patient) {
      return respond(res, 404, false, "Patient not found");
    }
    // Create follow-up entry
    const historyEntry = {
      visitDate: visitDate ? new Date(visitDate) : new Date(),
    };
    // Validate and assign follow-up fields
    if (doctor) {
      if (!mongoose.Types.ObjectId.isValid(doctor)) {
        return respond(res, 400, false, "Invalid doctor ID");
      }
      patient.doctor = doctor;
      historyEntry.doctor = doctor;
    }
    // Validate and assign department if provided
    if (department) {
      if (!mongoose.Types.ObjectId.isValid(department)) {
        return respond(res, 400, false, "Invalid department ID");
      }
      patient.department = department;
      historyEntry.department = department;
    }

    const referenceError = await validatePatientReferences({
      doctor,
      department,
    });
    if (referenceError) {
      return respond(res, 404, false, referenceError);
    }

    if (diagnosis) {
      historyEntry.diagnosis = diagnosis.trim();
    }
    if (treatment) {
      historyEntry.treatment = treatment.trim();
    }
    if (notes) {
      historyEntry.notes = notes.trim();
    }
    // Add follow-up entry to patient's history
    patient.history.push(historyEntry);
    await patient.save();
    await patient.populate("doctor department history.doctor history.department");
    // Emit real-time event for follow-up addition and patient update
    io.emit("followUpAdded", {
      patientId: patient._id,
      followUp: historyEntry,
    });
    io.emit("patientUpdated", patient);

    return respond(
      res,
      200,
      true,
      "Follow-up treatment added successfully",
      patient,
    );
  } catch (error) {
    console.error("Error adding follow-up treatment:", error);
    return respond(
      res,
      500,
      false,
      "An error occurred while adding the follow-up treatment",
    );
  }
};

// ======================================================
// Update Patient By Id
// PUT -> /api/v1/patient/update/:id

export const updatePatientById = async (req, res) => {
  try {
    // Validate patient ID comming from URL parameter
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid patient ID");
    }
    // Check if patient exists
    const patient = await PatientModel.findById(id);
    if (!patient) {
      return respond(res, 404, false, "Patient not found");
    }
    // Sanitize input data
    const sanitizedData = sanitizePatientData(req.body);

    // Validate only provided fields
    if (
      sanitizedData.doctor &&
      !mongoose.Types.ObjectId.isValid(sanitizedData.doctor)
    ) {
      return respond(res, 400, false, "Invalid doctor ID");
    }
    // Validate department if provided
    if (
      sanitizedData.department &&
      !mongoose.Types.ObjectId.isValid(sanitizedData.department)
    ) {
      return respond(res, 400, false, "Invalid department ID");
    }

    const referenceError = await validatePatientReferences(sanitizedData);
    if (referenceError) {
      return respond(res, 404, false, referenceError);
    }
    // Validate other fields if provided

    if (sanitizedData.name) {
      if (sanitizedData.name.length < 3 || sanitizedData.name.length > 100) {
        return respond(
          res,
          400,
          false,
          "Patient name must be between 3 and 100 characters",
        );
      }
    }
    // Validate age if provided
    if (sanitizedData.age !== undefined) {
      if (
        typeof sanitizedData.age !== "number" ||
        isNaN(sanitizedData.age) ||
        sanitizedData.age < 0 ||
        sanitizedData.age > 150
      ) {
        return respond(
          res,
          400,
          false,
          "Patient age must be a number between 0 and 150",
        );
      }
    }

    if (sanitizedData.gender) {
      const allowedGenders = ["Male", "Female", "Other"];
      if (!allowedGenders.includes(sanitizedData.gender)) {
        return respond(
          res,
          400,
          false,
          "Gender must be Male, Female, or Other",
        );
      }
    }
    if (sanitizedData.phone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(sanitizedData.phone)) {
        return respond(
          res,
          400,
          false,
          "Phone number must be exactly 10 digits",
        );
      }
    }
    if (sanitizedData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedData.email)) {
        return respond(res, 400, false, "Invalid email format");
      }
    }

    // Check duplicates for email/phone
    if (sanitizedData.email || sanitizedData.phone) {
      const dupQuery = [];
      if (sanitizedData.email) dupQuery.push({ email: sanitizedData.email });
      if (sanitizedData.phone) dupQuery.push({ phone: sanitizedData.phone });
      // Exclude current patient from duplicate check
      const existing = await PatientModel.findOne({
        $or: dupQuery,
        _id: { $ne: id },
      });
      if (existing) {
        return respond(
          res,
          409,
          false,
          "Another patient exists with this email or phone number",
        );
      }
    }

    // Apply updates for provided fields
    Object.keys(sanitizedData).forEach((key) => {
      if (sanitizedData[key] !== undefined) {
        patient[key] = sanitizedData[key];
      }
    });
    // Save updated patient
    await patient.save();
    await patient.populate("doctor department history.doctor history.department");
    io.emit("patientUpdated", patient);
    return respond(res, 200, true, "Patient updated successfully", patient);
  } catch (error) {
    console.error("Error updating patient:", error);
    return respond(
      res,
      500,
      false,
      "An error occurred while updating the patient",
    );
  }
};

// ======================================================
// Delete Patient By Id
// DELETE -> /api/v1/patient/remove/:id
export const deletePatientById = async (req, res) => {
  try {
    // Validate patient ID coming from URL parameter

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid patient ID");
    }

    // Check if patient exists and delete
    const deleted = await PatientModel.findByIdAndDelete(id);
    if (!deleted) {
      return respond(res, 404, false, "Patient not found");
    }
    // Emit real-time event for patient deletion
    io.emit("patientRemoved", { patientId: id });
    return respond(res, 200, true, "Patient removed successfully");
  } catch (error) {
    console.error("Error deleting patient:", error);
    return respond(
      res,
      500,
      false,
      "An error occurred while deleting the patient",
    );
  }
};

// ======================================================
// Get All Patients
// GET -> /api/v1/patient/getAll
export const getAllPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10);
    const search = req.query.search?.trim();
    const status = req.query.status?.trim();

    let filter = {};
    if (status && status !== "All") {
      filter.status = status;
    }
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { disease: searchRegex },
      ];
    }

    const skip = (page - 1) * (limit || 0);

    let query = PatientModel.find(filter)
      .populate("doctor")
      .populate("department")
      .populate("history.doctor")
      .populate("history.department")
      .sort({ createdAt: -1 });
      
    if (limit) {
      query = query.skip(skip).limit(limit);
    }

    const patients = await query;
    const totalPatients = await PatientModel.countDocuments(filter);
    const totalPages = limit ? Math.max(1, Math.ceil(totalPatients / limit)) : 1;

    return respond(res, 200, true, "Patients retrieved successfully", { patients, totalPages, totalPatients, currentPage: page });
  } catch (error) {
    console.error("Error getting all patients:", error);
    return respond(
      res,
      500,
      false,
      "An error occurred while fetching patients",
    );
  }
};

// ======================================================
// Get Patient By Id
// GET -> /api/v1/patient/getById/:id
export const getPatientById = async (req, res) => {
  try {
    // Validate patient ID coming from URL parameter
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid patient ID");
    }

    // Fetch patient by ID with doctor, department, and history details
    const patient = await PatientModel.findById(id)
      .populate("doctor")
      .populate("department")
      .populate("history.doctor")
      .populate("history.department");

    if (!patient) return respond(res, 404, false, "Patient not found");
    console.log("Patient found:", patient);

    return respond(res, 200, true, "Patient retrieved successfully", patient);
  } catch (error) {
    console.error("Error getting patient by id:", error);
    return respond(
      res,
      500,
      false,
      "An error occurred while fetching the patient",
    );
  }
};

// ======================================================
// Get Patients By Doctor Id
// GET -> /api/v1/patient/getByDoctorId/:doctorId
export const getPatientsByDoctorId = async (req, res) => {
  try {
    // Validate doctor ID coming from URL parameter
    const doctorId = req.params.doctorId;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return respond(res, 400, false, "Invalid doctor ID");
    }
    // Fetch patients by doctor ID with doctor and department details, sorted by creation date

    const patients = await PatientModel.find({ doctor: doctorId })
      .populate("doctor")
      .populate("department")
      .sort({ createdAt: -1 });

    return respond(res, 200, true, "Patients retrieved successfully", patients);
  } catch (error) {
    console.error("Error getting patients by doctor id:", error);
    return respond(
      res,
      500,
      false,
      "An error occurred while fetching patients",
    );
  }
};

// ======================================================
// Get Patients By Department Id
// GET -> /api/v1/patient/getByDepartmentId/:departmentId
export const getPatientsByDepartmentId = async (req, res) => {
  try {
    // Validate department ID coming from URL parameter
    const departmentId = req.params.departmentId;
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return respond(res, 400, false, "Invalid department ID");
    }
    // Fetch patients by department ID with doctor and department details, sorted by creation date
    const patients = await PatientModel.find({ department: departmentId })
      .populate("doctor")
      .populate("department")
      .sort({ createdAt: -1 });

    return respond(res, 200, true, "Patients retrieved successfully", patients);
  } catch (error) {
    console.error("Error getting patients by department id:", error);
    return respond(
      res,
      500,
      false,
      "An error occurred while fetching patients",
    );
  }
};

// ======================================================
// Get Patients History By Patient Id
// GET -> /api/v1/patient/getHistoryByPatientId/:patientId
export const getPatientsHistoryByPatientId = async (req, res) => {
  try {
    // Validate patient ID coming from URL parameter
    const patientId = req.params.patientId;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return respond(res, 400, false, "Invalid patient ID");
    }
    // Fetch patient by ID with populated history details
    const patient = await PatientModel.findById(patientId)
      .populate("doctor")
      .populate("department")
      .populate("history.doctor")
      .populate("history.department");
    // Check if patient exists
    if (!patient) return respond(res, 404, false, "Patient not found");

    return respond(
      res,
      200,
      true,
      "Patient history retrieved successfully",
      patient.history,
    );
  } catch (error) {
    console.error("Error getting patient history:", error);
    return respond(
      res,
      500,
      false,
      "An error occurred while fetching patient history",
    );
  }
};

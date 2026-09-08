import express from "express";
import protect from "../middleware/auth.middleware.js";

import {
  addPatient,
  updatePatientById,
  deletePatientById,
  getAllPatients,
  getPatientById,
  getPatientsByDoctorId,
  getPatientsByDepartmentId,
  getPatientsHistoryByPatientId,
  getPatientByContact,
  addFollowUpByContact,
} from "../controller/patient.controller.js";

const router = express.Router();

// ------------------------------------------------------
// Patient Authentication Routes
// ------------------------------------------------------

// Add Patient
// POST -> /api/v1/patient/add
router.post("/add", protect, addPatient);

// Update Patient
// PUT -> /api/v1/patient/update/:id
router.put("/update/:id", protect, updatePatientById);

// Remove Patient
// DELETE -> /api/v1/patient/remove/:id
router.delete("/remove/:id", protect, deletePatientById);

// Get All Patients
// GET -> /api/v1/patient/getAll
router.get("/getAll", getAllPatients);

// Get Patient By Id
// GET -> /api/v1/patient/getById/:id
router.get("/getById/:id", protect, getPatientById);

// Get Patient By Contact
// GET -> /api/v1/patient/getByContact?email=&phone=
router.get("/getByContact", protect, getPatientByContact);

// Add Follow-Up Treatment By Contact
// PUT -> /api/v1/patient/followup
router.put("/followup", protect, addFollowUpByContact);

// Get Patients By Doctor Id
// GET -> /api/v1/patient/getByDoctorId/:doctorId
router.get("/getByDoctorId/:doctorId", protect, getPatientsByDoctorId);

// Get Patients By Department Id
// GET -> /api/v1/patient/getByDepartmentId/:departmentId
router.get("/getByDepartmentId/:departmentId", protect, getPatientsByDepartmentId);

// Get Patients History By Patient Id
// GET -> /api/v1/patient/getHistoryByPatientId/:patientId
router.get("/getHistoryByPatientId/:patientId", protect, getPatientsHistoryByPatientId);

export default router;

import express from "express";
import multer from "multer";

import protect from "../middleware/auth.middleware.js";

import {
  addDoctor,
  updateDoctorById,
  deleteDoctorById,
  getAllDoctors,
  getDoctorById,
} from "../controller/doctor.controller.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// ------------------------------------------------------
// Doctor Authentication Routes
// ------------------------------------------------------

// Add Doctor
// POST -> /api/v1/doctor/add
router.post("/add", protect, upload.single("photo"), addDoctor);

// Update Doctor
// PUT -> /api/v1/doctor/update/:id
router.put("/update/:id", protect, upload.single("photo"), updateDoctorById);

// Remove Doctor
// DELETE -> /api/v1/doctor/remove/:id
router.delete("/remove/:id", protect, deleteDoctorById);

// Get All Doctors
// GET -> /api/v1/doctor/getAll
router.get("/getAll", getAllDoctors);

// Get Doctor By Id
// GET -> /api/v1/doctor/getById/:id
router.get("/getById/:id", getDoctorById);

export default router;
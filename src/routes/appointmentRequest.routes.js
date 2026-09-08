import express from "express";
import protect from "../middleware/auth.middleware.js";

import {
  submitAppointmentRequest,
  getAllAppointmentRequests,
  updateAppointmentRequestStatus,
  deleteAppointmentRequest,
  deleteRejectedAppointmentRequests,
} from "../controller/appointmentRequest.controller.js";

const router = express.Router();

// ------------------------------------------------------
// Submit Appointment Request (Public — no auth)
// POST -> /api/v1/appointment-request/submit
// ------------------------------------------------------
router.post("/submit", submitAppointmentRequest);

// ------------------------------------------------------
// Get All Appointment Requests (Admin — protected)
// GET -> /api/v1/appointment-request/getAll
// ------------------------------------------------------
router.get("/getAll", protect, getAllAppointmentRequests);

// ------------------------------------------------------
// Update Appointment Request Status (Admin — protected)
// PUT -> /api/v1/appointment-request/update/:id
// ------------------------------------------------------
router.put("/update/:id", protect, updateAppointmentRequestStatus);

// ------------------------------------------------------
// Delete All Rejected Appointment Requests (Admin — protected)
// DELETE -> /api/v1/appointment-request/remove-rejected
// ------------------------------------------------------
router.delete("/remove-rejected", protect, deleteRejectedAppointmentRequests);

// ------------------------------------------------------
// Delete Appointment Request (Admin — protected)
// DELETE -> /api/v1/appointment-request/remove/:id
// ------------------------------------------------------
router.delete("/remove/:id", protect, deleteAppointmentRequest);

export default router;

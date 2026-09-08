import express from "express";
import adminRoutes from "../routes/admin.routes.js";
import doctorRoutes from "../routes/doctor.routes.js";
import departmentRoutes from "../routes/department.routes.js";
import patientRoutes from "../routes/patient.routes.js";
import appointmentRequestRoutes from "../routes/appointmentRequest.routes.js";
import galleryRoutes from "../routes/gallery.routes.js";
import messageRoutes from "../routes/message.routes.js";
import settingRoutes from "../routes/setting.routes.js";

const router = express.Router();

// ========================================
// Admin Routes
// ========================================
router.use("/admin", adminRoutes);

//===========================================
// Doctor Routes
//===========================================
router.use("/doctor", doctorRoutes);

// //===========================================
// // Patient Routes
// //===========================================
router.use("/patient", patientRoutes);

//===========================================
// Department Routes
//===========================================
router.use("/department", departmentRoutes);

//===========================================
// Appointment Request Routes
//===========================================
router.use("/appointment-request", appointmentRequestRoutes);

//===========================================
// Gallery Routes
//===========================================
router.use("/gallery", galleryRoutes);

//===========================================
// Message Routes
//===========================================
router.use("/message", messageRoutes);

//===========================================
// Setting Routes
//===========================================
router.use("/setting", settingRoutes);

//===========================================
// Blog Routes
//===========================================
import blogRoutes from "../routes/blog.routes.js";
router.use("/blog", blogRoutes);

export default router;

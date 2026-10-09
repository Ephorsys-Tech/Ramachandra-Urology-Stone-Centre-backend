import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  addDepartment,
  updateDepartmentById,
  deleteDepartmentById,
  getAllDepartments,
  getPublishedDepartments,
  getDepartmentBySlug,
  getDoctorsByDepartmentId,
} from "../controller/department.controller.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Department Routes
// Base: /api/v1/department
// ─────────────────────────────────────────────────────────────────────────────

// ── Admin Routes (Protected) ──────────────────────────────────────────────────

// Add a new department
// POST → /api/v1/department/add
router.post("/add", protect, addDepartment);

// Update department by ID
// PUT → /api/v1/department/update/:id
router.put("/update/:id", protect, updateDepartmentById);

// Delete department by ID
// DELETE → /api/v1/department/remove/:id
router.delete("/remove/:id", protect, deleteDepartmentById);

// Get ALL departments (admin sees published + unpublished, all features/diseases)
// GET → /api/v1/department/getAll
router.get("/getAll", protect, getAllDepartments);

// ── Public Routes (No auth required) ─────────────────────────────────────────

// Get ONLY published departments (active features/diseases filtered for public)
// GET → /api/v1/department/getPublished
router.get("/getPublished", getPublishedDepartments);

// Get department by slug (features/diseases filtered to active only)
// GET → /api/v1/department/getBySlug/:slug
router.get("/getBySlug/:slug", getDepartmentBySlug);

// Get doctors by department ID
// GET → /api/v1/department/getDoctorsByDepartmentId/:id
router.get("/getDoctorsByDepartmentId/:id", getDoctorsByDepartmentId);

export default router;
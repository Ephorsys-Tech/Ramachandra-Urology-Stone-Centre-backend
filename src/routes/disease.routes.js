import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  addDisease,
  updateDiseaseById,
  deleteDiseaseById,
  toggleDiseaseStatus,
  getAllDiseasesByDepartment,
  getActiveDiseasesByDepartment,
  getDiseaseById,
} from "../controller/disease.controller.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Disease Routes
// Base: /api/v1/disease
// ─────────────────────────────────────────────────────────────────────────────

// ── Admin Routes (Protected) ──────────────────────────────────────────────────

// Add a new disease
// POST → /api/v1/disease/add
router.post("/add", protect, addDisease);

// Update disease by ID
// PUT → /api/v1/disease/update/:id
router.put("/update/:id", protect, updateDiseaseById);

// Delete disease by ID
// DELETE → /api/v1/disease/remove/:id
router.delete("/remove/:id", protect, deleteDiseaseById);

// Toggle disease active/inactive status
// PATCH → /api/v1/disease/toggle/:id
router.patch("/toggle/:id", protect, toggleDiseaseStatus);

// Get ALL diseases by department (admin sees active + inactive)
// GET → /api/v1/disease/getByDepartment/:departmentId
router.get("/getByDepartment/:departmentId", protect, getAllDiseasesByDepartment);

// Get single disease by ID (admin)
// GET → /api/v1/disease/getById/:id
router.get("/getById/:id", protect, getDiseaseById);

// ── Public Routes (No auth required) ─────────────────────────────────────────

// Get ONLY active diseases by department (for frontend/public users)
// GET → /api/v1/disease/getActiveByDepartment/:departmentId
router.get("/getActiveByDepartment/:departmentId", getActiveDiseasesByDepartment);

export default router;

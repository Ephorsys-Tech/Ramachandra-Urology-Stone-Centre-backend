import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  getAllFeatures,
  addFeature,
  updateFeatureById,
  deleteFeatureById,
  toggleFeatureStatus,
  getAllFeaturesByDepartment,
  getActiveFeaturesByDepartment,
  getFeatureById,
  getFeatureBySlug,
} from "../controller/feature.controller.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Feature Routes
// Base: /api/v1/feature
// ─────────────────────────────────────────────────────────────────────────────

// ── Admin Routes (Protected) ──────────────────────────────────────────────────

// Get ALL features across departments
// GET → /api/v1/feature/all
router.get("/all", protect, getAllFeatures);

// Add a new feature
// POST → /api/v1/feature/add
router.post("/add", protect, addFeature);

// Update feature by ID
// PUT → /api/v1/feature/update/:id
router.put("/update/:id", protect, updateFeatureById);

// Delete feature by ID
// DELETE → /api/v1/feature/remove/:id
router.delete("/remove/:id", protect, deleteFeatureById);

// Toggle feature active/inactive status
// PATCH → /api/v1/feature/toggle/:id
router.patch("/toggle/:id", protect, toggleFeatureStatus);

// Get ALL features by department (admin sees active + inactive)
// GET → /api/v1/feature/getByDepartment/:departmentId
router.get("/getByDepartment/:departmentId", protect, getAllFeaturesByDepartment);

// Get single feature by ID (admin)
// GET → /api/v1/feature/getById/:id
router.get("/getById/:id", protect, getFeatureById);

// ── Public Routes (No auth required) ─────────────────────────────────────────

// Get ONLY active features by department (for frontend/public users)
// GET → /api/v1/feature/getActiveByDepartment/:departmentId
router.get("/getActiveByDepartment/:departmentId", getActiveFeaturesByDepartment);

// Get single feature by slug or ID (public)
// GET → /api/v1/feature/getBySlug/:slug
router.get("/getBySlug/:slug", getFeatureBySlug);

export default router;

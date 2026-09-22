import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  getAllServices,
  getPublishedServices,
  getServiceById,
  getServiceBySlug,
  addService,
  updateServiceById,
  deleteServiceById,
  toggleServiceStatus,
  getServicesByFeature,
} from "../controller/service.controller.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Service Routes
// Base: /api/v1/service
// ─────────────────────────────────────────────────────────────────────────────

// ── Admin Routes (Protected) ──────────────────────────────────────────────────
router.get("/all", protect, getAllServices);
router.post("/add", protect, addService);
router.put("/update/:id", protect, updateServiceById);
router.delete("/remove/:id", protect, deleteServiceById);
router.patch("/toggle/:id", protect, toggleServiceStatus);

// ── Public Routes (No auth required) ─────────────────────────────────────────
router.get("/getPublished", getPublishedServices);
router.get("/getById/:id", getServiceById);
router.get("/getBySlug/:slug", getServiceBySlug);
router.get("/getByFeature/:featureId", getServicesByFeature);

export default router;

import express from "express";

import protect from "../middleware/auth.middleware.js";

import {
  addDepartment,
  updateDepartmentById,
  deleteDepartmentById,
  getAllDepartments,
  getDoctorsByDepartmentId,
  getDepartmentBySlug,
} from "../controller/department.controller.js";

const router = express.Router();

// ------------------------------------------------------
// Add Department Routes
// post -> /api/v1/department/add
// ------------------------------------------------------
router.post("/add", protect, addDepartment);

//------------------------------------------------------
// Update Department Routes
// put -> /api/v1/department/update/:id
// ------------------------------------------------------
router.put("/update/:id", protect, updateDepartmentById);

//------------------------------------------------------
// Remove Department Routes
// delete -> /api/v1/department/remove/:id
// ------------------------------------------------------
router.delete("/remove/:id", protect, deleteDepartmentById);

//------------------------------------------------------
// Get All Departments Routes
// get -> /api/v1/department/getAll
// ------------------------------------------------------
router.get("/getAll", getAllDepartments);

// Get Department By Slug
// GET -> /api/v1/department/getBySlug/:slug
router.get("/getBySlug/:slug", getDepartmentBySlug);

// get Doctors by Department Id
// GET -> /api/v1/department/getDoctorsByDepartmentId/:id
router.get("/getDoctorsByDepartmentId/:id", getDoctorsByDepartmentId);

export default router;
import mongoose from "mongoose";
import DiseaseModel from "../model/disease.model.js";
import DepartmentModel from "../model/department.model.js";
import { respond } from "../util/respond.js";
import { io } from "../../server.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: populate department name only
// ─────────────────────────────────────────────────────────────────────────────
const populateDisease = (query) =>
  query.populate("department", "name slug");

// =============================================================================
// ADD DISEASE
// POST → /api/v1/disease/add
// @access Private (Admin)
// =============================================================================
export const addDisease = async (req, res) => {
  try {
    const { name, description, department, isActive, orderIndex } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!name || !name.trim()) {
      return respond(res, 400, false, "Disease name is required");
    }
    if (!description || !description.trim()) {
      return respond(res, 400, false, "Disease description is required");
    }
    if (!department) {
      return respond(res, 400, false, "Department is required");
    }
    if (!mongoose.Types.ObjectId.isValid(department)) {
      return respond(res, 400, false, "Invalid department ID");
    }

    // ── Check department exists ───────────────────────────────────────────────
    const deptExists = await DepartmentModel.findById(department).select("_id name");
    if (!deptExists) {
      return respond(res, 404, false, "Department not found");
    }

    // ── Create ────────────────────────────────────────────────────────────────
    const disease = await DiseaseModel.create({
      name:        name.trim(),
      description: description.trim(),
      department,
      isActive:    isActive !== undefined ? (typeof isActive === "string" ? isActive === "true" : Boolean(isActive)) : true,
      orderIndex:  typeof orderIndex === "number" ? orderIndex : 0,
    });

    // Synchronize disease into Department schema diseases array
    await DepartmentModel.findByIdAndUpdate(department, {
      $addToSet: { diseases: disease._id },
    });

    const populated = await populateDisease(DiseaseModel.findById(disease._id));

    io.emit("diseaseAdded", populated);
    return respond(res, 201, true, "Disease added successfully", populated);
  } catch (error) {
    console.error("Add Disease Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// UPDATE DISEASE
// PUT → /api/v1/disease/update/:id
// @access Private (Admin)
// =============================================================================
export const updateDiseaseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid disease ID");
    }

    const disease = await DiseaseModel.findById(id);
    if (!disease) {
      return respond(res, 404, false, "Disease not found");
    }

    const { name, description, department, isActive, orderIndex } = req.body;

    // ── Validate department if changing ───────────────────────────────────────
    if (department !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(department)) {
        return respond(res, 400, false, "Invalid department ID");
      }
      const deptExists = await DepartmentModel.findById(department).select("_id");
      if (!deptExists) {
        return respond(res, 404, false, "Department not found");
      }
      if (disease.department && disease.department.toString() !== department.toString()) {
        await DepartmentModel.findByIdAndUpdate(disease.department, {
          $pull: { diseases: disease._id },
        });
        await DepartmentModel.findByIdAndUpdate(department, {
          $addToSet: { diseases: disease._id },
        });
      }
      disease.department = department;
    }

    // ── Apply updates ─────────────────────────────────────────────────────────
    if (name !== undefined)        disease.name        = name.trim();
    if (description !== undefined) disease.description = description.trim();
    if (isActive !== undefined)    disease.isActive    = typeof isActive === "string" ? isActive === "true" : Boolean(isActive);
    if (orderIndex !== undefined)  disease.orderIndex  = Number(orderIndex);

    await disease.save();

    const populated = await populateDisease(DiseaseModel.findById(disease._id));

    io.emit("diseaseUpdated", populated);
    return respond(res, 200, true, "Disease updated successfully", populated);
  } catch (error) {
    console.error("Update Disease Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// DELETE DISEASE
// DELETE → /api/v1/disease/remove/:id
// @access Private (Admin)
// =============================================================================
export const deleteDiseaseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid disease ID");
    }

    const disease = await DiseaseModel.findById(id);
    if (!disease) {
      return respond(res, 404, false, "Disease not found");
    }

    if (disease.department) {
      await DepartmentModel.findByIdAndUpdate(disease.department, {
        $pull: { diseases: id },
      });
    }

    await disease.deleteOne();

    io.emit("diseaseDeleted", { id });
    return respond(res, 200, true, "Disease deleted successfully");
  } catch (error) {
    console.error("Delete Disease Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// TOGGLE DISEASE ACTIVE STATUS
// PATCH → /api/v1/disease/toggle/:id
// @access Private (Admin)
// =============================================================================
export const toggleDiseaseStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid disease ID");
    }

    const disease = await DiseaseModel.findById(id);
    if (!disease) {
      return respond(res, 404, false, "Disease not found");
    }

    disease.isActive = !disease.isActive;
    await disease.save();

    const populated = await populateDisease(DiseaseModel.findById(disease._id));

    io.emit("diseaseToggled", populated);
    return respond(
      res, 200, true,
      `Disease is now ${disease.isActive ? "active" : "inactive"}`,
      populated
    );
  } catch (error) {
    console.error("Toggle Disease Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET ALL DISEASES BY DEPARTMENT (Admin — sees all)
// GET → /api/v1/disease/getByDepartment/:departmentId
// @access Private (Admin)
// =============================================================================
export const getAllDiseasesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return respond(res, 400, false, "Invalid department ID");
    }

    const deptExists = await DepartmentModel.findById(departmentId).select("_id name");
    if (!deptExists) {
      return respond(res, 404, false, "Department not found");
    }

    // Admin sees ALL diseases (active + inactive), ordered by orderIndex
    const diseases = await DiseaseModel
      .find({ department: departmentId })
      .sort({ orderIndex: 1, createdAt: 1 })
      .populate("department", "name slug");

    return respond(res, 200, true, "Diseases retrieved successfully", diseases);
  } catch (error) {
    console.error("Get Diseases Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET ACTIVE DISEASES BY DEPARTMENT (Public — sees only active)
// GET → /api/v1/disease/getActiveByDepartment/:departmentId
// @access Public
// =============================================================================
export const getActiveDiseasesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return respond(res, 400, false, "Invalid department ID");
    }

    const deptExists = await DepartmentModel.findById(departmentId).select("_id name");
    if (!deptExists) {
      return respond(res, 404, false, "Department not found");
    }

    // Public sees ONLY active diseases
    const diseases = await DiseaseModel
      .find({ department: departmentId, isActive: true })
      .sort({ orderIndex: 1, createdAt: 1 })
      .select("name description orderIndex isActive department");

    return respond(res, 200, true, "Diseases retrieved successfully", diseases);
  } catch (error) {
    console.error("Get Active Diseases Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET SINGLE DISEASE BY ID
// GET → /api/v1/disease/getById/:id
// @access Private (Admin)
// =============================================================================
export const getDiseaseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid disease ID");
    }

    const disease = await populateDisease(DiseaseModel.findById(id));
    if (!disease) {
      return respond(res, 404, false, "Disease not found");
    }

    return respond(res, 200, true, "Disease retrieved successfully", disease);
  } catch (error) {
    console.error("Get Disease Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

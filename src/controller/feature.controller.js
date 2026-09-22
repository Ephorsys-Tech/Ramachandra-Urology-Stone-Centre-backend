import mongoose from "mongoose";
import FeatureModel from "../model/feature.model.js";
import DepartmentModel from "../model/department.model.js";
import { respond } from "../util/respond.js";
import { io } from "../../server.js";

// Helper: generate URL-safe slug
const generateSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: populate department name only
// ─────────────────────────────────────────────────────────────────────────────
const populateFeature = (query) =>
  query.populate("department", "name slug");

// =============================================================================
// GET ALL FEATURES (Admin — sees all features across all departments)
// GET → /api/v1/feature/all
// @access Private (Admin)
// =============================================================================
export const getAllFeatures = async (req, res) => {
  try {
    const features = await FeatureModel.find({})
      .sort({ orderIndex: 1, createdAt: -1 })
      .populate("department", "name slug");
    return respond(res, 200, true, "Features retrieved successfully", features);
  } catch (error) {
    console.error("Get All Features Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// ADD FEATURE
// POST → /api/v1/feature/add
// @access Private (Admin)
// =============================================================================
export const addFeature = async (req, res) => {
  try {
    const { name, slug, description, department, isActive, orderIndex } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!name || !name.trim()) {
      return respond(res, 400, false, "Feature name is required");
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

    const finalSlug = slug ? generateSlug(slug) : generateSlug(name);

    // ── Create ────────────────────────────────────────────────────────────────
    const feature = await FeatureModel.create({
      name:        name.trim(),
      slug:        finalSlug,
      description: description?.trim() || "",
      department,
      isActive:    isActive !== undefined ? (typeof isActive === "string" ? isActive === "true" : Boolean(isActive)) : true,
      orderIndex:  typeof orderIndex === "number" ? orderIndex : 0,
    });

    // Synchronize feature into Department schema features array
    await DepartmentModel.findByIdAndUpdate(department, {
      $addToSet: { features: feature._id },
    });

    const populated = await populateFeature(FeatureModel.findById(feature._id));

    io.emit("featureAdded", populated);
    return respond(res, 201, true, "Feature added successfully", populated);
  } catch (error) {
    console.error("Add Feature Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// UPDATE FEATURE
// PUT → /api/v1/feature/update/:id
// @access Private (Admin)
// =============================================================================
export const updateFeatureById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid feature ID");
    }

    const feature = await FeatureModel.findById(id);
    if (!feature) {
      return respond(res, 404, false, "Feature not found");
    }

    const { name, slug, description, department, isActive, orderIndex } = req.body;

    // ── Validate department if changing ───────────────────────────────────────
    if (department !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(department)) {
        return respond(res, 400, false, "Invalid department ID");
      }
      const deptExists = await DepartmentModel.findById(department).select("_id");
      if (!deptExists) {
        return respond(res, 404, false, "Department not found");
      }
      if (feature.department && feature.department.toString() !== department.toString()) {
        await DepartmentModel.findByIdAndUpdate(feature.department, {
          $pull: { features: feature._id },
        });
        await DepartmentModel.findByIdAndUpdate(department, {
          $addToSet: { features: feature._id },
        });
      }
      feature.department = department;
    }

    // ── Apply updates ─────────────────────────────────────────────────────────
    if (name !== undefined) feature.name = name.trim();
    if (slug !== undefined || name !== undefined) {
      const targetName = name !== undefined ? name.trim() : feature.name;
      feature.slug = slug ? generateSlug(slug) : generateSlug(targetName);
    }
    if (description !== undefined) feature.description = description.trim();
    if (isActive !== undefined)    feature.isActive    = typeof isActive === "string" ? isActive === "true" : Boolean(isActive);
    if (orderIndex !== undefined)  feature.orderIndex  = Number(orderIndex);

    await feature.save();

    const populated = await populateFeature(FeatureModel.findById(feature._id));

    io.emit("featureUpdated", populated);
    return respond(res, 200, true, "Feature updated successfully", populated);
  } catch (error) {
    console.error("Update Feature Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// DELETE FEATURE
// DELETE → /api/v1/feature/remove/:id
// @access Private (Admin)
// =============================================================================
export const deleteFeatureById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid feature ID");
    }

    const feature = await FeatureModel.findById(id);
    if (!feature) {
      return respond(res, 404, false, "Feature not found");
    }

    if (feature.department) {
      await DepartmentModel.findByIdAndUpdate(feature.department, {
        $pull: { features: id },
      });
    }

    await feature.deleteOne();

    io.emit("featureDeleted", { id });
    return respond(res, 200, true, "Feature deleted successfully");
  } catch (error) {
    console.error("Delete Feature Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// TOGGLE FEATURE ACTIVE STATUS
// PATCH → /api/v1/feature/toggle/:id
// @access Private (Admin)
// =============================================================================
export const toggleFeatureStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid feature ID");
    }

    const feature = await FeatureModel.findById(id);
    if (!feature) {
      return respond(res, 404, false, "Feature not found");
    }

    feature.isActive = !feature.isActive;
    await feature.save();

    const populated = await populateFeature(FeatureModel.findById(feature._id));

    io.emit("featureToggled", populated);
    return respond(
      res, 200, true,
      `Feature is now ${feature.isActive ? "active" : "inactive"}`,
      populated
    );
  } catch (error) {
    console.error("Toggle Feature Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET ALL FEATURES BY DEPARTMENT (Admin — sees all)
// GET → /api/v1/feature/getByDepartment/:departmentId
// @access Private (Admin)
// =============================================================================
export const getAllFeaturesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return respond(res, 400, false, "Invalid department ID");
    }

    const deptExists = await DepartmentModel.findById(departmentId).select("_id name");
    if (!deptExists) {
      return respond(res, 404, false, "Department not found");
    }

    // Admin sees ALL features (active + inactive), ordered by orderIndex
    const features = await FeatureModel
      .find({ department: departmentId })
      .sort({ orderIndex: 1, createdAt: 1 })
      .populate("department", "name slug");

    return respond(res, 200, true, "Features retrieved successfully", features);
  } catch (error) {
    console.error("Get Features Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET ACTIVE FEATURES BY DEPARTMENT (Public — sees only active)
// GET → /api/v1/feature/getActiveByDepartment/:departmentId
// @access Public
// =============================================================================
export const getActiveFeaturesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return respond(res, 400, false, "Invalid department ID");
    }

    const deptExists = await DepartmentModel.findById(departmentId).select("_id name");
    if (!deptExists) {
      return respond(res, 404, false, "Department not found");
    }

    // Public sees ONLY active features
    const features = await FeatureModel
      .find({ department: departmentId, isActive: true })
      .sort({ orderIndex: 1, createdAt: 1 })
      .select("name description orderIndex isActive department");

    return respond(res, 200, true, "Features retrieved successfully", features);
  } catch (error) {
    console.error("Get Active Features Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET SINGLE FEATURE BY ID
// GET → /api/v1/feature/getById/:id
// @access Private (Admin)
// =============================================================================
export const getFeatureById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid feature ID");
    }

    const feature = await populateFeature(FeatureModel.findById(id));
    if (!feature) {
      return respond(res, 404, false, "Feature not found");
    }

    return respond(res, 200, true, "Feature retrieved successfully", feature);
  } catch (error) {
    console.error("Get Feature By ID Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET FEATURE BY SLUG OR ID (Public)
// GET → /api/v1/feature/getBySlug/:slug
// @access Public
// =============================================================================
export const getFeatureBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return respond(res, 400, false, "Feature slug is required");
    }

    let feature = null;
    if (mongoose.Types.ObjectId.isValid(slug)) {
      feature = await populateFeature(FeatureModel.findById(slug));
    }
    if (!feature) {
      feature = await populateFeature(FeatureModel.findOne({ slug }));
    }

    if (!feature) {
      return respond(res, 404, false, "Feature not found");
    }

    return respond(res, 200, true, "Feature retrieved successfully", feature);
  } catch (error) {
    console.error("Get Feature By Slug Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

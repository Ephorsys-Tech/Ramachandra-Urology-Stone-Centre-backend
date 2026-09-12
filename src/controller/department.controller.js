import mongoose from "mongoose";
import DepartmentModel from "../model/department.model.js";
import DoctorModel from "../model/doctor.model.js";
import FeatureModel from "../model/feature.model.js";
import DiseaseModel from "../model/disease.model.js";
import { io } from "../../server.js";
import { respond } from "../util/respond.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: generate a URL-safe slug from a department name
// ─────────────────────────────────────────────────────────────────────────────
const generateSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: validate an array of ObjectIds against a Mongoose model
// Returns { validIds, invalid } where invalid is an array of bad ID strings
// ─────────────────────────────────────────────────────────────────────────────
const resolveObjectIds = async (ids, Model) => {
  if (!Array.isArray(ids) || ids.length === 0) return { validIds: [], invalid: [] };
  const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  if (invalid.length > 0) return { validIds: [], invalid };
  const found = await Model.find({ _id: { $in: ids } }).select("_id");
  return { validIds: found.map((d) => d._id), invalid: [] };
};

// Helper to deep populate department documents
const populateDepartment = (query) =>
  query
    .populate("doctors",  "name specialization photo photoPublicId experience qualifications isAvailable timing description")
    .populate("features", "name description isActive orderIndex")
    .populate("diseases", "name description isActive orderIndex");

// Helper to auto-sync doctors assigned to department in DoctorModel into DepartmentModel.doctors array
const syncDepartmentDoctors = async (departments) => {
  if (!departments) return;
  const list = Array.isArray(departments) ? departments : [departments];
  for (const dept of list) {
    if (!dept || !dept._id) continue;
    const assignedDoctors = await DoctorModel.find({ department: dept._id }).select("_id");
    const assignedIds = assignedDoctors.map((d) => d._id);
    if (assignedIds.length > 0) {
      await DepartmentModel.findByIdAndUpdate(dept._id, {
        $addToSet: { doctors: { $each: assignedIds } },
      });
    }
  }
};

// =============================================================================
// ADD DEPARTMENT
// POST → /api/v1/department/add
// @access Private (Admin)
// =============================================================================
export const addDepartment = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      content,
      features,   // optional: array of Feature ObjectIds
      doctors,    // optional: array of Doctor ObjectIds
      diseases,   // optional: array of Disease ObjectIds
      schedule,
      emergencyAvailable,
      opdTime,
      published,
      category,
      showInHomePage,
      showInServicesPage,
      orderIndex,
    } = req.body;

    // ── Required field validation ─────────────────────────────────────────────
    if (!name)        return respond(res, 400, false, "Department name is required");
    if (!description) return respond(res, 400, false, "Department description is required");
    if (!content)     return respond(res, 400, false, "Department content is required");

    // ── Uniqueness checks ─────────────────────────────────────────────────────
    const existing = await DepartmentModel.findOne({ name });
    if (existing) return respond(res, 409, false, "Department already exists");

    const finalSlug = slug || generateSlug(name);
    const slugExists = await DepartmentModel.findOne({ slug: finalSlug });
    if (slugExists) return respond(res, 409, false, "A department with this slug already exists");

    // ── Validate ObjectId arrays ──────────────────────────────────────────────
    const { validIds: validDoctorIds, invalid: invalidDoctors } =
      await resolveObjectIds(doctors, DoctorModel);
    if (invalidDoctors.length > 0) {
      return respond(res, 400, false, `Invalid doctor IDs: ${invalidDoctors.join(", ")}`);
    }

    const { validIds: validFeatureIds, invalid: invalidFeatures } =
      await resolveObjectIds(features, FeatureModel);
    if (invalidFeatures.length > 0) {
      return respond(res, 400, false, `Invalid feature IDs: ${invalidFeatures.join(", ")}`);
    }

    const { validIds: validDiseaseIds, invalid: invalidDiseases } =
      await resolveObjectIds(diseases, DiseaseModel);
    if (invalidDiseases.length > 0) {
      return respond(res, 400, false, `Invalid disease IDs: ${invalidDiseases.join(", ")}`);
    }

    // ── Create ────────────────────────────────────────────────────────────────
    const department = await DepartmentModel.create({
      name,
      slug:               finalSlug,
      description,
      content,
      features:           validFeatureIds,
      doctors:            validDoctorIds,
      diseases:           validDiseaseIds,
      schedule:           schedule           || [],
      emergencyAvailable: emergencyAvailable || false,
      opdTime:            opdTime            || "",
      published:          published          || false,
      category:           category           || "General",
      showInHomePage:     showInHomePage     || false,
      showInServicesPage: showInServicesPage || false,
      orderIndex:         orderIndex         || 0,
    });

    const populated = await populateDepartment(DepartmentModel.findById(department._id));

    io.emit("departmentAdded", populated);
    return respond(res, 201, true, "Department created successfully", populated);
  } catch (error) {
    console.error("Add Department Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// UPDATE DEPARTMENT
// PUT → /api/v1/department/update/:id
// @access Private (Admin)
// =============================================================================
export const updateDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid department ID");
    }

    const department = await DepartmentModel.findById(id);
    if (!department) {
      return respond(res, 404, false, "Department not found");
    }

    const {
      name,
      slug,
      description,
      content,
      features,   // array of Feature ObjectIds
      doctors,    // array of Doctor ObjectIds
      diseases,   // array of Disease ObjectIds
      schedule,
      emergencyAvailable,
      opdTime,
      published,
      category,
      showInHomePage,
      showInServicesPage,
      orderIndex,
    } = req.body;

    // ── Check name uniqueness if changing ─────────────────────────────────────
    if (name && name !== department.name) {
      const duplicate = await DepartmentModel.findOne({ name });
      if (duplicate) return respond(res, 409, false, "Another department already exists with this name");
    }

    // ── Check slug uniqueness if changing ─────────────────────────────────────
    const newSlug = slug || (name && name !== department.name ? generateSlug(name) : undefined);
    if (newSlug && newSlug !== department.slug) {
      const slugDuplicate = await DepartmentModel.findOne({ slug: newSlug });
      if (slugDuplicate) return respond(res, 409, false, "Another department already exists with this slug");
      department.slug = newSlug;
    }

    // ── Resolve ObjectId arrays if provided ───────────────────────────────────
    let parsedDoctors   = undefined;
    let parsedFeatures  = undefined;
    let parsedDiseases  = undefined;

    if (doctors !== undefined) {
      const { validIds, invalid } = await resolveObjectIds(doctors, DoctorModel);
      if (invalid.length > 0) return respond(res, 400, false, `Invalid doctor IDs: ${invalid.join(", ")}`);
      parsedDoctors = validIds;
    }

    if (features !== undefined) {
      const { validIds, invalid } = await resolveObjectIds(features, FeatureModel);
      if (invalid.length > 0) return respond(res, 400, false, `Invalid feature IDs: ${invalid.join(", ")}`);
      parsedFeatures = validIds;
    }

    if (diseases !== undefined) {
      const { validIds, invalid } = await resolveObjectIds(diseases, DiseaseModel);
      if (invalid.length > 0) return respond(res, 400, false, `Invalid disease IDs: ${invalid.join(", ")}`);
      parsedDiseases = validIds;
    }

    // ── Apply updates ─────────────────────────────────────────────────────────
    department.name               = name               ?? department.name;
    department.description        = description        ?? department.description;
    department.content            = content            ?? department.content;
    department.features           = parsedFeatures     ?? department.features;
    department.doctors            = parsedDoctors      ?? department.doctors;
    department.diseases           = parsedDiseases     ?? department.diseases;
    department.schedule           = schedule           ?? department.schedule;
    department.emergencyAvailable = emergencyAvailable ?? department.emergencyAvailable;
    department.opdTime            = opdTime            ?? department.opdTime;
    department.published          = published          ?? department.published;
    department.category           = category           ?? department.category;
    department.showInHomePage     = showInHomePage     ?? department.showInHomePage;
    department.showInServicesPage = showInServicesPage ?? department.showInServicesPage;
    department.orderIndex         = orderIndex         ?? department.orderIndex;

    await department.save();

    const populated = await populateDepartment(DepartmentModel.findById(department._id));

    io.emit("departmentUpdated", populated);
    return respond(res, 200, true, "Department updated successfully", populated);
  } catch (error) {
    console.error("Update Department Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// DELETE DEPARTMENT
// DELETE → /api/v1/department/remove/:id
// @access Private (Admin)
// =============================================================================
export const deleteDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid department ID");
    }

    const department = await DepartmentModel.findById(id);
    if (!department) {
      return respond(res, 404, false, "Department not found");
    }

    // Guard: don't delete if doctors are still assigned
    const linkedDoctor = await DoctorModel.exists({ department: id });
    if (linkedDoctor) {
      return respond(res, 409, false, "Department cannot be deleted because doctors are assigned to it");
    }

    // Guard: don't delete if features exist for this department
    const linkedFeature = await FeatureModel.exists({ department: id });
    if (linkedFeature) {
      return respond(res, 409, false, "Department cannot be deleted because features are linked to it. Delete features first.");
    }

    // Guard: don't delete if diseases exist for this department
    const linkedDisease = await DiseaseModel.exists({ department: id });
    if (linkedDisease) {
      return respond(res, 409, false, "Department cannot be deleted because diseases are linked to it. Delete diseases first.");
    }

    await department.deleteOne();
    io.emit("departmentDeleted", { id });

    return respond(res, 200, true, "Department deleted successfully");
  } catch (error) {
    console.error("Delete Department Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET ALL DEPARTMENTS (Admin — all, including unpublished)
// GET → /api/v1/department/getAll
// @access Private (Admin)
// =============================================================================
export const getAllDepartments = async (req, res) => {
  try {
    const rawDepartments = await DepartmentModel.find().select("_id");
    await syncDepartmentDoctors(rawDepartments);

    const departments = await populateDepartment(
      DepartmentModel.find().sort({ orderIndex: 1, createdAt: -1 })
    );

    return respond(res, 200, true, "Departments retrieved successfully", departments);
  } catch (error) {
    console.error("Get All Departments Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET ALL PUBLISHED DEPARTMENTS (Public)
// GET → /api/v1/department/getPublished
// @access Public
// =============================================================================
export const getPublishedDepartments = async (req, res) => {
  try {
    const rawDepartments = await DepartmentModel.find({ published: true }).select("_id");
    await syncDepartmentDoctors(rawDepartments);

    const departments = await DepartmentModel
      .find({ published: true })
      .sort({ orderIndex: 1, createdAt: -1 })
      .populate("doctors",  "name specialization photo photoPublicId experience qualifications isAvailable timing description")
      .populate({
        path:  "features",
        match: { isActive: true },   // only active features for public
        select: "name description orderIndex",
        options: { sort: { orderIndex: 1 } },
      })
      .populate({
        path:  "diseases",
        match: { isActive: true },   // only active diseases for public
        select: "name description orderIndex",
        options: { sort: { orderIndex: 1 } },
      });

    return respond(res, 200, true, "Departments retrieved successfully", departments);
  } catch (error) {
    console.error("Get Published Departments Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET DEPARTMENT BY SLUG (Public)
// GET → /api/v1/department/getBySlug/:slug
// @access Public
// =============================================================================
export const getDepartmentBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) return respond(res, 400, false, "Slug is required");

    const rawDepartment = await DepartmentModel.findOne({ slug }).select("_id");
    if (rawDepartment) {
      await syncDepartmentDoctors(rawDepartment);
    }

    const department = await DepartmentModel
      .findOne({ slug })
      .populate("doctors",  "name specialization photo photoPublicId experience qualifications isAvailable timing description")
      .populate({
        path:  "features",
        match: { isActive: true },
        select: "name description orderIndex",
        options: { sort: { orderIndex: 1 } },
      })
      .populate({
        path:  "diseases",
        match: { isActive: true },
        select: "name description orderIndex",
        options: { sort: { orderIndex: 1 } },
      });

    if (!department) return respond(res, 404, false, "Department not found");

    return respond(res, 200, true, "Department retrieved successfully", department);
  } catch (error) {
    console.error("Get Department By Slug Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET DOCTORS BY DEPARTMENT ID (Public)
// GET → /api/v1/department/getDoctorsByDepartmentId/:id
// @access Public
// =============================================================================
export const getDoctorsByDepartmentId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid department ID");
    }

    const department = await DepartmentModel.findById(id).select("_id name");
    if (!department) {
      return respond(res, 404, false, "Department not found");
    }

    const doctors = await DoctorModel
      .find({ department: id })
      .populate("department", "name slug");

    return respond(res, 200, true, "Doctors retrieved successfully", doctors);
  } catch (error) {
    console.error("Get Doctors by Department ID Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};
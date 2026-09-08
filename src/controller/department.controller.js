import mongoose from "mongoose";
import DepartmentModel from "../model/department.model.js";
import DoctorModel from "../model/doctor.model.js";
import { io } from "../../server.js";
import { respond } from "../util/respond.js";
import cloudinary from "../config/cloudinary.js";

// Helper: generate slug from name
const generateSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

//=======================================================
// Add Department
// POST -> /api/v1/department/add
//=======================================================
export const addDepartment = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      content,
      image,
      icon,
      color,
      features,
      doctors,
      diseases,
      schedule,
      emergencyAvailable,
      opdTime,
      published,
      category,
      showInHomePage,
      showInServicesPage,
      orderIndex,
    } = req.body;

    if (!name) {
      return respond(res, 400, false, "Department name is required");
    }

    if (!description) {
      return respond(res, 400, false, "Department description is required");
    }

    if (!content) {
      return respond(res, 400, false, "Department content is required");
    }

    if (!image) {
      return respond(res, 400, false, "Department image is required");
    }

    // if (!icon) {
    //   return respond(res, 400, false, "Department icon is required");
    // }

    const existing = await DepartmentModel.findOne({ name });
    if (existing) {
      return respond(res, 409, false, "Department already exists");
    }

    const finalSlug = slug || generateSlug(name);

    // Check slug uniqueness
    const slugExists = await DepartmentModel.findOne({ slug: finalSlug });
    if (slugExists) {
      return respond(res, 409, false, "A department with this slug already exists");
    }

    // Handle Image Upload to Cloudinary
    let uploadedImage = image;
    if (image && image.startsWith("data:image")) {
      const uploadRes = await cloudinary.uploader.upload(image, { folder: "hospital/departments" });
      uploadedImage = uploadRes.secure_url;
    }

    // Handle Icon Upload to Cloudinary
    let uploadedIcon = icon;
    if (icon && icon.startsWith("data:image")) {
      const uploadRes = await cloudinary.uploader.upload(icon, { folder: "hospital/departments/icons" });
      uploadedIcon = uploadRes.secure_url;
    }

    // Ensure features is an array of strings
    const parseFeatures = (input) => {
      if (Array.isArray(input)) return input;
      if (typeof input === "string") return input.split(",").map(i => i.trim()).filter(i => i);
      return [];
    };

    // Ensure diseases is an array of objects matching diseaseSchema
    const parseDiseases = (input) => {
      if (Array.isArray(input)) {
        // If it's an array of objects, return as is. If strings, map to objects.
        return input.map(item => {
          if (typeof item === "string") return { name: item, description: "Treatment for " + item };
          return item;
        });
      }
      if (typeof input === "string") {
        return input.split(",").map(i => i.trim()).filter(i => i).map(name => ({
          name,
          description: "Treatment for " + name
        }));
      }
      return [];
    };

    const department = await DepartmentModel.create({
      name,
      slug: finalSlug,
      description,
      content,
      image: uploadedImage,
      icon: uploadedIcon,
      color: color || "",
      features: parseFeatures(features),
      doctors: doctors || [],
      diseases: parseDiseases(diseases),
      schedule: schedule || [],
      emergencyAvailable: emergencyAvailable || false,
      opdTime: opdTime || "",
      published: published || false,
      category: category || "General",
      showInHomePage: showInHomePage || false,
      showInServicesPage: showInServicesPage || false,
      orderIndex: orderIndex || 0,
    });

    io.emit("departmentAdded", department);

    return respond(res, 201, true, "Department created successfully", department);
  } catch (error) {
    console.error("Add Department Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

//=======================================================
// Update Department
// PUT -> /api/v1/department/update/:id
//=======================================================
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
      image,
      icon,
      color,
      features,
      doctors,
      diseases,
      schedule,
      emergencyAvailable,
      opdTime,
      published,
      category,
      showInHomePage,
      showInServicesPage,
      orderIndex,
    } = req.body;

    // Check name uniqueness if changing
    if (name && name !== department.name) {
      const duplicate = await DepartmentModel.findOne({ name });
      if (duplicate) {
        return respond(res, 409, false, "Another department already exists with this name");
      }
    }

    // Check slug uniqueness if changing
    const newSlug = slug || (name && name !== department.name ? generateSlug(name) : undefined);
    if (newSlug && newSlug !== department.slug) {
      const slugDuplicate = await DepartmentModel.findOne({ slug: newSlug });
      if (slugDuplicate) {
        return respond(res, 409, false, "Another department already exists with this slug");
      }
      department.slug = newSlug;
    }

    // Handle Image Upload to Cloudinary
    let uploadedImage = image;
    if (image && image.startsWith("data:image")) {
      const uploadRes = await cloudinary.uploader.upload(image, { folder: "hospital/departments" });
      uploadedImage = uploadRes.secure_url;
    }

    // Handle Icon Upload to Cloudinary
    let uploadedIcon = icon;
    if (icon && icon.startsWith("data:image")) {
      const uploadRes = await cloudinary.uploader.upload(icon, { folder: "hospital/departments/icons" });
      uploadedIcon = uploadRes.secure_url;
    }

    // Ensure features is an array of strings
    const parseFeatures = (input) => {
      if (Array.isArray(input)) return input;
      if (typeof input === "string") return input.split(",").map(i => i.trim()).filter(i => i);
      return undefined;
    };

    // Ensure diseases is an array of objects matching diseaseSchema
    const parseDiseases = (input) => {
      if (Array.isArray(input)) {
        return input.map(item => {
          if (typeof item === "string") return { name: item, description: "Treatment for " + item };
          return item;
        });
      }
      if (typeof input === "string") {
        return input.split(",").map(i => i.trim()).filter(i => i).map(name => ({
          name,
          description: "Treatment for " + name
        }));
      }
      return undefined;
    };

    const parsedFeatures = features !== undefined ? parseFeatures(features) : undefined;
    const parsedDiseases = diseases !== undefined ? parseDiseases(diseases) : undefined;

    // Update all fields
    department.name = name ?? department.name;
    department.description = description ?? department.description;
    department.content = content ?? department.content;
    department.image = uploadedImage ?? department.image;
    department.icon = uploadedIcon ?? department.icon;
    department.color = color ?? department.color;
    department.features = parsedFeatures ?? department.features;
    department.doctors = doctors ?? department.doctors;
    department.diseases = parsedDiseases ?? department.diseases;
    department.schedule = schedule ?? department.schedule;
    department.emergencyAvailable = emergencyAvailable ?? department.emergencyAvailable;
    department.opdTime = opdTime ?? department.opdTime;
    department.published = published ?? department.published;
    department.category = category ?? department.category;
    department.showInHomePage = showInHomePage ?? department.showInHomePage;
    department.showInServicesPage = showInServicesPage ?? department.showInServicesPage;
    department.orderIndex = orderIndex ?? department.orderIndex;

    await department.save();
    io.emit("departmentUpdated", department);

    return respond(res, 200, true, "Department updated successfully", department);
  } catch (error) {
    console.error("Update Department Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

//=======================================================
// Delete Department
// DELETE -> /api/v1/department/remove/:id
//=======================================================
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

    const linkedDoctor = await DoctorModel.exists({ department: id });
    if (linkedDoctor) {
      return respond(
        res,
        409,
        false,
        "Department cannot be deleted because doctors are assigned to it",
      );
    }

    await department.deleteOne();
    io.emit("departmentDeleted", id);

    return respond(res, 200, true, "Department deleted successfully");
  } catch (error) {
    console.error("Delete Department Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

//=======================================================
// Get All Departments
// GET -> /api/v1/department/getAll
//=======================================================
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await DepartmentModel.find().sort({ orderIndex: 1, createdAt: -1 });

    return respond(res, 200, true, "Departments retrieved successfully", departments);
  } catch (error) {
    console.error("Get All Departments Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

//=======================================================
// Get Department By Slug
// GET -> /api/v1/department/getBySlug/:slug
//=======================================================
export const getDepartmentBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return respond(res, 400, false, "Slug is required");
    }

    const department = await DepartmentModel.findOne({ slug });
    if (!department) {
      return respond(res, 404, false, "Department not found");
    }

    return respond(res, 200, true, "Department retrieved successfully", department);
  } catch (error) {
    console.error("Get Department By Slug Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

//=======================================================
// Get Doctors by Department Id
// GET -> /api/v1/department/getDoctorsByDepartmentId/:id
//=======================================================
export const getDoctorsByDepartmentId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid department ID");
    }
    const department = await DepartmentModel.findById(id);
    if (!department) {
      return respond(res, 404, false, "Department not found");
    }
    const doctors = await DoctorModel.find({ department: id }).populate(
      "department",
      "name",
    );

    return respond(res, 200, true, "Doctors retrieved successfully", doctors);
  } catch (error) {
    console.error("Get Doctors by Department ID Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};
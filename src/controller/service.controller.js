import mongoose from "mongoose";
import ServiceModel from "../model/services.model.js";
import validateServiceData from "../util/validateServiceData.js";
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

// Helper to populate linked features
const populateService = (query) =>
  query.populate("features", "name description isActive orderIndex");

// =============================================================================
// GET ALL SERVICES (Admin - fetches all services)
// GET → /api/v1/service/all
// @access Private (Admin)
// =============================================================================
export const getAllServices = async (req, res) => {
  try {
    const services = await populateService(
      ServiceModel.find({}).sort({ orderIndex: 1, createdAt: -1 })
    );
    return respond(res, 200, true, "Services retrieved successfully", services);
  } catch (error) {
    console.error("Get All Services Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET PUBLISHED SERVICES (Public - fetches active/published services only)
// GET → /api/v1/service/getPublished
// @access Public
// =============================================================================
export const getPublishedServices = async (req, res) => {
  try {
    const services = await populateService(
      ServiceModel.find({ published: true }).sort({ orderIndex: 1, createdAt: -1 })
    );
    return respond(res, 200, true, "Published services retrieved successfully", services);
  } catch (error) {
    console.error("Get Published Services Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET SERVICE BY ID
// GET → /api/v1/service/getById/:id
// @access Public
// =============================================================================
export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid service ID");
    }

    const service = await populateService(ServiceModel.findById(id));
    if (!service) {
      return respond(res, 404, false, "Service not found");
    }

    return respond(res, 200, true, "Service retrieved successfully", service);
  } catch (error) {
    console.error("Get Service By ID Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET SERVICE BY SLUG
// GET → /api/v1/service/getBySlug/:slug
// @access Public
// =============================================================================
export const getServiceBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return respond(res, 400, false, "Service slug is required");
    }

    const service = await populateService(ServiceModel.findOne({ slug }));
    if (!service) {
      return respond(res, 404, false, "Service not found");
    }

    return respond(res, 200, true, "Service retrieved successfully", service);
  } catch (error) {
    console.error("Get Service By Slug Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// ADD SERVICE
// POST → /api/v1/service/add
// @access Private (Admin)
// =============================================================================
export const addService = async (req, res) => {
  try {
    const validationError = validateServiceData(req.body);
    if (validationError) {
      return respond(res, 400, false, validationError);
    }

    const {
      name,
      slug,
      shortDescription,
      description,
      image,
      icon,
      procedures,
      conditions,
      technologies,
      symptoms,
      benefits,
      features,
      faqs,
      published,
      showInHomePage,
      orderIndex,
    } = req.body;

    // Generate or clean slug
    let finalSlug = slug ? generateSlug(slug) : generateSlug(name);
    
    // Ensure slug uniqueness
    const existingSlug = await ServiceModel.findOne({ slug: finalSlug });
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Date.now()}`;
    }

    const service = await ServiceModel.create({
      name: name.trim(),
      slug: finalSlug,
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      image: image || "",
      icon: icon || "",
      procedures: Array.isArray(procedures) ? procedures.map((p) => p.trim()).filter(Boolean) : [],
      conditions: Array.isArray(conditions) ? conditions.map((c) => c.trim()).filter(Boolean) : [],
      technologies: Array.isArray(technologies) ? technologies.map((t) => t.trim()).filter(Boolean) : [],
      symptoms: Array.isArray(symptoms) ? symptoms.map((s) => s.trim()).filter(Boolean) : [],
      benefits: Array.isArray(benefits) ? benefits.map((b) => b.trim()).filter(Boolean) : [],
      features: Array.isArray(features) ? features : [],
      faqs: Array.isArray(faqs) ? faqs.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })) : [],
      published: published !== undefined ? Boolean(published) : true,
      showInHomePage: Boolean(showInHomePage),
      orderIndex: Number(orderIndex) || 0,
    });

    const populatedService = await populateService(ServiceModel.findById(service._id));

    if (io) {
      io.emit("serviceCreated", populatedService);
    }

    return respond(res, 201, true, "Service created successfully", populatedService);
  } catch (error) {
    console.error("Add Service Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// UPDATE SERVICE BY ID
// PUT → /api/v1/service/update/:id
// @access Private (Admin)
// =============================================================================
export const updateServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid service ID");
    }

    const validationError = validateServiceData(req.body);
    if (validationError) {
      return respond(res, 400, false, validationError);
    }

    const service = await ServiceModel.findById(id);
    if (!service) {
      return respond(res, 404, false, "Service not found");
    }

    const {
      name,
      slug,
      shortDescription,
      description,
      image,
      icon,
      procedures,
      conditions,
      technologies,
      symptoms,
      benefits,
      features,
      faqs,
      published,
      showInHomePage,
      orderIndex,
    } = req.body;

    let finalSlug = service.slug;
    if (slug || name !== service.name) {
      finalSlug = slug ? generateSlug(slug) : generateSlug(name);
      const existingSlug = await ServiceModel.findOne({
        slug: finalSlug,
        _id: { $ne: id },
      });
      if (existingSlug) {
        finalSlug = `${finalSlug}-${Date.now()}`;
      }
    }

    service.name = name.trim();
    service.slug = finalSlug;
    service.shortDescription = shortDescription.trim();
    service.description = description.trim();
    if (image !== undefined) service.image = image;
    if (icon !== undefined) service.icon = icon;
    if (procedures !== undefined)
      service.procedures = Array.isArray(procedures) ? procedures.map((p) => p.trim()).filter(Boolean) : [];
    if (conditions !== undefined)
      service.conditions = Array.isArray(conditions) ? conditions.map((c) => c.trim()).filter(Boolean) : [];
    if (technologies !== undefined)
      service.technologies = Array.isArray(technologies) ? technologies.map((t) => t.trim()).filter(Boolean) : [];
    if (symptoms !== undefined)
      service.symptoms = Array.isArray(symptoms) ? symptoms.map((s) => s.trim()).filter(Boolean) : [];
    if (benefits !== undefined)
      service.benefits = Array.isArray(benefits) ? benefits.map((b) => b.trim()).filter(Boolean) : [];
    if (features !== undefined) service.features = Array.isArray(features) ? features : [];
    if (faqs !== undefined)
      service.faqs = Array.isArray(faqs) ? faqs.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })) : [];
    if (published !== undefined) service.published = Boolean(published);
    if (showInHomePage !== undefined) service.showInHomePage = Boolean(showInHomePage);
    if (orderIndex !== undefined) service.orderIndex = Number(orderIndex) || 0;

    await service.save();

    const updatedService = await populateService(ServiceModel.findById(id));

    if (io) {
      io.emit("serviceUpdated", updatedService);
    }

    return respond(res, 200, true, "Service updated successfully", updatedService);
  } catch (error) {
    console.error("Update Service Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// DELETE SERVICE BY ID
// DELETE → /api/v1/service/remove/:id
// @access Private (Admin)
// =============================================================================
export const deleteServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid service ID");
    }

    const service = await ServiceModel.findByIdAndDelete(id);
    if (!service) {
      return respond(res, 404, false, "Service not found");
    }

    if (io) {
      io.emit("serviceDeleted", id);
    }

    return respond(res, 200, true, "Service deleted successfully", { deletedId: id });
  } catch (error) {
    console.error("Delete Service Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// TOGGLE SERVICE PUBLISHED STATUS
// PATCH → /api/v1/service/toggle/:id
// @access Private (Admin)
// =============================================================================
export const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid service ID");
    }

    const service = await ServiceModel.findById(id);
    if (!service) {
      return respond(res, 404, false, "Service not found");
    }

    service.published = !service.published;
    await service.save();

    const updatedService = await populateService(ServiceModel.findById(id));

    if (io) {
      io.emit("serviceUpdated", updatedService);
    }

    return respond(res, 200, true, `Service ${service.published ? "published" : "hidden"} successfully`, updatedService);
  } catch (error) {
    console.error("Toggle Service Status Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// =============================================================================
// GET SERVICES BY FEATURE ID (Public)
// GET → /api/v1/service/getByFeature/:featureId
// @access Public
// =============================================================================
export const getServicesByFeature = async (req, res) => {
  try {
    const { featureId } = req.params;
    if (!featureId) {
      return respond(res, 400, false, "Feature ID or slug is required");
    }

    const services = await populateService(
      ServiceModel.find({
        published: true,
        features: featureId,
      }).sort({ orderIndex: 1, createdAt: -1 })
    );

    return respond(res, 200, true, "Services for feature retrieved successfully", services);
  } catch (error) {
    console.error("Get Services By Feature Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

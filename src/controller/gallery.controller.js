
import mongoose from "mongoose";
import Gallery from "../model/gallery.model.js";
import { io } from "../../server.js";
import cloudinary from "../config/cloudinary.js";

// ======================================================
// Helpers for Cloudinary Public ID Extraction & Deletion
// ======================================================

const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  try {
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;

    const pathParts = parts.slice(uploadIndex + 1);
    if (pathParts[0] && /^v\d+$/.test(pathParts[0])) {
      pathParts.shift();
    }
    const fullPath = pathParts.join("/");
    const lastDotIndex = fullPath.lastIndexOf(".");
    return lastDotIndex !== -1 ? fullPath.substring(0, lastDotIndex) : fullPath;
  } catch (err) {
    return null;
  }
};

const deleteImageFromCloudinary = async (publicId, imageUrl) => {
  const pid = publicId || getPublicIdFromUrl(imageUrl);
  if (pid) {
    try {
      await cloudinary.uploader.destroy(pid);
    } catch (err) {
      console.warn("Cloudinary deletion warning for public_id:", pid, err.message);
    }
  }
};

// ======================================================
// Create Gallery
// POST -> /api/v1/gallery/create
// ======================================================

export const createGallery = async (req, res) => {
  try {
    const { title, description } = req.body;

    // ======================================================
    // Validation
    // ======================================================

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    // ======================================================
    // Create Gallery
    // ======================================================

    // Determine image URL and public_id
    let imageUrl = "";
    let imagePublicId = "";

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "hospital/galleries" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = uploadResult.secure_url || "";
      imagePublicId = uploadResult.public_id || "";
    } else if (req.body.image) {
      const uploadResult = await cloudinary.uploader.upload(req.body.image, {
        folder: "hospital/galleries",
      });
      imageUrl = uploadResult.secure_url || "";
      imagePublicId = uploadResult.public_id || "";
    }

    const gallery = await Gallery.create({
      title,
      description,
      image: imageUrl,
      imagePublicId,
    });

    // ======================================================
    // Socket Event
    // ======================================================

    io.emit("gallery:created", {
      success: true,
      data: gallery,
    });

    return res.status(201).json({
      success: true,
      message: "Gallery created successfully",
      data: gallery,
    });
  } catch (error) {
    console.error("Create Gallery Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create gallery",
      error: error.message,
    });
  }
};

// ======================================================
// Get All Galleries
// GET -> /api/v1/gallery
// ======================================================

export const getGalleries = async (req, res) => {
  try {
    // ======================================================
    // Query Params
    // ======================================================

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // ======================================================
    // Search Filter
    // ======================================================

    const filter = {
      title: {
        $regex: search,
        $options: "i",
      },
    };

    // ======================================================
    // Fetch Galleries
    // ======================================================

    const galleries = await Gallery.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Gallery.countDocuments(filter);

    return res.status(200).json({
      success: true,
      count: galleries.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: galleries,
    });
  } catch (error) {
    console.error("Get Galleries Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch galleries",
      error: error.message,
    });
  }
};

// ======================================================
// Get Gallery By ID
// GET -> /api/v1/gallery/:id
// ======================================================

export const getGalleryById = async (req, res) => {
  try {
    const { id } = req.params;

    // ======================================================
    // Validate Mongo ID
    // ======================================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery ID",
      });
    }

    const gallery = await Gallery.findById(id);

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: "Gallery not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: gallery,
    });
  } catch (error) {
    console.error("Get Gallery By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch gallery",
      error: error.message,
    });
  }
};

// ======================================================
// Update Gallery
// PUT -> /api/v1/gallery/update/:id
// ======================================================

export const updateGallery = async (req, res) => {
  try {
    const { id } = req.params;

    // ======================================================
    // Validate Mongo ID
    // ======================================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery ID",
      });
    }

    const { title, description } = req.body;

    // Determine image URL if a new image is provided
    let imageUrl = undefined;
    let imagePublicId = undefined;

    if (req.file || req.body.image) {
      const existingGallery = await Gallery.findById(id);
      if (existingGallery && (existingGallery.imagePublicId || existingGallery.image)) {
        await deleteImageFromCloudinary(existingGallery.imagePublicId, existingGallery.image);
      }

      if (req.file) {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "hospital/galleries" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });
        imageUrl = uploadResult.secure_url || "";
        imagePublicId = uploadResult.public_id || "";
      } else if (req.body.image) {
        const uploadResult = await cloudinary.uploader.upload(req.body.image, {
          folder: "hospital/galleries",
        });
        imageUrl = uploadResult.secure_url || "";
        imagePublicId = uploadResult.public_id || "";
      }
    }

    const updateData = {
      title,
      description,
    };
    if (imageUrl !== undefined) {
      updateData.image = imageUrl;
      updateData.imagePublicId = imagePublicId;
    }

    const updatedGallery = await Gallery.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedGallery) {
      return res.status(404).json({
        success: false,
        message: "Gallery not found",
      });
    }

    // ======================================================
    // Socket Event
    // ======================================================

    io.emit("gallery:updated", {
      success: true,
      data: updatedGallery,
    });

    return res.status(200).json({
      success: true,
      message: "Gallery updated successfully",
      data: updatedGallery,
    });
  } catch (error) {
    console.error("Update Gallery Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update gallery",
      error: error.message,
    });
  }
};

// ======================================================
// Delete Gallery
// DELETE -> /api/v1/gallery/delete/:id
// ======================================================

export const deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;

    // ======================================================
    // Validate Mongo ID
    // ======================================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery ID",
      });
    }

    const gallery = await Gallery.findById(id);

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: "Gallery not found",
      });
    }

    // ======================================================
    // Delete Image From Cloudinary
    // ======================================================

    if (gallery.imagePublicId || gallery.image) {
      await deleteImageFromCloudinary(gallery.imagePublicId, gallery.image);
    }

    // ======================================================
    // Delete Gallery
    // ======================================================

    await Gallery.findByIdAndDelete(id);

    // ======================================================
    // Socket Event
    // ======================================================

    io.emit("gallery:deleted", {
      success: true,
      id,
    });

    return res.status(200).json({
      success: true,
      message: "Gallery deleted successfully",
    });
  } catch (error) {
    console.error("Delete Gallery Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete gallery",
      error: error.message,
    });
  }
};


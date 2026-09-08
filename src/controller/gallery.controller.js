
import mongoose from "mongoose";
import Gallery from "../model/gallery.model.js";
import { io } from "../../server.js";
import cloudinary from "../config/cloudinary.js";

// ======================================================
// Create Gallery
// POST -> /api/v1/gallery/create
// ======================================================

export const createGallery = async (req, res) => {
  try {
    const { title, description, images } = req.body;

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

    // Determine image URL
    let imageUrl = "";
    if (req.file) {
      // If multer provided a file (buffer), upload directly
      imageUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "hospital/galleries" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
    } else if (req.body.image) {
      // If a base64 data URL is sent in the body, upload that directly
      const uploadResult = await cloudinary.uploader.upload(req.body.image, { folder: "hospital/galleries" });
      imageUrl = uploadResult.secure_url || "";
    }

    const gallery = await Gallery.create({
      title,
      description,
      image: imageUrl,
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
    if (req.file) {
      imageUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "hospital/galleries" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
    } else if (req.body.image) {
      const uploadResult = await cloudinary.uploader.upload(req.body.image, { folder: "hospital/galleries" });
      imageUrl = uploadResult.secure_url || "";
    }

    const updateData = {
      title,
      description,
    };
    if (imageUrl !== undefined) {
      updateData.image = imageUrl;
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
    // Delete Images From Cloudinary
    // ======================================================

    if (gallery.images?.length > 0) {
      for (const image of gallery.images) {
        if (image.public_id) {
          await cloudinary.uploader.destroy(image.public_id);
        }
      }
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

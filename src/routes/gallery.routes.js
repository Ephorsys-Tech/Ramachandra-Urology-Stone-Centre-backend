import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import protect from "../middleware/auth.middleware.js";
import {
    createGallery,
    getGalleries,
    getGalleryById,
    updateGallery,
    deleteGallery
} from "../controller/gallery.controller.js";


const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
// Create Gallery
// POST -> /api/v1/gallery/add/

router.post("/add", protect, upload.single("image"), createGallery);

// Get all galleries
// GET -> /api/v1/gallery/get/all/
router.get("/get/all", getGalleries);

// Get a single gallery by ID
// GET -> /api/v1/gallery/get/:id
router.get("/get/:id", getGalleryById);

// Update a gallery by ID
// PUT -> /api/v1/gallery/update/:id
router.put("/update/:id", protect, upload.single("image"), updateGallery);

// Delete a gallery by ID
// DELETE -> /api/v1/gallery/delete/:id
router.delete("/delete/:id", protect, deleteGallery);

export default router;
import express from "express";
import multer from "multer";
import protect from "../middleware/auth.middleware.js";
import {
  createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
} from "../controller/blog.controller.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Create a blog (Admin only)
// POST -> /api/v1/blog/add
router.post("/add", protect, upload.single("image"), createBlog);

// Get all blogs (Public)
// GET -> /api/v1/blog/get/all
router.get("/get/all", getBlogs);

// Get a single blog (Public)
// GET -> /api/v1/blog/get/:id
router.get("/get/:id", getBlogById);

// Update a blog by ID (Admin only)
// PUT -> /api/v1/blog/update/:id
router.put("/update/:id", protect, upload.single("image"), updateBlog);

// Delete a blog by ID (Admin only)
// DELETE -> /api/v1/blog/delete/:id
router.delete("/delete/:id", protect, deleteBlog);

export default router;

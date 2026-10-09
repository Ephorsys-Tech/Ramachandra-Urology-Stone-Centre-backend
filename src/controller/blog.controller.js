import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html";
import Blog from "../model/blog.model.js";
import DoctorModel from "../model/doctor.model.js";
import cloudinary from "../config/cloudinary.js";

// Helper to sanitize rich-text HTML content from TipTap
const sanitizeBlogContent = (dirtyHtml) => {
  if (!dirtyHtml) return "";
  return sanitizeHtml(dirtyHtml, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "strong", "b", "em", "i", "u", "s", "strike",
      "blockquote", "ul", "ol", "li",
      "a", "img", "hr", "br",
      "pre", "code", "span", "div",
      "table", "thead", "tbody", "tr", "th", "td"
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
      span: ["style", "class"],
      p: ["style", "class"],
      h1: ["style", "class"],
      h2: ["style", "class"],
      h3: ["style", "class"],
      h4: ["style", "class"],
      div: ["style", "class"],
      code: ["class"],
      pre: ["class"]
    },
    allowedSchemes: ["http", "https", "mailto", "tel", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"]
    },
    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
        "font-size": [/^\d+(?:px|em|rem|%)$/],
        "font-weight": [/^\d+$/, /^bold$/, /^normal$/]
      }
    }
  });
};

// Helper to generate a clean URL slug
const generateSlug = (title) => {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Helper to upload image to Cloudinary
const uploadToCloudinary = async (file, bodyImage) => {
  if (file) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "hospital/blogs" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      stream.end(file.buffer);
    });
  } else if (bodyImage) {
    const uploadResult = await cloudinary.uploader.upload(bodyImage, {
      folder: "hospital/blogs",
    });
    return uploadResult.secure_url || "";
  }
  return "";
};

// ======================================================
// Create Blog
// POST -> /api/v1/blog/add
// ======================================================
export const createBlog = async (req, res) => {
  try {
    const { title, content, description, category, readTime, authorType, doctorAuthor, authorName } = req.body;

    if (!title || !content || !description) {
      return res.status(400).json({
        success: false,
        message: "Title, content, and description/excerpt are required",
      });
    }

    let imageUrl = await uploadToCloudinary(req.file, req.body.image);
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Blog image is required",
      });
    }

    let finalAuthorName = authorName || "Admin";
    let finalDoctorAuthor = null;

    if (authorType === "Doctor" && doctorAuthor) {
      const doctor = await DoctorModel.findById(doctorAuthor);
      if (doctor) {
        finalDoctorAuthor = doctor._id;
        finalAuthorName = `Dr. ${doctor.name}`;
      }
    }

    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const sanitizedHtml = sanitizeBlogContent(content);
    let baseSlug = generateSlug(title);
    const existingWithSlug = await Blog.findOne({ slug: baseSlug });
    if (existingWithSlug) {
      baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const blog = await Blog.create({
      title,
      slug: baseSlug,
      content: sanitizedHtml,
      description,
      image: imageUrl,
      category: category || "General",
      readTime: readTime || "5 min read",
      authorType: authorType || "Admin",
      doctorAuthor: finalDoctorAuthor,
      authorName: finalAuthorName,
      date: todayStr,
    });

    return res.status(201).json({
      success: true,
      message: "Blog post published successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Create Blog Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create blog",
      error: error.message,
    });
  }
};

// ======================================================
// Get All Blogs
// GET -> /api/v1/blog/get/all
// ======================================================
export const getBlogs = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";
    const category = req.query.category || "";

    const skip = (page - 1) * limit;

    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { authorName: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    const blogs = await Blog.find(filter)
      .populate("doctorAuthor", "name photo specialization qualifications description experience languages timing email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(filter);

    // Get global category counts
    const categoryCountsRaw = await Blog.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const categoryCounts = { All: await Blog.countDocuments() };
    categoryCountsRaw.forEach(item => {
      if (item._id) {
        categoryCounts[item._id] = item.count;
      }
    });

    return res.status(200).json({
      success: true,
      count: blogs.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      categoryCounts,
      data: blogs,
    });
  } catch (error) {
    console.error("Get Blogs Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs",
      error: error.message,
    });
  }
};

// ======================================================
// Get Blog By ID or Slug
// GET -> /api/v1/blog/get/:id (or :slug)
// ======================================================
export const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    let blog = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      blog = await Blog.findById(id).populate("doctorAuthor", "name photo specialization qualifications description experience languages timing email");
    }
    
    // If not found by ObjectId or if param is a slug, search by slug
    if (!blog) {
      blog = await Blog.findOne({ slug: id }).populate("doctorAuthor", "name photo specialization qualifications description experience languages timing email");
    }

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Get Blog By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog",
      error: error.message,
    });
  }
};

// ======================================================
// Update Blog
// PUT -> /api/v1/blog/update/:id
// ======================================================
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID",
      });
    }

    const { title, content, description, category, readTime, authorType, doctorAuthor, authorName } = req.body;

    let imageUrl = undefined;
    if (req.file || req.body.image) {
      imageUrl = await uploadToCloudinary(req.file, req.body.image);
    }

    let finalAuthorName = authorName;
    let finalDoctorAuthor = undefined;

    if (authorType === "Doctor" && doctorAuthor) {
      const doctor = await DoctorModel.findById(doctorAuthor);
      if (doctor) {
        finalDoctorAuthor = doctor._id;
        finalAuthorName = `Dr. ${doctor.name}`;
      }
    } else if (authorType === "Admin") {
      finalDoctorAuthor = null;
      finalAuthorName = authorName || "Admin";
    }

    const updateData = {};
    if (title) {
      updateData.title = title;
      const newSlug = generateSlug(title);
      const existingSlug = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
      updateData.slug = existingSlug ? `${newSlug}-${Date.now().toString().slice(-4)}` : newSlug;
    }
    if (content) updateData.content = sanitizeBlogContent(content);
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (readTime) updateData.readTime = readTime;
    if (authorType) updateData.authorType = authorType;
    if (finalDoctorAuthor !== undefined) updateData.doctorAuthor = finalDoctorAuthor;
    if (finalAuthorName !== undefined) updateData.authorName = finalAuthorName;
    if (imageUrl) updateData.image = imageUrl;

    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("doctorAuthor", "name photo specialization qualifications description experience languages timing email");

    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    console.error("Update Blog Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update blog",
      error: error.message,
    });
  }
};

// ======================================================
// Delete Blog
// DELETE -> /api/v1/blog/delete/:id
// ======================================================
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID",
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Try to delete image from Cloudinary if possible (extract public ID from URL)
    try {
      if (blog.image) {
        // e.g. https://res.cloudinary.com/demo/image/upload/v1576091160/hospital/blogs/abc.jpg
        const parts = blog.image.split("/");
        const folderIndex = parts.indexOf("hospital");
        if (folderIndex !== -1) {
          const publicIdWithExtension = parts.slice(folderIndex).join("/");
          const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf("."));
          await cloudinary.uploader.destroy(publicId);
        }
      }
    } catch (e) {
      console.warn("Failed to delete Cloudinary image on blog delete:", e.message);
    }

    await Blog.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Blog post deleted successfully",
    });
  } catch (error) {
    console.error("Delete Blog Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete blog",
      error: error.message,
    });
  }
};

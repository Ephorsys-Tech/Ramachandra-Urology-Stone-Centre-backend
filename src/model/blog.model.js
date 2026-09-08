import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Blog description/excerpt is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Blog image is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Blog category is required"],
      trim: true,
      default: "General",
    },
    readTime: {
      type: String,
      trim: true,
      default: "5 min read",
    },
    authorType: {
      type: String,
      enum: ["Admin", "Doctor"],
      default: "Admin",
    },
    doctorAuthor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    authorName: {
      type: String,
      default: "Admin",
    },
    date: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;

import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Gallery title is required"],
        trim: true,
        minlength: [3, "Title must be at least 3 characters"],
        maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {  
        type: String,
        trim: true,
        maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image:{
        type: String,
        required: [true, "Image is required"],
    }
}, 
{
    timestamps: true,
});

const Gallery = mongoose.model("Gallery", gallerySchema);
export default Gallery;
import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: true,
            trim: true,
        },
        answer: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { _id: false }
);

const serviceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        shortDescription: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        image: {
            type: String,
            default: "",
        },

        icon: {
            type: String,
            default: "",
        },

        procedures: [
            {
                type: String,
                trim: true,
            },
        ],

        conditions: [
            {
                type: String,
                trim: true,
            },
        ],

        technologies: [
            {
                type: String,
                trim: true,
            },
        ],

        symptoms: [
            {
                type: String,
                trim: true,
            },
        ],

        benefits: [
            {
                type: String,
                trim: true,
            },
        ],
        features: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Feature",
            },
        ],

        faqs: [faqSchema],

        published: {
            type: Boolean,
            default: true,
        },

        showInHomePage: {
            type: Boolean,
            default: false,
        },

        orderIndex: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Service", serviceSchema);
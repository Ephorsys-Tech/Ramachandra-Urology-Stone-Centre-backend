import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    hospitalName: {
      type: String,
      default: "Ramachandra Urology & Stone Centre",
      trim: true,
    },
    tagline: {
      type: String,
      default: "Centre for Advanced Kidney Care & Laparoscopic Surgeries",
      trim: true,
    },
    logo: {
      type: String,
      default: "",
    },
    emergencyPhone: {
      type: String,
      default: "9937566625",
      trim: true,
    },
    contactEmail: {
      type: String,
      default: "ruasc.burla@gmail.com",
      trim: true,
    },
    address: {
      type: String,
      default: "123 Healthcare Ave, Clinic City",
      trim: true,
    },
    socialLinks: {
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      instagram: { type: String, default: "" },
      linkedin: { type: String, default: "" },
    },
    announcementBanner: {
      text: { type: String, default: "" },
      isActive: { type: Boolean, default: false },
    },
    popupBanner: {
      image: { type: String, default: "" },
      description: { type: String, default: "" },
      isPublished: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

const SettingModel = mongoose.model("Setting", settingSchema);
export default SettingModel;

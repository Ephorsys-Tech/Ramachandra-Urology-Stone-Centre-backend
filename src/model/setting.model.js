import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    hospitalName: {
      type: String,
      default: "Usthi Hospital",
      trim: true,
    },
    tagline: {
      type: String,
      default: "Caring for life",
      trim: true,
    },
    logo: {
      type: String,
      default: "",
    },
    emergencyPhone: {
      type: String,
      default: "9090963722",
      trim: true,
    },
    contactEmail: {
      type: String,
      default: "info@usthihospital.com",
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

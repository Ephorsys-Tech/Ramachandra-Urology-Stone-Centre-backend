import SettingModel from "../model/setting.model.js";
import { respond } from "../util/respond.js";
import cloudinary from "../config/cloudinary.js";

// ======================================================
// Get Settings
// GET -> /api/v1/setting
// ======================================================
export const getSettings = async (req, res) => {
  try {
    let settings = await SettingModel.findOne();
    if (!settings) {
      settings = await SettingModel.create({});
    }
    return respond(res, 200, true, "Settings retrieved successfully", settings);
  } catch (error) {
    console.error("Get Settings Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// ======================================================
// Update Settings
// PUT -> /api/v1/setting
// ======================================================
export const updateSettings = async (req, res) => {
  try {
    let settings = await SettingModel.findOne();
    if (!settings) {
      settings = await SettingModel.create({});
    }

    const {
      hospitalName,
      tagline,
      logo,
      emergencyPhone,
      contactEmail,
      address,
      socialLinks,
      announcementBanner,
    } = req.body;

    // Handle Logo Upload to Cloudinary if it's base64 data uri
    let uploadedLogo = logo;
    if (logo && logo.startsWith("data:image")) {
      try {
        const uploadRes = await cloudinary.uploader.upload(logo, {
          folder: "hospital/settings",
          resource_type: "image",
        });
        uploadedLogo = uploadRes.secure_url;
      } catch (uploadErr) {
        console.error("Cloudinary upload error:", uploadErr);
        return respond(res, 400, false, "Failed to upload logo image");
      }
    }

    settings.hospitalName = hospitalName !== undefined ? hospitalName : settings.hospitalName;
    settings.tagline = tagline !== undefined ? tagline : settings.tagline;
    settings.logo = uploadedLogo !== undefined ? uploadedLogo : settings.logo;
    settings.emergencyPhone = emergencyPhone !== undefined ? emergencyPhone : settings.emergencyPhone;
    settings.contactEmail = contactEmail !== undefined ? contactEmail : settings.contactEmail;
    settings.address = address !== undefined ? address : settings.address;

    if (socialLinks) {
      settings.socialLinks = {
        facebook: socialLinks.facebook !== undefined ? socialLinks.facebook : settings.socialLinks.facebook,
        twitter: socialLinks.twitter !== undefined ? socialLinks.twitter : settings.socialLinks.twitter,
        instagram: socialLinks.instagram !== undefined ? socialLinks.instagram : settings.socialLinks.instagram,
        linkedin: socialLinks.linkedin !== undefined ? socialLinks.linkedin : settings.socialLinks.linkedin,
      };
    }

    if (announcementBanner) {
      settings.announcementBanner = {
        text: announcementBanner.text !== undefined ? announcementBanner.text : settings.announcementBanner.text,
        isActive: typeof announcementBanner.isActive === "boolean" ? announcementBanner.isActive : settings.announcementBanner.isActive,
      };
    }

    const { popupBanner } = req.body;
    if (popupBanner) {
      let uploadedPopupImage = settings.popupBanner?.image || "";
      if (popupBanner.image && popupBanner.image.startsWith("data:image")) {
        try {
          const uploadRes = await cloudinary.uploader.upload(popupBanner.image, {
            folder: "hospital/settings",
            resource_type: "image",
          });
          uploadedPopupImage = uploadRes.secure_url;
        } catch (uploadErr) {
          console.error("Cloudinary upload error:", uploadErr);
          return respond(res, 400, false, "Failed to upload popup banner image");
        }
      }

      settings.popupBanner = {
        image: popupBanner.image && !popupBanner.image.startsWith("data:image") ? popupBanner.image : uploadedPopupImage,
        description: popupBanner.description !== undefined ? popupBanner.description : settings.popupBanner?.description,
        isPublished: typeof popupBanner.isPublished === "boolean" ? popupBanner.isPublished : settings.popupBanner?.isPublished,
      };
    }

    await settings.save();

    return respond(res, 200, true, "Settings updated successfully", settings);
  } catch (error) {
    console.error("Update Settings Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

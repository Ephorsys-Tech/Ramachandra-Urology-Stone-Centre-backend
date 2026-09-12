import mongoose from "mongoose";

import DoctorModel from "../model/doctor.model.js";
import DepartmentModel from "../model/department.model.js";
import { io } from "../../server.js";
import {
  uploadToCloudinaryDetails,
  uploadFileToCloudinaryDetails,
  deleteFromCloudinary,
  FOLDERS,
} from "../util/uploadToCloudinary.js";

import { respond } from "../util/respond.js";

import sanitizeDoctorData from "../util/sanitizeDoctorData.js";

import validateDoctorData from "../util/validateDoctorData.js";

const doctorPopulation = [
  {
    path: "department",
    select: "name slug description image icon",
  },
];

const populateDoctors = (query) => query.populate(doctorPopulation);

// Helper to extract uploaded file from req.file or req.files
const getUploadedFile = (req) => {
  if (req.file) return req.file;
  if (Array.isArray(req.files) && req.files.length > 0) {
    return req.files[0];
  }
  if (req.files && typeof req.files === "object") {
    if (req.files.photo?.[0]) return req.files.photo[0];
    if (req.files.image?.[0]) return req.files.image[0];
    if (req.files.file?.[0]) return req.files.file[0];
  }
  return null;
};

// ======================================================
// Add Doctor
// POST -> /api/v1/doctor/add
// ======================================================

export const addDoctor = async (req, res) => {
  try {
    // ==================================================
    // Sanitize Data
    // ==================================================

    const sanitizedData = sanitizeDoctorData(req.body);

    // ==================================================
    // Validate Data
    // ==================================================

    const validationError = validateDoctorData(sanitizedData);

    if (validationError) {
      return respond(res, 400, false, validationError);
    }

    const department = await DepartmentModel.findById(
      sanitizedData.department,
    );

    if (!department) {
      return respond(res, 400, false, "Department not found");
    }

    // ==================================================
    // Photo Upload to Cloudinary
    // ==================================================
    const uploadedFile = getUploadedFile(req);
    console.log("Add Doctor Uploaded File Check:", {
      hasFile: !!req.file,
      filesCount: Array.isArray(req.files) ? req.files.length : req.files ? Object.keys(req.files).length : 0,
      detectedUploadedFile: uploadedFile ? { originalname: uploadedFile.originalname, mimetype: uploadedFile.mimetype, size: uploadedFile.size } : null,
      bodyPhoto: sanitizedData.photo ? `${sanitizedData.photo.substring(0, 30)}...` : undefined,
    });

    let photoDetails = null;
    try {
      if (uploadedFile) {
        photoDetails = await uploadFileToCloudinaryDetails(uploadedFile, FOLDERS.DOCTOR);
      } else if (sanitizedData.photo) {
        photoDetails = await uploadToCloudinaryDetails(sanitizedData.photo, FOLDERS.DOCTOR);
      } else {
        return respond(
          res,
          400,
          false,
          "Doctor photo is required. Please click on the photo field in Postman/Frontend to re-select your image file and send it."
        );
      }
    } catch (uploadErr) {
      console.error("Cloudinary upload error:", uploadErr);
      const errMsg = uploadErr?.message || (typeof uploadErr === "string" ? uploadErr : "Cloudinary image upload failed");
      return respond(res, 400, false, errMsg);
    }

    if (!photoDetails || !photoDetails.url) {
      return respond(res, 400, false, "Failed to generate Cloudinary photo URL for doctor");
    }

    const doctor = await DoctorModel.create({
      ...sanitizedData,
      photo: photoDetails.url,
      photoPublicId: photoDetails.public_id || "",
      isAvailable:
        typeof sanitizedData.isAvailable === "boolean"
          ? sanitizedData.isAvailable
          : true,
    });

    // Synchronize doctor into Department schema doctors array directly
    await DepartmentModel.findByIdAndUpdate(sanitizedData.department, {
      $addToSet: { doctors: doctor._id },
    });

    const populatedDoctor = await populateDoctors(
      DoctorModel.findById(doctor._id),
    );
    io.emit("doctorAdded", populatedDoctor);

    return respond(res, 201, true, "Doctor added successfully", populatedDoctor);
  } catch (error) {
    console.error("Add Doctor Error:", error);

    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// ======================================================
// Update Doctor By ID
// PUT -> /api/v1/doctor/update/:id
// ======================================================

export const updateDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    // ==================================================
    // Validate ObjectId
    // ==================================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid doctor ID");
    }

    const existingDoctor = await DoctorModel.findById(id);

    if (!existingDoctor) {
      return respond(res, 404, false, "Doctor not found");
    }

    // ==================================================
    // Sanitize Data
    // ==================================================

    const sanitizedData = sanitizeDoctorData(req.body);

    if (sanitizedData.department) {
      const department = await DepartmentModel.findById(
        sanitizedData.department,
      );

      if (!department) {
        return respond(res, 400, false, "Department not found");
      }
    }

    // ==================================================
    // Photo Upload to Cloudinary (if new photo provided)
    // ==================================================
    const uploadedFile = getUploadedFile(req);
    let photoDetails = null;
    try {
      if (uploadedFile) {
        photoDetails = await uploadFileToCloudinaryDetails(uploadedFile, FOLDERS.DOCTOR);
      } else if (sanitizedData.photo && sanitizedData.photo !== existingDoctor.photo) {
        photoDetails = await uploadToCloudinaryDetails(sanitizedData.photo, FOLDERS.DOCTOR);
      }
    } catch (uploadErr) {
      console.error("Cloudinary upload error:", uploadErr);
      const errMsg = uploadErr?.message || (typeof uploadErr === "string" ? uploadErr : "Cloudinary image upload failed");
      return respond(res, 400, false, errMsg);
    }

    if (photoDetails) {
      // Delete old photo from Cloudinary if public_id exists
      if (existingDoctor.photoPublicId && photoDetails.public_id !== existingDoctor.photoPublicId) {
        await deleteFromCloudinary(existingDoctor.photoPublicId);
      }
      sanitizedData.photo = photoDetails.url;
      sanitizedData.photoPublicId = photoDetails.public_id;
    }

    // Synchronize department changes if doctor moves to a new department
    if (
      sanitizedData.department &&
      sanitizedData.department.toString() !== existingDoctor.department?.toString()
    ) {
      if (existingDoctor.department) {
        await DepartmentModel.findByIdAndUpdate(existingDoctor.department, {
          $pull: { doctors: id },
        });
      }
      await DepartmentModel.findByIdAndUpdate(sanitizedData.department, {
        $addToSet: { doctors: id },
      });
    }

    const updatedDoctor = await populateDoctors(
      DoctorModel.findByIdAndUpdate(id, sanitizedData, {
        returnDocument: "after",
        runValidators: true,
      }),
    );
    io.emit("doctorUpdated", updatedDoctor);

    return respond(
      res,
      200,
      true,
      "Doctor updated successfully",
      updatedDoctor,
    );
  } catch (error) {
    console.error("Update Doctor Error:", error);

    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// ======================================================
// Delete Doctor By ID
// DELETE -> /api/v1/doctor/remove/:id
// ======================================================

export const deleteDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    // ==================================================
    // Validate ObjectId
    // ==================================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid doctor ID");
    }

    const doctor = await DoctorModel.findById(id);

    if (!doctor) {
      return respond(res, 404, false, "Doctor not found");
    }

    // Delete doctor image from Cloudinary if photoPublicId exists
    if (doctor.photoPublicId) {
      await deleteFromCloudinary(doctor.photoPublicId);
    }

    // Remove doctor ID from Department schema doctors array
    if (doctor.department) {
      await DepartmentModel.findByIdAndUpdate(doctor.department, {
        $pull: { doctors: id },
      });
    }

    await doctor.deleteOne();

    return respond(res, 200, true, "Doctor deleted successfully");
  } catch (error) {
    console.error("Delete Doctor Error:", error);

    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// ======================================================
// Get All Doctors
// GET -> /api/v1/doctor/getAll
// ======================================================

export const getAllDoctors = async (req, res) => {
  try {
    // Pagination: page and limit via query params
    const { page: pageQuery, limit: limitQuery } = req.query || {};

    const page = Math.max(1, parseInt(pageQuery, 10) || 1);
    let limit = parseInt(limitQuery, 10) || 10;
    // cap limit to prevent expensive requests
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    const total = await DoctorModel.countDocuments();

    const doctors = await populateDoctors(
      DoctorModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    );

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return respond(
      res,
      200,
      true,
      "Doctors fetched successfully",
      {
        doctors,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    );
  } catch (error) {
    console.error("Get All Doctors Error:", error);

    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// ======================================================
// Get Doctor By ID
// GET -> /api/v1/doctor/getById/:id
// ======================================================

export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    // ==================================================
    // Validate ObjectId
    // ==================================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid doctor ID");
    }

    const doctor = await populateDoctors(
      DoctorModel.findById(id),
    );

    if (!doctor) {
      return respond(res, 404, false, "Doctor not found");
    }

    return respond(res, 200, true, "Doctor fetched successfully", doctor);
  } catch (error) {
    console.error("Get Doctor By ID Error:", error);

    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

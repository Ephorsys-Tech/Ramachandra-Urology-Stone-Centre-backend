import mongoose from "mongoose";

import DoctorModel from "../model/doctor.model.js";
import DepartmentModel from "../model/department.model.js";
import { io } from "../../server.js";
import { uploadToCloudinary, uploadFileToCloudinary, FOLDERS } from "../util/uploadToCloudinary.js";

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
    let photoUrl;
    try {
      if (req.file) {
        // multer memory upload (multipart/form-data)
        photoUrl = await uploadFileToCloudinary(req.file, FOLDERS.DOCTOR);
      } else if (sanitizedData.photo) {
        // base64 data URI sent in JSON body
        photoUrl = await uploadToCloudinary(sanitizedData.photo, FOLDERS.DOCTOR);
      }
    } catch (uploadErr) {
      console.error("Cloudinary upload error:", uploadErr);
      return respond(res, 400, false, uploadErr.message);
    }


    const doctor = await DoctorModel.create({
      ...sanitizedData,
      ...(photoUrl ? { photo: photoUrl } : {}),
      isAvailable:
        typeof sanitizedData.isAvailable === "boolean"
          ? sanitizedData.isAvailable
          : true,
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
    try {
      if (req.file) {
        sanitizedData.photo = await uploadFileToCloudinary(req.file, FOLDERS.DOCTOR);
      } else if (sanitizedData.photo) {
        sanitizedData.photo = await uploadToCloudinary(sanitizedData.photo, FOLDERS.DOCTOR);
      }
    } catch (uploadErr) {
      console.error("Cloudinary upload error:", uploadErr);
      return respond(res, 400, false, uploadErr.message);
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

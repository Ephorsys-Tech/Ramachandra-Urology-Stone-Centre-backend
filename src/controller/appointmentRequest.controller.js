import mongoose from "mongoose";
import AppointmentRequestModel from "../model/appointmentRequest.model.js";
import { io } from "../../server.js";
import { respond } from "../util/respond.js";

// ======================================================
// Submit Appointment Request (Public — no auth)
// POST -> /api/v1/appointment-request/submit
// ======================================================
export const submitAppointmentRequest = async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      phone,
      email,
      department,
      preferredDate,
      preferredTimeSlot,
      message,
    } = req.body;

    // Basic validation
    if (!name || !age || !gender || !phone) {
      return respond(res, 400, false, "Name, age, gender, and phone are required");
    }

    if (name.trim().length < 3) {
      return respond(res, 400, false, "Name must be at least 3 characters");
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return respond(res, 400, false, "Phone number must be exactly 10 digits");
    }

    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      return respond(res, 400, false, "Age must be between 0 and 150");
    }

    const allowedGenders = ["Male", "Female", "Other"];
    if (!allowedGenders.includes(gender)) {
      return respond(res, 400, false, "Gender must be Male, Female, or Other");
    }

    const request = await AppointmentRequestModel.create({
      name: name.trim(),
      age: ageNum,
      gender,
      phone: phone.trim(),
      email: email?.trim().toLowerCase() || undefined,
      department: department?.trim() || undefined,
      preferredDate: preferredDate ? new Date(preferredDate) : undefined,
      preferredTimeSlot: preferredTimeSlot?.trim() || undefined,
      message: message?.trim() || undefined,
    });

    io.emit("appointmentRequestAdded", request);

    return respond(res, 201, true, "Appointment request submitted successfully", request);
  } catch (error) {
    console.error("Submit Appointment Request Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// ======================================================
// Get All Appointment Requests (Admin — protected)
// GET -> /api/v1/appointment-request/getAll
// ======================================================
export const getAllAppointmentRequests = async (req, res) => {
  try {
    const requests = await AppointmentRequestModel.find().sort({ createdAt: -1 });

    return respond(res, 200, true, "Appointment requests retrieved successfully", requests);
  } catch (error) {
    console.error("Get All Appointment Requests Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// ======================================================
// Update Appointment Request Status (Admin — protected)
// PUT -> /api/v1/appointment-request/update/:id
// ======================================================
export const updateAppointmentRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid request ID");
    }

    const request = await AppointmentRequestModel.findById(id);
    if (!request) {
      return respond(res, 404, false, "Appointment request not found");
    }

    const { status, adminNotes, appointmentDate, appointmentTime } = req.body;

    if (status) {
      const allowedStatuses = ["Pending", "Accepted", "Rejected"];
      if (!allowedStatuses.includes(status)) {
        return respond(res, 400, false, "Status must be Pending, Accepted, or Rejected");
      }
      request.status = status;
    }

    request.adminNotes = adminNotes ?? request.adminNotes;
    request.appointmentDate = appointmentDate ? new Date(appointmentDate) : request.appointmentDate;
    request.appointmentTime = appointmentTime ?? request.appointmentTime;

    await request.save();
    io.emit("appointmentRequestUpdated", request);

    return respond(res, 200, true, "Appointment request updated successfully", request);
  } catch (error) {
    console.error("Update Appointment Request Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// ======================================================
// Delete Appointment Request (Admin — protected)
// DELETE -> /api/v1/appointment-request/remove/:id
// ======================================================
export const deleteAppointmentRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid request ID");
    }

    const request = await AppointmentRequestModel.findById(id);
    if (!request) {
      return respond(res, 404, false, "Appointment request not found");
    }

    await request.deleteOne();
    io.emit("appointmentRequestDeleted", id);

    return respond(res, 200, true, "Appointment request deleted successfully");
  } catch (error) {
    console.error("Delete Appointment Request Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

// ======================================================
// Delete All Rejected Appointment Requests (Admin — protected)
// DELETE -> /api/v1/appointment-request/remove-rejected
// ======================================================
export const deleteRejectedAppointmentRequests = async (req, res) => {
  try {
    const result = await AppointmentRequestModel.deleteMany({ status: "Rejected" });
    
    // Emit real-time event for bulk deletion
    io.emit("appointmentRequestsBulkDeleted", { status: "Rejected" });

    return respond(
      res,
      200,
      true,
      `${result.deletedCount} rejected appointment requests deleted successfully`,
      { deletedCount: result.deletedCount }
    );
  } catch (error) {
    console.error("Delete Rejected Appointment Requests Error:", error);
    return respond(res, 500, false, error.message || "Internal Server Error");
  }
};

import mongoose from "mongoose";
import Message from "../model/message.model.js";
import { io } from "../../server.js";
import { respond } from "../util/respond.js";
import sendEmail from "../util/sendEmail.js";

// ======================================================
// Send Message (Public contact form)
// POST -> /api/v1/message/send
// ======================================================
export const sendMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // ─── Required Fields Check ───────────────────────────────────────────────
    if (!name || !email || !phone || !message) {
      return respond(res, 400, false, "Name, email, phone, and message are required");
    }

    // ─── Name Validation (no numbers allowed) ────────────────────────────────
    const nameRegex = /^[a-zA-Z\s.'-]+$/;
    if (!nameRegex.test(name.trim())) {
      return respond(res, 400, false, "Name must not contain numbers or special characters");
    }
    if (name.trim().length < 2 || name.trim().length > 50) {
      return respond(res, 400, false, "Name must be between 2 and 50 characters");
    }

    // ─── Email Validation ────────────────────────────────────────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return respond(res, 400, false, "Please provide a valid email address");
    }

    // ─── Phone Validation ────────────────────────────────────────────────────
    const phoneTrimmed = phone.trim();
    const phoneRegex = /^[6-9][0-9]{9}$/;
    if (/[a-zA-Z]/.test(phoneTrimmed)) {
      return respond(res, 400, false, "Phone number must not contain alphabets");
    }
    if (!/^\d+$/.test(phoneTrimmed)) {
      return respond(res, 400, false, "Phone number must contain digits only");
    }
    if (phoneTrimmed.length !== 10) {
      return respond(res, 400, false, "Phone number must be exactly 10 digits");
    }
    if (!phoneRegex.test(phoneTrimmed)) {
      return respond(res, 400, false, "Phone number must start with 6, 7, 8, or 9");
    }

    // ─── Message Validation ──────────────────────────────────────────────────
    const messageTrimmed = message.trim();
    if (messageTrimmed.length < 10) {
      return respond(res, 400, false, "Message must be at least 10 characters long");
    }
    if (messageTrimmed.length > 1000) {
      return respond(res, 400, false, "Message must not exceed 1000 characters");
    }

    // ─── Subject Validation (optional field) ─────────────────────────────────
    const subjectTrimmed = subject ? subject.trim() : "General Inquiry";
    if (subject && subjectTrimmed.length > 100) {
      return respond(res, 400, false, "Subject must not exceed 100 characters");
    }

    // ─── Save to DB ───────────────────────────────────────────────────────────
    const newMessage = await Message.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phoneTrimmed,
      subject: subjectTrimmed,
      message: messageTrimmed,
    });

    // ─── Emit Socket.io Event ─────────────────────────────────────────────────
    io.emit("messageAdded", newMessage);

    return respond(res, 201, true, "Message sent successfully", newMessage);
  } catch (error) {
    console.error("Send Message Error:", error);
    return respond(res, 500, false, error.message || "Failed to send message");
  }
};
// ======================================================
// Get All Messages (Admin only)
// GET -> /api/v1/message/all
// ======================================================
export const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    return respond(res, 200, true, "Messages fetched successfully", messages);
  } catch (error) {
    console.error("Get All Messages Error:", error);
    return respond(res, 500, false, error.message || "Failed to fetch messages");
  }
};

// ======================================================
// Delete Message (Admin only)
// DELETE -> /api/v1/message/delete/:id
// ======================================================
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respond(res, 400, false, "Invalid message ID");
    }

    const deleted = await Message.findByIdAndDelete(id);

    if (!deleted) {
      return respond(res, 404, false, "Message not found");
    }

    // Emit live Socket.io event to connected admins
    io.emit("messageDeleted", id);

    return respond(res, 200, true, "Message deleted successfully", { deletedId: id });
  } catch (error) {
    console.error("Delete Message Error:", error);
    return respond(res, 500, false, error.message || "Failed to delete message");
  }
};

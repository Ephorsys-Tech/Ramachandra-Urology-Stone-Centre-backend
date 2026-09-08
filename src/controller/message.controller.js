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

    if (!name || !email || !phone || !message) {
      return respond(res, 400, false, "Name, email, phone, and message are required");
    }

    const newMessage = await Message.create({
      name,
      email,
      phone,
      subject: subject || "General Inquiry",
      message,
    });

    // Emit live Socket.io event to connected admins
    io.emit("messageAdded", newMessage);

    // Send auto-response confirmation email to the user (non-blocking)
    sendEmail({
      to: email,
      subject: `Thank you for contacting Usthi Hospital: ${subject || "General Inquiry"}`,
      text: `Dear ${name},\n\nThank you for reaching out to Usthi Hospital. We have received your inquiry regarding "${subject || "General Inquiry"}" and will get back to you shortly.\n\nYour message details:\nName: ${name}\nPhone: ${phone}\nMessage: ${message}\n\nBest regards,\nUsthi Hospital Team`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Inquiry Received - Usthi Hospital</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      color: #ffffff;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 5px 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .content p {
      margin: 0 0 20px;
      font-size: 16px;
    }
    .details {
      background-color: #f1f5f9;
      border-radius: 12px;
      padding: 20px;
      margin: 30px 0;
    }
    .details-title {
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .detail-item {
      margin-bottom: 10px;
      font-size: 14px;
    }
    .detail-item:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      font-weight: 600;
      color: #475569;
      width: 80px;
      display: inline-block;
    }
    .detail-value {
      color: #0f172a;
    }
    .footer {
      background-color: #f8fafc;
      color: #94a3b8;
      text-align: center;
      padding: 20px;
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>We have received your message</h1>
      <p>Usthi Hospital - Contact Center</p>
    </div>
    <div class="content">
      <p>Dear <strong>${name}</strong>,</p>
      <p>Thank you for reaching out to Usthi Hospital. We have received your inquiry and our team is currently reviewing the details. We will get back to you as soon as possible (usually within 24 hours).</p>
      
      <div class="details">
        <div class="details-title">Inquiry Details</div>
        <div class="detail-item">
          <span class="detail-label">Subject:</span>
          <span class="detail-value">${subject || "General Inquiry"}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${name}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Phone:</span>
          <span class="detail-value">${phone}</span>
        </div>
        <div class="detail-item" style="margin-top: 12px;">
          <span class="detail-label" style="display: block; margin-bottom: 4px;">Message:</span>
          <div style="background-color: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; color: #334155; font-style: italic; white-space: pre-wrap;">${message}</div>
        </div>
      </div>
      
      <p>If this is an emergency, please do not wait for an email response. Please call our 24/7 emergency services immediately at <strong>9090963722</strong>.</p>
      <p>Best regards,<br><strong>The Usthi Hospital Team</strong></p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Usthi Hospital. All rights reserved.</p>
      <p>This is an automated response. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`
    }).then(() => {
      console.log("Auto-response confirmation email sent successfully to:", email);
    }).catch(error => {
      console.error("Auto-response confirmation email error:", error);
    });

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

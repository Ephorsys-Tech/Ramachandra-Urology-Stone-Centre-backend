import express from "express";
import protect from "../middleware/auth.middleware.js";
import { sendMessage, getAllMessages, deleteMessage } from "../controller/message.controller.js";

const router = express.Router();

// Send Message (Public)
// POST -> /api/v1/message/send
router.post("/send", sendMessage);

// Get All Messages (Admin protected)
// GET -> /api/v1/message/all
router.get("/all", protect, getAllMessages);

// Delete Message (Admin protected)
// DELETE -> /api/v1/message/delete/:id
router.delete("/delete/:id", protect, deleteMessage);

export default router;

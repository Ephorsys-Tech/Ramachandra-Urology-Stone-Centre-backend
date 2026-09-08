import express from "express";
import protect from "../middleware/auth.middleware.js";
import { getSettings, updateSettings } from "../controller/setting.controller.js";

const router = express.Router();

// GET -> /api/v1/setting/get
router.get("/get", getSettings);

// PUT -> /api/v1/setting/update
router.put("/update", protect, updateSettings);

export default router;

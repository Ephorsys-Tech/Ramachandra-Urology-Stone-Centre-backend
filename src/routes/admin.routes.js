import express from "express";

import protect from "../middleware/auth.middleware.js";
import {
  forgetPasswordAdmin,
  getAdminProfile,
  loginAdmin,
  LogoutAdmin,
  refreshTokenAdmin,
  registerAdmin,
  resetPasswordAdmin,
  verifyResetOtpAdmin,
} from "../controller/admin.controller.js";

const router = express.Router();

// ------------------------------------------------------
// Admin Authentication Routes
// ------------------------------------------------------

// Register Admin
// POST -> /api/v1/admin/register
router.post("/register", registerAdmin);

// Login Admin
// POST -> /api/v1/admin/login
router.post("/login", loginAdmin);

// Refresh Access Token via httpOnly Cookie
// POST -> /api/v1/admin/refresh-token
router.post("/refresh-token", refreshTokenAdmin);

// Logout Admin
// POST -> /api/v1/admin/logout
router.post("/logout", LogoutAdmin);

// ------------------------------------------------------
// Admin Profile
// GET -> /api/v1/admin/profile or /api/v1/admin/me
// ------------------------------------------------------
router.get("/profile", protect, getAdminProfile);
router.get("/me", protect, getAdminProfile);

// ------------------------------------------------------
// Forget Admin Password
// POST -> /api/v1/admin/forget-password
// ------------------------------------------------------
router.post("/forget-password", forgetPasswordAdmin);

// Verify Admin Password Reset OTP
// POST -> /api/v1/admin/verify-reset-otp
// ------------------------------------------------------
router.post("/verify-reset-otp", verifyResetOtpAdmin);

// Reset Admin Password
// POST -> /api/v1/admin/reset-password
// ------------------------------------------------------
router.post("/reset-password", resetPasswordAdmin);

export default router;

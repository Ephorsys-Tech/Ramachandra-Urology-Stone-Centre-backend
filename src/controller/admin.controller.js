import crypto from "crypto";
import AdminModel from "../model/admin.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../util/generateToken.js";
import { respond } from "../util/respond.js";
import sendEmail from "../util/sendEmail.js";

const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_MINUTES = 15;

const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const getPasswordResetEmail = (otp) => ({
  subject: "Admin password reset OTP",
  text: `Your admin password reset OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not request this, ignore this email.`,
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Admin password reset</h2>
      <p>Use this OTP to verify your password reset request:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `,
});
// -----------------------------------------------------
// @description -   Register Admin
// @route -   POST /api/v1/admin/register
// @access -  Public
// -----------------------------------------------------

export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return respond(res, 400, false, "All Fields are Required");
    }

    // --------------------------------------------
    // Check Existing Admin
    // --------------------------------------------
    const existingAdmin = await AdminModel.findOne({ email });
    if (existingAdmin) {
      return respond(res, 409, false, "Admin Already Exists");
    }

    // --------------------------------------------
    // Create Admin
    // --------------------------------------------
    const admin = await AdminModel.create({
      name,
      email,
      password,
      ...(role && { role }),
    });

    //---------------------------------------------
    // Remove Password from Response
    //---------------------------------------------
    const adminData = await AdminModel.findById(admin._id).select("-password");

    //---------------------------------------------
    // Final Response
    //----------------------------------------------
    return respond(res, 201, true, "Admin Registered Successfully", adminData);
  } catch (error) {
    console.error("Register Admin Error:", error);
    return respond(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

//-------------------------------------------------------
//@description - Login Admin
//@route - POST  /api/v1/admin/login
//@access Public
//-------------------------------------------------------

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return respond(res, 400, false, "Email and Password are Required");
    }

    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      return respond(res, 404, false, "Admin Not Found");
    }

    const isPasswordMatched = await admin.comparePassword(password);
    if (!isPasswordMatched) {
      return respond(res, 401, false, "Invalid Credentials");
    }

    // Generate Short-lived Access Token (15 min) & Long-lived Refresh Token (7 days)
    const accessToken = generateAccessToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    const isProduction = process.env.NODE_ENV === "production";

    // Set Refresh Token in Secure httpOnly Cookie (Inaccessible to malicious JS/XSS)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return respond(res, 200, true, "Login Successful", {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      accessToken,
    });
  } catch (error) {
    console.error("Login Admin Error:", error);
    return respond(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

//-------------------------------------------------------
//@description - Refresh Access Token via httpOnly Cookie
//@route - POST  /api/v1/admin/refresh-token
//@access Public (Cookie-based)
//-------------------------------------------------------

export const refreshTokenAdmin = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return respond(res, 401, false, "No refresh token provided");
    }

    const decoded = verifyRefreshToken(refreshToken);
    const admin = await AdminModel.findById(decoded.id).select("-password");

    if (!admin) {
      return respond(res, 401, false, "Invalid refresh token or user not found");
    }

    // Generate new 15-minute access token
    const newAccessToken = generateAccessToken(admin._id);

    return respond(res, 200, true, "Token Refreshed Successfully", {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      accessToken: newAccessToken,
    });
  } catch (error) {
    return respond(res, 401, false, "Invalid or expired refresh token", {
      error: error.message,
    });
  }
};

//-------------------------------------------------------
//@description - Logout Admin
//@route - POST  /api/v1/admin/logout
//@access Private
//-------------------------------------------------------

export const LogoutAdmin = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    });

    return respond(res, 200, true, "Logout Successful");
  } catch (error) {
    console.error("Logout Error:", error);
    return respond(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

//-------------------------------------------------------
//@description - Get Admin Profile
//@route - GET /api/v1/admin/profile
//@access Private
//-------------------------------------------------------

export const getAdminProfile = async (req, res) => {
  try {
    // --------------------------------------------
    // Find Admin already exist or Not
    // --------------------------------------------
    const admin = await AdminModel.findById(req.admin._id).select("-password");
    if (!admin) {
      return respond(res, 404, false, "Admin Not Found");
    }

    // ------------------------------------------
    // Success Response
    // ------------------------------------------
    return respond(res, 200, true, "Profile Retrieved Successfully", admin);
  } catch (error) {
    console.error("Profile Error:", error);
    return respond(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

//-------------------------------------------------------
//@description - Forget Admin Password
//@route - POST /api/v1/admin/forget-password
//@access Public
//-------------------------------------------------------

export const forgetPasswordAdmin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return respond(res, 400, false, "Email is Required");
    }

    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      return respond(res, 200, true, "If an admin exists with this email, a reset OTP has been sent");
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const emailContent = getPasswordResetEmail(otp);

    admin.passwordResetOtp = hashValue(otp);
    admin.passwordResetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    admin.passwordResetToken = undefined;
    admin.passwordResetTokenExpires = undefined;
    admin.passwordResetVerified = false;

    await admin.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        to: admin.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch (mailError) {
      admin.passwordResetOtp = undefined;
      admin.passwordResetOtpExpires = undefined;
      admin.passwordResetVerified = false;
      await admin.save({ validateBeforeSave: false });

      console.error("Password Reset Mail Error:", mailError);
      return respond(res, 500, false, "Unable to send password reset email");
    }

    return respond(res, 200, true, "If an admin exists with this email, a reset OTP has been sent");
  } catch (error) {
    console.error("Forget Password Error:", error);
    return respond(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

//-------------------------------------------------------
//@description - Verify Admin Password Reset OTP
//@route - POST /api/v1/admin/verify-reset-otp
//@access Public
//-------------------------------------------------------

export const verifyResetOtpAdmin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = req.body?.otp?.toString().trim();

    if (!email || !otp) {
      return respond(res, 400, false, "Email and OTP are Required");
    }

    const admin = await AdminModel.findOne({ email }).select(
      "+passwordResetOtp +passwordResetOtpExpires +passwordResetToken +passwordResetTokenExpires +passwordResetVerified",
    );

    if (
      !admin ||
      !admin.passwordResetOtp ||
      !admin.passwordResetOtpExpires ||
      admin.passwordResetOtpExpires < new Date() ||
      admin.passwordResetOtp !== hashValue(otp)
    ) {
      return respond(res, 400, false, "Invalid or expired OTP");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    admin.passwordResetOtp = undefined;
    admin.passwordResetOtpExpires = undefined;
    admin.passwordResetToken = hashValue(resetToken);
    admin.passwordResetTokenExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    admin.passwordResetVerified = true;

    await admin.save({ validateBeforeSave: false });

    return respond(res, 200, true, "OTP verified successfully", {
      resetToken,
      expiresInMinutes: RESET_TOKEN_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error("Verify Reset OTP Error:", error);
    return respond(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

//-------------------------------------------------------
//@description - Reset Admin Password
//@route - POST /api/v1/admin/reset-password
//@access Public
//-------------------------------------------------------

export const resetPasswordAdmin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const resetToken = req.body?.resetToken?.trim();
    const { password, confirmPassword } = req.body || {};

    if (!email || !resetToken || !password || !confirmPassword) {
      return respond(res, 400, false, "Email, reset token, password, and confirm password are Required");
    }

    if (password !== confirmPassword) {
      return respond(res, 400, false, "Password and confirm password do not match");
    }

    if (password.length < 8) {
      return respond(res, 400, false, "Password must be at least 6 characters");
    }

    const admin = await AdminModel.findOne({ email }).select(
      "+password +passwordResetToken +passwordResetTokenExpires +passwordResetVerified",
    );

    if (
      !admin ||
      !admin.passwordResetVerified ||
      !admin.passwordResetToken ||
      !admin.passwordResetTokenExpires ||
      admin.passwordResetTokenExpires < new Date() ||
      admin.passwordResetToken !== hashValue(resetToken)
    ) {
      return respond(res, 400, false, "Invalid or expired reset token");
    }

    admin.password = password;
    admin.passwordResetToken = undefined;
    admin.passwordResetTokenExpires = undefined;
    admin.passwordResetVerified = false;

    await admin.save();

    return respond(res, 200, true, "Password reset successfully");
  } catch (error) {
    console.error("Reset Password Error:", error);
    return respond(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

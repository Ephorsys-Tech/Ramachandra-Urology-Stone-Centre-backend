import AdminModel from "../model/admin.model.js";
import { verifyAccessToken } from "../util/generateToken.js";

// ─── Status Code Contract (for frontend Axios interceptor) ───────────────────
//
//  409  ACCESS_TOKEN_EXPIRED   → access token expired, refresh token present
//                                → frontend should silently call /refresh-token
//                                  and retry the original request
//
//  401  SESSION_EXPIRED        → refresh token also missing/expired
//                                → frontend must redirect to /login
//
//  401  INVALID_TOKEN          → token is tampered / wrong secret
//                                → frontend must redirect to /login
//
//  401  ADMIN_NOT_FOUND        → admin deleted from DB mid-session
//                                → frontend must redirect to /login
//
//  401  AUTH_ERROR             → no token provided at all
//                                → frontend must redirect to /login
// ─────────────────────────────────────────────────────────────────────────────

const protect = async (req, res, next) => {
  try {
    // ── 1. Extract access token (Bearer header OR cookie) ─────────────────────
    let token = null;

    if (req.headers?.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    // ── 2. No access token at all ─────────────────────────────────────────────
    if (!token) {
      // If a refresh token cookie exists, the access cookie just expired/cleared
      // → tell frontend to silently refresh instead of logging out
      if (req.cookies?.refreshToken) {
        return res.status(409).json({
          success: false,
          message: "Access token expired. Please refresh.",
          code: "ACCESS_TOKEN_EXPIRED",
        });
      }

      // No tokens at all → full session expired
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "SESSION_EXPIRED",
      });
    }

    // ── 3. Verify access token signature + expiry ─────────────────────────────
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (tokenError) {
      if (tokenError.name === "TokenExpiredError") {
        // Access token is expired — decide based on refresh token presence
        if (req.cookies?.refreshToken) {
          // Refresh token cookie still present → 409, frontend should auto-refresh
          return res.status(409).json({
            success: false,
            message: "Access token expired. Please refresh.",
            code: "ACCESS_TOKEN_EXPIRED",
          });
        }

        // No refresh token either → full session expired
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
          code: "SESSION_EXPIRED",
        });
      }

      // Token is invalid (tampered, wrong secret, malformed)
      return res.status(401).json({
        success: false,
        message: "Invalid access token.",
        code: "INVALID_TOKEN",
      });
    }

    // ── 4. Load admin from DB ─────────────────────────────────────────────────
    req.admin = await AdminModel.findById(decoded.id).select("-password");

    if (!req.admin) {
      // Admin was deleted from DB after token was issued
      return res.status(401).json({
        success: false,
        message: "Admin account not found or has been deactivated.",
        code: "ADMIN_NOT_FOUND",
      });
    }

    // ── 5. All good → proceed ─────────────────────────────────────────────────
    next();
  } catch (error) {
    // Unexpected server error during auth (DB down, etc.)
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication service error. Please try again.",
      code: "AUTH_SERVER_ERROR",
    });
  }
};

export default protect;

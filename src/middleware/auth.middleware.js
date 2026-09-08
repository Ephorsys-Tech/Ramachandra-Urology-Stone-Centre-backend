import AdminModel from "../model/admin.model.js";
import { verifyAccessToken } from "../util/generateToken.js";

const protect = async (req, res, next) => {
  try {
    // ---------------------------------------------
    // Get Access Token From Authorization Header or Cookie
    // ---------------------------------------------
    let token = null;

    if (req.headers?.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized, access token missing",
      });
    }

    // ----------------------------------------------
    // Verify Access Token
    // ----------------------------------------------
    const decoded = verifyAccessToken(token);

    // ----------------------------------------------
    // Find Admin
    // ----------------------------------------------
    req.admin = await AdminModel.findById(decoded.id).select("-password");

    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found or account inactive",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
      expired: error.name === "TokenExpiredError",
    });
  }
};

export default protect;

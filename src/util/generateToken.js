import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET ||
  "default_access_secret_key_usthi";

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  (ACCESS_SECRET + "_refresh_secret_secure");

const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

// Short-lived Access Token (Read from .env: JWT_ACCESS_EXPIRY) - Kept in-memory in frontend
export const generateAccessToken = (adminId) => {
  return jwt.sign({ id: adminId }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  });
};

// Long-lived Refresh Token (Read from .env: JWT_REFRESH_EXPIRY) - Stored in httpOnly cookie
export const generateRefreshToken = (adminId) => {
  return jwt.sign({ id: adminId }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

export default generateAccessToken;

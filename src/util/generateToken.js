import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";

// ─── Secrets ─────────────────────────────────────────────────────────────────
const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET ||
  "default_access_secret_CHANGE_IN_PROD";

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  ACCESS_SECRET + "_refresh";

// ─── Token Expiry (JWT `expiresIn` format: "15m", "7d", etc.) ────────────────
const ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || "15m";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

// ─── Cookie Max-Age (milliseconds) – parsed from human-readable .env values ───────
// Supported units: s (seconds), m (minutes), h (hours), d (days)
// Examples: "15m" → 900000ms  |  "7d" → 604800000ms
const parseDuration = (value, fallbackMs) => {
  if (!value) return fallbackMs;
  const match = String(value).trim().match(/^(\d+)(s|m|h|d)$/);
  if (!match) return fallbackMs;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return num * multipliers[unit];
};

export const ACCESS_COOKIE_MAX_AGE_MS  = parseDuration(process.env.ACCESS_TOKEN_COOKIE_MAX_AGE,  15 * 60 * 1000);
export const REFRESH_COOKIE_MAX_AGE_MS = parseDuration(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE, 7 * 24 * 60 * 60 * 1000);

// ─── Cookie Options Factory ───────────────────────────────────────────────────
// Centralised so login / refresh / logout all use identical flags.
const isProduction = () => process.env.NODE_ENV === "production";

export const accessCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? "none" : "lax",
  maxAge: ACCESS_COOKIE_MAX_AGE_MS,       // milliseconds
});

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? "none" : "lax",
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,      // milliseconds
});

export const clearCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? "none" : "lax",
});

// ─── Token Generators ────────────────────────────────────────────────────────
// Short-lived Access Token — kept in-memory on the client or in accessToken cookie
export const generateAccessToken = (adminId) =>
  jwt.sign({ id: adminId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });

// Long-lived Refresh Token — stored in httpOnly cookie + hashed copy in DB
export const generateRefreshToken = (adminId) =>
  jwt.sign({ id: adminId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

// ─── Token Verifiers ─────────────────────────────────────────────────────────
export const verifyAccessToken  = (token) => jwt.verify(token, ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);

export default generateAccessToken;

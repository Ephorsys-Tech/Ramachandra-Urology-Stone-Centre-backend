import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import router from "./routes/index.js";
import logger from "./config/logger.js";
import { globalErrorHandler } from "./middleware/globalError.middleware.js";
import { config } from "dotenv";

const app = express();

// ---------------------------------------------
// CORS Configuration
// ---------------------------------------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
  }),
);

// ---------------------------------------------
// Middleware
// ---------------------------------------------
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// ---------------------------------------------
// Morgan Logger
// ---------------------------------------------
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(morganFormat, { stream: logger.stream }));

// ---------------------------------------------
// API Prefix
// ---------------------------------------------

app.use("/api/v1", router);

// Global error handler (should be after all routes)
app.use(globalErrorHandler);

export default app;

// app is export Here and Import in Server.js

import fs from "fs";
import path from "path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logDirectory = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const { combine, timestamp, printf, errors, splat, json, colorize } = winston.format;

const consoleFormat = combine(
  colorize(),
  timestamp(),
  errors({ stack: true }),
  splat(),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const msg = stack || message;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
    return `${timestamp} [${level}]: ${msg} ${metaStr}`;
  })
);

const fileFormat = combine(timestamp(), errors({ stack: true }), splat(), json());

const transports = [
  new winston.transports.Console({ format: consoleFormat }),
  new DailyRotateFile({
    dirname: logDirectory,
    filename: "application-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    level: process.env.LOG_LEVEL || "info",
    format: fileFormat,
  }),
  new DailyRotateFile({
    dirname: logDirectory,
    filename: "error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "30d",
    level: "error",
    format: fileFormat,
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels: winston.config.npm.levels,
  transports,
  exitOnError: false,
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDirectory, "exceptions.log") }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDirectory, "rejections.log") }),
  ],
});

// A stream object for morgan to use
logger.stream = {
  write: (message) => {
    // morgan adds a newline at the end of the message
    logger.http(message.trim());
  },
};

export default logger;

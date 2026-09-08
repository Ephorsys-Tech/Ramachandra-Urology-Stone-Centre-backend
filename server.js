import dotenv from "dotenv";
dotenv.config();

import dns from "dns";
import http from "http";

import app from "./src/app.js";
import connectToDb from "./src/config/db/db.js";
import DoctorModel from "./src/model/doctor.model.js";

import { Server } from "socket.io";

// ======================================================
// DNS
// ======================================================

dns.setServers(["8.8.8.8", "8.8.4.4"]);

// ======================================================
// PORT
// ======================================================

const PORT = process.env.PORT || 8800;

// ======================================================
// HTTP SERVER
// ======================================================

const server = http.createServer(app);

// ======================================================
// SOCKET IO
// ======================================================

export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://usthihospital.com",
      "https://www.usthihospital.com",
    ],
    credentials: true,
  },
});

// ======================================================
// SOCKET CONNECTION
// ======================================================

io.on("connection", (socket) => {
  console.log("Socket Connected :", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket Disconnected :", socket.id);
  });
});

// ======================================================
// START SERVER
// ======================================================

const startServer = async () => {
  try {
    await connectToDb();

    // Drop unique index constraints from MongoDB if they exist by syncing indexes
    try {
      await DoctorModel.syncIndexes();
      console.log("Doctor database indexes synchronized successfully.");
    } catch (indexErr) {
      console.error("Error syncing doctor indexes (unique indices might still persist):", indexErr);
    }

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error);

    process.exit(1);
  }
};

startServer();
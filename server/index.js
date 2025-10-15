// backend/index.js
import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import departmentRouter from "./routes/department.js";
import employeeRouter from "./routes/employee.js";
import salaryRouter from "./routes/salary.js";
import leaveRouter from "./routes/leave.js";
import settingRouter from "./routes/setting.js";
import attendanceRouter from "./routes/attendance.js";
import dashboardRouter from "./routes/dashboard.js";
import announcementRouter from "./routes/announcementRoutes.js";
import payrollTemplateRouter from "./routes/payrollTemplate.js";
import payslipRouter from "./routes/payslip.js";
import birthdayRouter from "./routes/birthdayRoutes.js";
import { initializeBirthdayScheduler } from "./services/birthdayScheduler.js";
import connectToDatabase from "./db/db.js";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import notificationRouter from "./routes/notification.js";
import feedbackRouter from "./routes/feedback.js";

dotenv.config();
connectToDatabase();

const app = express();

// Initialize HTTP server and Socket.IO
const httpServer = createServer(app);
const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5000", "http://localhost:5174"].filter(Boolean);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Store io instance in app for controllers/routes to use
app.set('io', io);
// Also attach io to each request for places using req.io
app.use((req, res, next) => { req.io = io; next(); });

// Handle client connections and room joining
io.on('connection', (socket) => {
  console.log('🔗 Socket client connected');
  socket.on('join', (userId) => {
    if (userId) {
      const roomName = `user_${userId}`;
      console.log(`🏠 Socket joining room: ${roomName}`);
      socket.join(roomName);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket client disconnected');
  });
});

app.use(cors({ 
  origin: allowedOrigins, 
  credentials: true 
}));
app.use(express.json());


app.use("/uploads", express.static(path.resolve("public", "uploads")));
app.use("/assets", express.static(path.resolve("assets")));

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Mount routes
app.use("/api/auth", authRouter);
app.use("/api/department", departmentRouter);
app.use("/api/employee", employeeRouter);
app.use("/api/salary", salaryRouter);
app.use("/api/leave", leaveRouter);
app.use("/api/setting", settingRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/announcement", announcementRouter);
app.use("/api/payroll-template", payrollTemplateRouter);
app.use("/api/payslip", payslipRouter);
app.use("/api/birthdays", birthdayRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/feedback", feedbackRouter);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Initialize birthday wishes scheduler
  initializeBirthdayScheduler();
});


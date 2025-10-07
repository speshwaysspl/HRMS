// backend/index.js
import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
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
import notificationRouter from "./routes/notification.js";
import { initializeBirthdayScheduler } from "./services/birthdayScheduler.js";
import connectToDatabase from "./db/db.js";

dotenv.config();
connectToDatabase();

const app = express();
const server = createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io available to routes
app.set('io', io);

app.use(cors({ 
  origin: process.env.CLIENT_URL || "http://localhost:5173", 
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user to their personal room for targeted notifications
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their notification room`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize birthday wishes scheduler
  initializeBirthdayScheduler();
  

});

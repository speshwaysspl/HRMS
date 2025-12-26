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
import { initializeHolidayReminderScheduler } from "./services/holidayScheduler.js";
import connectToDatabase from "./db/db.js";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import serverless from "serverless-http";
import notificationRouter from "./routes/notification.js";
import feedbackRouter from "./routes/feedback.js";
import eventRouter from "./routes/eventRoutes.js";
import teamRouter from "./routes/team.js";
import taskRouter from "./routes/task.js";
import documentRouter from "./routes/documentRoutes.js";
import { seedHolidaysInternal } from "./controllers/eventController.js";

dotenv.config({ quiet: true });
connectToDatabase().then(() => {
  seedHolidaysInternal();
}).catch((err) => {
  console.error("❌ Failed to connect to MongoDB. Please check your connection string and ensure your IP is whitelisted in MongoDB Atlas.");
  console.error(err);
  process.exit(1);
});

const app = express();
const isLambda = process.env.IS_LAMBDA === 'true' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

let io = null;
let httpServer = null;
const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5000", "http://localhost:5173", "http://localhost:5174","https://speshwayhrms.com","https://www.speshwayhrms.com"].filter(Boolean);
if (!isLambda) {
  httpServer = createServer(app);
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });
  app.set('io', io);
  app.use((req, res, next) => { req.io = io; next(); });
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
}

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
app.use("/api/events", eventRouter);
app.use("/api/team", teamRouter);
app.use("/api/task", taskRouter);
app.use("/api/document", documentRouter);

const PORT = process.env.PORT || 5000;
if (!isLambda) {
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    initializeBirthdayScheduler();
    initializeHolidayReminderScheduler(io);
  });
}

export const handler = serverless(app);


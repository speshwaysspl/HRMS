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
import cron from "node-cron";
import Leave from "./models/Leave.js";
import Feedback from "./models/Feedback.js";
import connectToDatabase from "./db/db.js";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import notificationRouter from "./routes/notification.js";
import feedbackRouter from "./routes/feedback.js";
import eventRouter from "./routes/eventRoutes.js";
import teamRouter from "./routes/team.js";
import taskRouter from "./routes/task.js";
import documentRouter from "./routes/documentRoutes.js";
import dailyQuoteRouter from "./routes/dailyQuoteRoutes.js";
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

// Initialize HTTP server and Socket.IO
const httpServer = createServer(app);

// CORS: allow localhost (any port) and configured domains
const allowedDomains = ["https://speshwayhrms.com", "https://api.speshwayhrms.com","https://www.speshwayhrms.com"].filter(Boolean);
const corsOrigin = (origin, callback) => {
  // Allow non-browser requests (mobile app, curl)
  if (!origin) return callback(null, true);
  const isLocalhost = /^http:\/\/localhost(?::\d+)?$/.test(origin);
  if (isLocalhost || allowedDomains.includes(origin) || origin === process.env.CLIENT_URL) {
    return callback(null, true);
  }
  return callback(new Error("Not allowed by CORS"));
};

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true, // allow all origins in dev; app CORS below still restricts HTTP
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
  origin: corsOrigin,
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
app.use("/api/daily-quote", dailyQuoteRouter);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initializeBirthdayScheduler();
  initializeHolidayReminderScheduler(io);
  cron.schedule("59 23 * * *", async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      if (tomorrow.getDate() === 1) {
        const nextMonthStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
        const leaveResult = await Leave.deleteMany({ endDate: { $lt: nextMonthStart } });
        console.log(`Leave cleanup job deleted ${leaveResult.deletedCount} records`);
      }

      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const feedbackResult = await Feedback.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
      console.log(`Feedback cleanup job deleted ${feedbackResult.deletedCount} records (older than 30 days)`);
    } catch (error) {
      console.error("Error running monthly cleanup job:", error);
    }
  }, { timezone: "Asia/Kolkata" });
});


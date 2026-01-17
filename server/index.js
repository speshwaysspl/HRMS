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
import { WebSocketServer } from "ws";
import notificationRouter from "./routes/notification.js";
import feedbackRouter from "./routes/feedback.js";
import eventRouter from "./routes/eventRoutes.js";
import teamRouter from "./routes/team.js";
import taskRouter from "./routes/task.js";
import documentRouter from "./routes/documentRoutes.js";
import dailyQuoteRouter from "./routes/dailyQuoteRoutes.js";
import { seedHolidaysInternal } from "./controllers/eventController.js";
import { addConnection, removeConnection } from "./utils/websocketStore.js";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ quiet: true });
connectToDatabase().then(() => {
  seedHolidaysInternal();
}).catch((err) => {
  console.error("❌ Failed to connect to MongoDB. Please check your connection string and ensure your IP is whitelisted in MongoDB Atlas.");
  console.error(err);
  process.exit(1);
});

const app = express();

const httpServer = createServer(app);

// CORS: allow localhost (any port) and configured domains
const allowedDomains = ["https://speshwayhrms.com", "https://api.speshwayhrms.com", "https://www.speshwayhrms.com"].filter(Boolean);
const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  const isLocalhost = /^http:\/\/localhost(?::\d+)?$/.test(origin);
  if (isLocalhost || allowedDomains.includes(origin) || origin === process.env.CLIENT_URL) {
    return callback(null, true);
  }
  return callback(new Error("Not allowed by CORS"));
};

const isServerless = process.env.SERVERLESS === "true";

let io;

if (!isServerless) {
  const userSockets = new Map();

  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws"
  });

  wss.on("connection", (socket) => {
    socket.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data && data.type === "join" && data.userId) {
          const userId = String(data.userId);
          socket.userId = userId;
          if (!socket.connectionId) {
            socket.connectionId = uuidv4();
          }
          let sockets = userSockets.get(userId);
          if (!sockets) {
            sockets = new Set();
            userSockets.set(userId, sockets);
          }
          sockets.add(socket);
          addConnection(userId, socket.connectionId);
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    });

    socket.on("close", () => {
      const userId = socket.userId;
      const connectionId = socket.connectionId;
      if (userId && userSockets.has(userId)) {
        const sockets = userSockets.get(userId);
        sockets.delete(socket);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
      if (userId && connectionId) {
        removeConnection(userId, connectionId);
      }
    });
  });

  io = {
    to: (roomName) => ({
      emit: (eventName, payload) => {
        try {
          if (typeof roomName !== "string") return;
          if (!roomName.startsWith("user_")) return;
          const userId = roomName.slice("user_".length);
          const sockets = userSockets.get(userId);
          if (!sockets) return;
          const message = JSON.stringify({ event: eventName, payload });
          sockets.forEach((socket) => {
            if (socket.readyState === socket.OPEN) {
              socket.send(message);
            }
          });
        } catch (error) {
          console.error("WebSocket emit error:", error);
        }
      }
    })
  };
} else {
  io = {
    to: () => ({
      emit: () => {}
    })
  };
}

app.set("io", io);
app.use((req, res, next) => {
  req.io = io;
  next();
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

const startServer = () => {
  httpServer.listen(PORT, () => {
    initializeBirthdayScheduler();
    initializeHolidayReminderScheduler(io);
    cron.schedule(
      "59 23 * * *",
      async () => {
        try {
          const now = new Date();
          const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          if (tomorrow.getDate() === 1) {
            const nextMonthStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
            const leaveResult = await Leave.deleteMany({ endDate: { $lt: nextMonthStart } });
          }

          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const feedbackResult = await Feedback.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
        } catch (error) {
          console.error("Error running monthly cleanup job:", error);
        }
      },
      { timezone: "Asia/Kolkata" }
    );
  });
};

if (!isServerless) {
  startServer();
}

export { app, httpServer, startServer };


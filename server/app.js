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
import connectToDatabase from "./db/db.js";
import notificationRouter from "./routes/notification.js";
import feedbackRouter from "./routes/feedback.js";

dotenv.config({ quiet: true });

const createApp = (options = {}) => {
  const app = express();

  const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5000",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://speshwayhrms.com",
    "https://www.speshwayhrms.com",
  ].filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
  app.use(express.json());

  if (process.env.IS_OFFLINE === 'true') {
    const httpWs = process.env.WS_PORT ? `http://localhost:${process.env.WS_PORT}` : 'http://localhost:5001';
    if (!process.env.WS_API_ENDPOINT) process.env.WS_API_ENDPOINT = httpWs;
  }

  const io = options.io;
  if (io) {
    app.set("io", io);
  }

  const stubIO = {
    to: () => ({ emit: () => {} }),
    emit: () => {},
  };

  app.use((req, res, next) => {
    const currentIO = app.get("io") || io || stubIO;
    req.io = currentIO;
    next();
  });

  app.use("/uploads", express.static(path.resolve("public", "uploads")));
  app.use("/assets", express.static(path.resolve("assets")));

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server is running" });
  });

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

  connectToDatabase();

  return app;
};

export default createApp;
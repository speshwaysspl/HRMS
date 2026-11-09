// backend/index.js charan
import express from "express";
import cors from "cors";
import path from "path";
import compression from "compression";
import helmet from "helmet";
import { apiLimiter, linkResolveLimiter } from "./middleware/rateLimit.js";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import departmentRouter from "./routes/department.js";
import employeeRouter from "./routes/employee.js";
import salaryRouter from "./routes/salary.js";
import leaveRouter from "./routes/leave.js";
import leaveTypeRouter from "./routes/leaveType.js";
import shiftRouter from "./routes/shift.js";
import attendanceRegularizationRouter from "./routes/attendanceRegularization.js";
import reviewRouter from "./routes/review.js";
import reportSubscriptionRouter from "./routes/reportSubscription.js";
import { initializeWeeklyReportScheduler } from "./services/reportScheduler.js";
import settingRouter from "./routes/setting.js";
import attendanceRouter from "./routes/attendance.js";
import dashboardRouter from "./routes/dashboard.js";
import announcementRouter from "./routes/announcementRoutes.js";
import payrollTemplateRouter from "./routes/payrollTemplate.js";
import payslipRouter from "./routes/payslip.js";
import birthdayRouter from "./routes/birthdayRoutes.js";
import { initializeBirthdayScheduler } from "./services/birthdayScheduler.js";
import { initializeHolidayReminderScheduler } from "./services/holidayScheduler.js";
import { initializeDocumentExpiryScheduler } from "./services/documentExpiryScheduler.js";
import { initializeCheckoutReminderScheduler } from "./services/checkoutReminderScheduler.js";
import { initializeTeamAttendanceReminderScheduler } from "./services/teamAttendanceReminderScheduler.js";
import { initializeNotificationCleanupScheduler } from "./services/notificationCleanupScheduler.js";
import cron from "node-cron";
import User from "./models/User.js";
import { publishDueAnnouncements } from "./controllers/announcementController.js";
import Leave from "./models/Leave.js";
import Feedback from "./models/Feedback.js";
import connectToDatabase from "./db/db.js";
import { createServer } from "http";
import { liveDataMiddleware, attachSharedAdapter } from "./utils/realtime.js";
import { Server as SocketIOServer } from "socket.io";
import notificationRouter from "./routes/notification.js";
import feedbackRouter from "./routes/feedback.js";
import eventRouter from "./routes/eventRoutes.js";
import teamRouter from "./routes/team.js";
import taskRouter from "./routes/task.js";
import milestoneRouter from "./routes/milestone.js";
import documentRouter from "./routes/documentRoutes.js";
import dailyQuoteRouter from "./routes/dailyQuoteRoutes.js";
import recruitmentRouter from "./routes/recruitment.js";
import candidateRouter from "./routes/candidateRoutes.js";
import onboardingRouter from "./routes/onboardingRoutes.js";
import offerRouter from "./routes/offerRoutes.js";
import appointmentRouter from "./routes/appointmentRoutes.js";
import hrDashboardRouter from "./routes/hrDashboardRoutes.js";
import accountDeletionRouter from "./routes/accountDeletion.js";
import shortLinkRouter from "./routes/shortLink.js";
import { redirectShortLink } from "./controllers/shortLinkController.js";
import { seedHolidaysInternal } from "./controllers/eventController.js";
import { metricsMiddleware, metricsEndpoint } from "./middleware/metrics.js";

dotenv.config({ quiet: true });
connectToDatabase().then(() => {
  seedHolidaysInternal();
  attachSharedAdapter(io);
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
  socket.on('join', async (userId) => {
    if (userId) {
      const roomName = `user_${userId}`;
      console.log(`🏠 Socket joining room: ${roomName}`);
      socket.join(roomName);
      // Admins also get every team's live updates. Role is looked up server-side.
      try {
        const u = await User.findById(userId).select('role');
        const roles = Array.isArray(u?.role) ? u.role : [u?.role];
        if (roles.includes('admin')) socket.join('role_admin');
      } catch { /* invalid id: user room only */ }
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket client disconnected');
  });
});

// Security headers. The API only returns JSON and uploaded files, so its CSP
// forbids scripts entirely: an uploaded HTML/SVG can never run code.
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'unsafe-inline'"],
      frameAncestors: ["'self'", ...allowedDomains],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  // The web app (speshwayhrms.com) loads images/PDFs from this API's origin.
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

app.use(metricsMiddleware);
// /metrics exposes internals: allow only localhost, or a matching METRICS_TOKEN.
app.get("/metrics", (req, res, next) => {
  const token = process.env.METRICS_TOKEN;
  const auth = req.get("authorization") || "";
  const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
  const viaProxy = Boolean(req.get("x-forwarded-for") || req.get("cf-connecting-ip"));
  if ((token && auth === `Bearer ${token}`) || (!token && local && !viaProxy)) return next();
  return res.status(404).end();
}, metricsEndpoint);

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  // Let the web app read download filenames (e.g. payslip PDFs) cross-origin.
  exposedHeaders: ["Content-Disposition"]
}));
app.use(compression());
// Behind nginx (+ Cloudflare): trust the first proxy hop for req.ip.
app.set("trust proxy", 1);
app.use("/api", apiLimiter);
app.use(express.json({ limit: "1mb" })); // ID-card photo data URLs
// Live-refresh hint after every successful write (see utils/realtime.js).
app.use("/api", liveDataMiddleware(io));


app.use("/uploads", express.static(path.resolve("public", "uploads"), {
  maxAge: '1d',
  etag: false
}));
app.use("/assets", express.static(path.resolve("assets"), {
  maxAge: '1d',
  etag: false
}));

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
app.use("/api/leave-types", leaveTypeRouter);
app.use("/api/shifts", shiftRouter);
app.use("/api/attendance-regularization", attendanceRegularizationRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/report-subscription", reportSubscriptionRouter);
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
app.use("/api/milestone", milestoneRouter);
app.use("/api/document", documentRouter);
app.use("/api/daily-quote", dailyQuoteRouter);
app.use("/api/recruitment", recruitmentRouter);
app.use("/api/candidates", candidateRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/offers", offerRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/hr-dashboard", hrDashboardRouter);
app.use("/api/account", accountDeletionRouter);
app.use("/api/links", shortLinkRouter);
// Short-link redirect (when /s/* is routed to the API, e.g. backend.speshwayhrms.com/s/abc).
app.get("/s/:code", linkResolveLimiter, redirectShortLink);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initializeBirthdayScheduler(io);
  initializeHolidayReminderScheduler(io);
  initializeDocumentExpiryScheduler(io);
  initializeCheckoutReminderScheduler(io);
  initializeTeamAttendanceReminderScheduler(io);
  initializeNotificationCleanupScheduler();
  initializeWeeklyReportScheduler();
  // Release scheduled announcements every minute.
  cron.schedule("* * * * *", async () => {
    try {
      await publishDueAnnouncements(io);
    } catch (error) {
      console.error("Error publishing scheduled announcements:", error);
    }
  });
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


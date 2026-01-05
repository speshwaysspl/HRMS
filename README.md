# Speshway HRMS — Project Documentation

Speshway HRMS is a full‑stack Human Resource Management System with role‑based dashboards for admins, team leads, and employees. It includes attendance tracking, leave management, payroll and payslips, announcements, notifications, calendar events/holidays, teams, tasks, and document management.

## Overview

- Frontend: React 18 + Vite + Tailwind + MUI, Socket.IO client, routing and role‑based guards
- Backend: Node.js + Express + MongoDB (Mongoose), JWT auth, Socket.IO real‑time notifications, cron schedulers for birthdays and holidays
- Storage: Local disk uploads and optional AWS S3 for announcement images
- Deployment helper: Health endpoint for platform checks

## Tech Stack

- Frontend: `react`, `react-router-dom`, `@mui/material`, `tailwindcss`, `socket.io-client`, `react-toastify`, `xlsx`, `jspdf`
- Backend: `express`, `mongoose`, `jsonwebtoken`, `bcrypt`, `multer`, `socket.io`, `node-cron`, `nodemailer`, `exceljs`, `pdfkit`
- Optional cloud: `@aws-sdk/client-s3` for S3 uploads

## Monorepo Structure

- `HRMS/frontend`: Vite React app
  - `src/pages`: `Login.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, role dashboards
  - `src/components`: feature components (attendance, announcements, salary, teams, tasks, etc.)
  - `src/context`: `AuthContext.jsx` and `NotificationContext.jsx`
  - `src/utils`: API config, route guards, helpers
- `HRMS/server`: Express API
  - `index.js`: server boot, routes, Socket.IO, schedulers (HRMS/server/index.js:88)
  - `controllers`: business logic for each feature
  - `routes`: REST endpoints per feature module
  - `models`: Mongoose schemas (users, employees, departments, leaves, salary, payroll template, payslip, tasks, teams, notifications, announcements, events, documents)
  - `middleware`: auth, uploads (disk and S3), attendance defaults
  - `services`: schedulers and helpers
  - `db/db.js`: Mongo connection (HRMS/server/db/db.js:20)

## Features

- Authentication with JWT and role‑based access (`admin`, `team_lead`, `employee`)
- Attendance: tracking, reporting for admin and employee views
- Leave: requests, approvals, listing and details
- Payroll: salary management, templates, payslip generation, history, PDF export
- Announcements: CRUD, image uploads (local or S3), admin and employee views
- Notifications: real‑time web notifications with sound and fallback in‑app popups
- Calendar: holidays auto‑seeded, events management with notifications
- Team & Tasks: teams CRUD and per‑employee task lists
- Documents: upload and list per employee

## Environment Variables

Create `HRMS/server/.env` with:

- `PORT`: server port (default `5000`)
- `MONGODB_URL`: connection string; must start with `mongodb://` or `mongodb+srv://` (HRMS/server/db/db.js:22)
- `MONGODB_DB`: optional database name fallback if not in URL (HRMS/server/db/db.js:13)
- `JWT_SECRET`: token signing secret (HRMS/server/controllers/authController.js:16)
- `CLIENT_URL`: frontend base URL used in password reset links (HRMS/server/controllers/authController.js:54)
- AWS (optional for S3 uploads):
  - `AWS_REGION`
  - `AWS_S3_BUCKET_NAME`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`

Frontend `HRMS/frontend/.env`:

- `VITE_API_URL`: backend base URL used by the client (HRMS/frontend/src/utils/apiConfig.js:3)

## Quick Start

1) Backend
- `cd HRMS/server`
- `npm install`
- Configure `.env` (see above)
- Development: `npm run dev`
- Production: `npm start`

2) Frontend
- `cd HRMS/frontend`
- `npm install`
- Configure `.env` (set `VITE_API_URL=http://localhost:5000`)
- Development: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint`

## Backend Architecture

- Server entry mounts feature routes and sets up Socket.IO (HRMS/server/index.js:88)
- Database connection with URI normalization and IPv4 preference (HRMS/server/db/db.js:20)
- JWT auth middleware validates tokens and attaches `req.user` (HRMS/server/middleware/authMiddlware.js:5)
- Static assets served at `/uploads` and `/assets` (HRMS/server/index.js:80)
- Health check: `GET /health` (HRMS/server/index.js:84)
- Schedulers:
  - Birthday wishes daily at 12:00 AM IST (HRMS/server/services/birthdayScheduler.js:13)
  - Holiday reminders daily at 9:00 AM IST (HRMS/server/services/holidayScheduler.js:13)
- Holiday auto‑seeding on startup (HRMS/server/controllers/eventController.js:5)

### API Overview

- Auth (`/api/auth`)
  - `POST /login` → JWT issuance (HRMS/server/routes/auth.js:14)
  - `GET /verify` → verify token, returns user (HRMS/server/routes/auth.js:15)
  - `POST /forgot-password` → email reset link (HRMS/server/routes/auth.js:16)
  - `POST /reset-password/:token` → set new password (HRMS/server/routes/auth.js:17)
- Departments (`/api/department`) → CRUD
- Employees (`/api/employee`) → CRUD, documents, status, profiles
- Attendance (`/api/attendance`) → employee/admin summaries and reports
- Leaves (`/api/leave`) → apply, approve/reject, list
- Salary (`/api/salary`) → CRUD, calculations
- Payroll Templates (`/api/payroll-template`) → CRUD, fields, defaults
- Payslip (`/api/payslip`) → generate, preview, history, PDF
- Announcements (`/api/announcement`) → CRUD, image uploads
  - Local disk uploads (HRMS/server/middleware/uploadAnnouncement.js:32)
  - S3 uploads (HRMS/server/middleware/uploadAnnouncementS3.js:37)
- Notifications (`/api/notifications`)
  - List by user, mark read, mark all read, clear all
  - Real‑time push via Socket.IO rooms `user_{userId}` (HRMS/server/index.js:60)
- Events/Holidays (`/api/events`)
  - List/add/update/delete events (HRMS/server/controllers/eventController.js:42)
  - `POST /seed` to seed holidays (admin; HRMS/server/controllers/eventController.js:32)
- Teams (`/api/team`) → CRUD
- Tasks (`/api/task`) → assign/list/update per employee/team
- Documents (`/api/document`) → upload/list per employee

## Frontend Architecture

- API base and auth headers (HRMS/frontend/src/utils/apiConfig.js:3)
- Auth context verifies token on load, manages login/logout (HRMS/frontend/src/context/AuthContext.jsx:11)
- Private routes and role gates (HRMS/frontend/src/utils/PrivateRoutes.jsx:5, HRMS/frontend/src/utils/RoleBaseRoutes.jsx:5)
- Notification provider connects to Socket.IO and shows popups with sound (HRMS/frontend/src/context/NotificationContext.jsx:27)
- Login posts to backend and redirects by role (HRMS/frontend/src/pages/Login.jsx:50)
- Dashboards:
  - Admin: sidebar, summary, calendar, teams, departments, employees, salary, attendance, announcements, feedback
  - Team Lead: team‑focused views, tasks
  - Employee: attendance, payslips, documents, announcements, feedback

## Real‑Time Notifications

- Server creates a Socket.IO server and joins clients to `user_{id}` rooms upon `join` (HRMS/server/index.js:60)
- Frontend connects to the backend URL and emits `join` with `user._id` (HRMS/frontend/src/context/NotificationContext.jsx:40)
- Notifications are pushed on events (e.g., holiday reminder, new event) and displayed as system or in‑app popups

## File Uploads

- Local: images stored under `HRMS/server/public/uploads/announcements` (HRMS/server/middleware/uploadAnnouncement.js:6)
- S3: images uploaded to configured bucket; URLs formed as `https://{bucket}.s3.{region}.amazonaws.com/announcements/{uuid}.{ext}` (HRMS/server/middleware/uploadAnnouncementS3.js:70)

## Security

- JWT based auth with expiry (7 days) and secure verification (HRMS/server/controllers/authController.js:16)
- Role enforcement on the frontend via guards; backend should validate roles within controllers for privileged actions
- CORS configured for allowed origins including localhost and production domains (HRMS/server/index.js:44)
- Never commit secrets; use `.env` for sensitive configuration

## Troubleshooting

- MongoDB connection errors: verify `MONGODB_URL`, whitelist IPs, ensure URI includes a database or set `MONGODB_DB` (HRMS/server/db/db.js:8)
- Invalid/expired JWT: re‑login to obtain a fresh token (HRMS/server/middleware/authMiddlware.js:16)
- Socket.IO not connecting: check `VITE_API_URL` and backend `CLIENT_URL` CORS origins (HRMS/server/index.js:44)
- S3 upload failures: validate AWS credentials and bucket region (HRMS/server/middleware/uploadAnnouncementS3.js:16)

## Development Scripts

- Backend: `npm run dev`, `npm start`
- Frontend: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`


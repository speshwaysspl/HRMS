# Speshway (mobile)

Flutter companion app to the Speshway HRMS web frontend (`../frontend`), talking
to the same Express/MongoDB backend (`../server`) — same auth, same roles, same
data.

## What's implemented

**Employee / Team Lead** (the merged Employee+Team Lead role, matching the web
app) is fully wired end-to-end:

- Login, session persistence, auto-restore.
- Home dashboard (`GET /api/dashboard/employee-stats`).
- Attendance — check-in/out, history (`/api/attendance/*`).
- Leaves — balance, request list, apply form (`/api/leave/*`, `/api/leave-types`).
- Tasks — list + status update (`/api/task/*`).
- Announcements — list + detail (`/api/announcement/*`).
- Feedback — list + submit form (`/api/feedback/*`).
- My Documents — list + upload (`/api/document/*`).
- Notifications — list, mark read / mark all read (`/api/notifications/*`).
- Payslips — history + PDF download (`/api/payslip/*`).
- Calendar & Holidays (`/api/events/*`).
- My Reviews (`/api/reviews/mine`).
- Attendance Corrections — own requests + apply (`/api/attendance-regularization/*`).
- Team-lead-only, shown when `role` includes `team_lead`: My Teams + team
  detail (`/api/team/*`), Attendance Approvals (`/api/attendance-regularization/pending`),
  Team Reviews (`/api/reviews/team`).
- Profile — user info, roles, logout.

Bottom nav: **Home / Attendance / Leaves / More** — the "More" tab is a grid
housing everything past those three (see `lib/screens/more_screen.dart`),
same pattern the web app uses for its sidebar overflow.

**Admin / HR / Candidate** roles have a working shell (login routes them to
role-appropriate tabs, logout works, Profile works) but their module screens
are still placeholders — these are the next roles to port, following the same
service/screen pattern already established for Employee/Team Lead.

Theme ported 1:1 from `frontend/tailwind.config.js` (brand/accent/ink/surface
color scales, Inter font, card/panel radii) — see `lib/theme/app_theme.dart`.

## Running it

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5001   # Android emulator -> host machine
# or, iOS simulator / physical device on the same network:
flutter run --dart-define=API_BASE_URL=http://<your-machine-ip>:5001
```

`API_BASE_URL` defaults to `http://10.0.2.2:5001` (Android emulator's alias for
the host machine) if not passed — matches the backend's default port from
`server/.env`.

## Structure

```
lib/
  theme/app_theme.dart        # colors/typography ported from tailwind.config.js
  models/user.dart
  services/                   # one file per module, mirrors server/routes/*.js
    api_client.dart           # Dio + secure-storage token handling
    auth_provider.dart        # login/logout/session restore (ChangeNotifier)
    dashboard_service.dart
    attendance_service.dart
    leave_service.dart
    task_service.dart
    announcement_service.dart
    feedback_service.dart
    document_service.dart
    notification_service.dart
    payslip_service.dart
    event_service.dart
    team_service.dart         # TeamService, RegularizationService, ReviewService
  widgets/                    # StatusPill, SummaryCard, SimpleCard, CenteredMessage
  screens/
    splash_screen.dart
    login_screen.dart
    shell/app_shell.dart      # role-based bottom nav
    more_screen.dart          # module grid (role-aware)
    employee/                 # Home, Attendance, Leaves, Tasks, Announcements,
                               # Feedback, Documents, Notifications, Payslips,
                               # Calendar, My Reviews, Attendance Corrections
    teamlead/                 # My Teams (+ detail), Approvals, Team Reviews
    profile_screen.dart
    placeholder_screen.dart   # "coming soon" — currently only Admin/HR/Candidate modules
```

## Pending (next passes)

- Admin: dashboard analytics, Employees CRUD, Departments, Payroll, Reports.
- HR: dashboard, Recruitment pipeline, Candidate profiles/onboarding, Leave approvals.
- Candidate: application status, profile completion, document upload, interview schedule.
- Push notifications via FCM (backend already has `User.fcmTokens`; wire
  `POST /api/notifications/fcm-token` from the app on login).

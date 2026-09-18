# Changelog

All notable changes to this project are logged here, newest first. Timestamps are IST.

**Standing workflow**: before starting any new task, read this file and `MEMORY.md` first. After finishing a task, append an entry here (with an IST timestamp) and update `MEMORY.md`'s relevant sections + "Last Updated" date. When a change is made to `mobile/`, the equivalent responsive behavior/UI must also be checked/applied on `frontend/` (and vice versa) in the same pass, per the web↔mobile parity rule — call out explicitly if a change is intentionally single-surface.

---

## 2026-09-18 12:36 IST — Web: "Generate Payslip by Days" — final Net Pay formula (supersedes the 12:06 IST entry below)
- User iterated twice more after the 12:06 IST change, converging on the actual target: Earnings show **full** template values, **LOP Days = 0**, **LOP Amount = 0**, **Other Deductions = 0** (Total Deductions = PF + Prof Tax only) — matching the reference payslip's displayed figures exactly — while Net Pay is still genuinely computed from days actually worked.
- Worked out the real formula behind the reference PDF (`PRABHUSWAMY M_AUG.pdf`): `Net Pay = (full gross earnings × daysWorked ÷ calendarDaysInMonth) − (PF + Prof Tax)`. Verified this reproduces the reference's exact Net Pay (22006.45) for its numbers. This is **not** achievable via `Total Earnings − Total Deductions` alone (that formula, used everywhere in this codebase, would force Net Pay to 36200 given Earnings=40000/Deductions=3800) — it requires an explicit override point.
- Added `netPayOverride` end-to-end:
  - `GeneratePayslipByDays.jsx` `buildPayload()`: computes it as `max(0, proratedGrossEarnings − (pf + proftax))` and includes it in the payload; Basic/DA/HRA/etc., LOP Days/Amount, and Other Deductions are all sent unchanged (full/zero) as before.
  - `server/controllers/payslipController.js` (`generatePayslip` and `previewPayslip`): now use `payload.netPayOverride` for the stored/returned `netSalary` when present, otherwise fall back to the original `totalEarnings − totalDeductions` — **zero behavior change** for `PayslipGenerator.jsx`'s normal flow, which never sends this field.
  - `server/utils/pdfGenerator.js`: PDF's Net Pay line now prefers `salary.netSalary` (the authoritative stored value) over recomputing from the earnings/deductions it just rendered.
  - `frontend/src/components/salary/PayslipPreview.jsx`: same — prefers `payslip.netSalary` over its local recompute.
  - `frontend/src/components/salary/View.jsx` (payslip history detail view): found and fixed the **same** unsafe recompute independently — would have silently reintroduced the wrong Net Pay when viewing a saved by-days record from history.
  - Verified via a standalone Node calc that the new formula reproduces the reference PDF's Net Pay (22006.45) exactly for its own numbers (40000 gross, 20/31 days worked, 3800 fixed deductions).
- Confirmed no other Net Pay recompute sites needed changes: `PayslipGenerator.jsx`, `PayrollTemplateManager.jsx`, and `payrollTemplateController.js` all compute Net Pay for unrelated flows that never receive a `netPayOverride`.
- Mobile already correct — `payslips_screen.dart` reads `netSalary` directly from the API response rather than recomputing, so it displays the right value with no changes needed.

## 2026-09-18 12:06 IST — Web: "Generate Payslip by Days" now shows a real, visible LOP line (reversed the earlier hidden-proration approach) — SUPERSEDED, see entry above
- User compared a preview against the reference `PRABHUSWAMY M_AUG.pdf` again. Confirmed that PDF still has a genuine, pre-existing arithmetic bug (Total Earnings 40000 − Total Deductions 3800 = 36200, but it prints Net Pay as 22006.45 — self-inconsistent, a stale artifact, not a template to match) — not the cause of the reported "difference."
- The real issue: `GeneratePayslipByDays.jsx` prorated every earnings line item (Basic/DA/HRA/etc.) by `daysWorked / calendarDaysInMonth`, while always showing `LOP Days: 0` — technically self-consistent (Total Earnings − Total Deductions = Net Pay held), but confusing since a real pay cut was invisible as "0 LOP".
- **User's explicit direction**: earnings should show full template values (never scaled down); Loss of Pay should be a real, visible, non-zero deduction line; and Net Pay should still be reduced internally via that deduction. This **reverses** the earlier "hide LOP, cut via earnings proration" decision from the previous session — noted in `MEMORY.md` accordingly.
- Implemented in `buildPayload()`: Basic/DA/HRA/Conveyance/Medical/Special allowances now always pass their full, unprorated template values. LOP Days = `totalDays − daysWorked` (calendar days in month), LOP Amount = `(full gross earnings ÷ calendar days in month) × LOP Days`, sent with `autoCalculateLOP: false` so the backend (`payslipController.js`, both `previewPayslip` and `generatePayslip`) uses that precomputed amount as-is rather than recalculating it. Updated the on-page hint text and header description to match the new behavior.
- Backend required no changes — `previewPayslip`/`generatePayslip` already honored explicit `lopamount`/`lopDays` when `autoCalculateLOP` is false (same pattern already used for PF).
- No mobile parity needed — this admin-only "Generate Payslip by Days" screen has no mobile equivalent (mobile's payslip screens are read-only employee views).

## 2026-09-18 07:10 IST — Mobile: diagnosed physical-device login failure + wired network screen into Login
- **Root cause of "Could not reach the server" on login**: user was running the app on a **physical Android phone**, not the emulator. `Env.developmentBaseUrl` defaults to `http://10.0.2.2:5001` for Android debug builds, which is an alias that only resolves on the Android **emulator** — a real device can't reach it. Fix is to run with `--dart-define=API_BASE_URL=http://<PC-LAN-IP>:5001` (this machine's current LAN IP: `192.168.1.17`), with phone and PC on the same Wi-Fi. Not a code bug — `env.dart` already documents this limitation in its header comment; this was a "how to run for physical-device testing" gap, not a defect.
- **Fixed a real gap**: login failures only ever showed a plain dark `SnackBar`, never the illustrated `NetworkErrorView` from `state_views.dart`, even for genuine connectivity failures. Fixed:
  - `AuthProvider` (`auth_provider.dart`) now keeps the raw caught exception in `lastErrorRaw` (previously only the stringified `lastError` survived), needed so `isNetworkError()` can inspect it.
  - `login_screen.dart`: on a failed login, checks `isNetworkError(auth.lastErrorRaw)` — if true, shows the illustrated `NetworkErrorView` (with Retry) above the login form instead of a snackbar; the form itself stays mounted via `Offstage` (not removed from the tree) so `_formKey`/typed email+password survive and Retry can resubmit without a null-check crash. Non-network failures (wrong password, etc.) still use the snackbar since the user needs the form visible to fix their input.
- `flutter analyze` clean, all 17 tests pass.
- No web parity needed — `frontend`'s Login.jsx has its own inline error text pattern; this is a mobile-specific illustrated-state wiring change.

## 2026-09-18 07:04 IST — Mobile: illustrated state screens (network/error/empty/success)
- Rebuilt `mobile/lib/widgets/state_views.dart` from bare icon+text widgets into fuller "illustrated" full-page states: a layered soft-circle badge behind the icon (concentric rings) with a scale+fade entrance animation (skips animation under reduced-motion). `NetworkErrorView`, `ErrorView`, `EmptyStateView` kept the same public API (no call-site changes needed) — just look more like real screens now.
- Added a new **`SuccessView`** (didn't exist before) — full-page success confirmation state (green check badge, title/subtitle/action).
- Wired `SuccessView` into a real flow: the "Request Account Deletion" bottom sheet in `profile_screen.dart` now transitions to a `SuccessView` (with a "Done" button) instead of popping immediately + a snackbar, giving a clear confirmation moment.
- `flutter analyze` clean, all 17 existing tests still pass.
- No web parity needed — these are mobile-native full-screen state components; web already has its own `LoadingState`/`EmptyState` components (`frontend/src/components/common/`) serving the same purpose in that codebase's idiom.

## 2026-09-18 06:43 IST — Mobile: splash screen spinner removed
- Removed the `CircularProgressIndicator` from `mobile/lib/screens/splash_screen.dart` per explicit request — splash now shows only the fade+scale logo and "SPESHWAY HRMS" wordmark, no loading spinner. No web equivalent (web has no splash screen), so no parity change needed.

## 2026-09-18 IST — Mobile: login screen keyboard overflow fix
- Fixed a real "BOTTOM OVERFLOWED BY 95 PIXELS" bug on `mobile/lib/screens/login_screen.dart`: when the keyboard opens while the Email field is focused, the top `Expanded` brand-header region (logo + "SPESHWAY HRMS" + tagline) shrinks below its natural content height and overflows.
- Fix: wrapped `_buildBrandHeader()` in a fixed-width (`280`) `SizedBox` + `FittedBox(fit: BoxFit.scaleDown)`, so the header scales down as a unit instead of overflowing when vertical space is tight (keyboard open, small phones, etc.), while still wrapping the tagline text at a sane width before scaling.
- Web-only parity note: not mirrored to `frontend/src/pages/Login.jsx` — that page doesn't use this shrink-on-keyboard layout (already a centered single-block design from an earlier redesign), so there's no equivalent bug there.

## 2026-09-18 05:09 IST — Mobile: user seed credential update
- Updated `server/verificationSeed.js` password from `verification123` to `verify@123` and re-ran the seed (upserts by email, no duplicate created).
- Verification/App-review login is now: `verification@gmail.com` / `verify@123`.

## 2026-09-17 (evening) IST — Play Store production readiness pass
- **Release signing**: confirmed `android/key.properties` + upload keystore now wired into `android/app/build.gradle.kts` release `signingConfig` (previously fell back to debug signing — this was the P0 blocker). Verified with a real `flutter build appbundle --release` → succeeded, produced a properly release-signed AAB.
- **Fixed a real syntax bug** in `mobile/lib/screens/profile_screen.dart` (`_showDeletionRequestSheet`): three closing tokens were swapped (`);`/`},`/`),` out of order), which broke `flutter analyze` entirely. Fixed; `flutter analyze` is now clean (0 issues).
- **Fixed a genuine Firebase project mismatch**: `mobile/lib/firebase_options.dart` (what `Firebase.initializeApp()` actually uses) pointed to project `speshway-hrms`, while `android/app/google-services.json` and `server/service-account.json` (the backend's FCM sender) both pointed to `new-hrms-d8eaf` — two different Firebase projects, which would silently break push notification delivery (FCM rejects cross-project token/send mismatches). Fixed both the Android and iOS blocks in `firebase_options.dart`, and replaced `mobile/ios/Runner/GoogleService-Info.plist` with a real config generated under `new-hrms-d8eaf`. All four config sources (Android native, iOS native, Dart Android, Dart iOS) now agree.
- **Added a test suite** (previously `test/` didn't exist at all, so `flutter test` errored with "Test directory not found"): added `mobile/test/models/user_test.dart`, `mobile/test/services/api_client_test.dart`, `mobile/test/widgets/status_pill_test.dart` — 17 tests, all passing.
- **Verified account-deletion flow already exists end-to-end** (backend `AccountDeletionRequest` model/controller/routes at `/api/account/deletion-request` + `/api/account/deletion-requests`, a public web page `frontend/src/pages/DeleteAccount.jsx`, and a mobile "Request Account Deletion" card + bottom sheet in `profile_screen.dart`) — this is the correct pattern for an org-provisioned (admin-creates-credentials) app: employees request deletion, HR/Admin verifies and actions it, rather than instant self-deletion.
- Deliberately **not** bumped: Gradle 8.14→9.1+ / AGP 8.11.1→9.0.1+ / Kotlin 2.2.21→2.3.20+ — these are deprecation warnings, not current failures; user chose to defer this to a separate session given the risk of breaking the now-verified release build.
- Added `server/verificationSeed.js` — seeds a stable `verification@gmail.com` login (role: employee, fully populated Employee record) for Play Store "App access" reviewer credentials / general store verification. Safe to re-run (upserts by email).

## 2026-09-17 (afternoon) IST — Mobile Documents removal, splash screen, home header contrast, profile redesign, drawer icons
- Removed the "Documents" feature entirely from mobile (employee `documents_screen.dart`, admin `admin_documents_screen.dart`, `document_service.dart`, and their drawer entries) per explicit request.
- Redesigned `mobile/lib/screens/splash_screen.dart`: fade+scale entrance animation, a spinner, an `errorBuilder` fallback if the logo asset fails to decode, and a 500ms cross-fade transition into Login/Home instead of an instant cut.
- Fixed poor text contrast on the Employee Home screen's greeting header (background photo was too bright behind white text) — strengthened the gradient scrim (3-stop, darker toward the text) and added text shadows to every line in `_buildHeaderGreeting()`.
- **Fixed a real backend bug**: `POST /api/auth/login` never returned `email` in the `user` object (only `_id, name, role`) — this is why the mobile Profile screen's Email field was blank. Fixed in `server/controllers/authController.js`. Also added a mobile-side fallback (`emp.userId.email`) for already-cached sessions predating the fix.
- Redesigned `profile_screen.dart`: removed the avatar circle per request, moved the Active/Inactive status into the header card (removed the now-duplicate block from Employment Information), trimmed fields to match web's `employee-dashboard/profile` page exactly (dropped Marital Status/Work Location/Shift/Bank & Tax — those aren't shown on web).
- Overhauled `mobile/lib/widgets/app_drawer.dart`: every item now has a colored icon chip (thematically grouped — blue/green/purple/orange/teal/indigo/pink) instead of plain monochrome icons, across employee sections, admin sections, and the footer (Profile/Settings/Logout).

## 2026-09-17 (midday) IST — Mobile bug fixes + broad screen redesign
- Attendance screen: removed "Recent History" section, added a real static-map image (OpenStreetMap free static-map service, no new package) to the Location card, colorized the Check-In/Check-Out icon chips and Today's Summary rows to match web's colorful style.
- Leaves screen: removed the "Leave Balance" section; fixed the Submit Request UX (was giving one generic "fill in all fields" error) — now shows field-specific inline errors on the date pickers.
- Attendance Report screen: removed the "Request Regularization" bottom sheet/FAB entirely (deleted `_RegularizationSheet` class and related state); fixed cramped 3-column In/Out/Worked row alignment.
- Calendar screen: replaced the "All Events & Holidays" full list with a real month-grid calendar (custom-built, no new dependency) that defaults to today and filters events by tapped day.
- App-wide states: added `mobile/lib/widgets/skeleton_loader.dart` (shimmer skeletons) and `mobile/lib/widgets/state_views.dart` (`NetworkErrorView`/`ErrorView`/`EmptyStateView` + `buildErrorState()` helper that branches on a new `isNetworkError()` in `api_client.dart`).
- Added `mobile/lib/services/data_cache.dart` — a generic `DataCache<T>` + `DataCaches` registry (attendanceToday, attendanceMonthly, leavesList, tasksList, payslipHistory, employeeProfile, events), wired into `main.dart` via `MultiProvider`. Rolled stale-while-revalidate caching into Attendance, Attendance Report, Leaves, Tasks, Payslips, Profile, and Calendar screens so revisiting them from Home doesn't re-show a full loading spinner every time.

## 2026-09-17 (earlier) IST — Attendance/payroll/mobile parity work
See `MEMORY.md` §4/§5 for the settled engineering decisions from this phase (attendance status thresholds, lazy `isPastDate()` half-day resolution, mandatory Work Mode, removed self-service Attendance Corrections, payslip LOP-via-earnings-proration approach, mobile location tracking + break tracking, mobile login/home/payslips redesigns).

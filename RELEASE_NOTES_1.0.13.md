# Speshway HRMS — Version 1.0.13 (build 16)

Release date: 5 October 2026

## Play Store "What's new" (under 500 characters)

- Clearer Office / Home work mode picker before check-in
- Check Out button now easy to see in dark mode
- Break Times removed — breaks no longer affect your attendance
- New attendance rules: under 4 hrs Absent, 4–8 hrs Half Day, 8+ hrs Present
- Reminder at 5:45 PM if you forget to check out
- Bug fixes and improvements

## Full release notes

### Attendance screen
- **Work mode picker redesigned.** Before check-in, Office / Home is shown in a highlighted panel ("Where are you working today?") so it is the obvious first step. After check-in, the chosen mode shows as a locked green tag.
- **Check In / Check Out buttons.** Check In is solid green and Check Out is solid red, so both are clear in dark mode. The button is taller and easier to tap.
- **Break Times removed.** The Break Times card, Start/End Break buttons and the "Break Time" row in Today's Summary are gone. The "Break Time Recording" rule was removed from the home screen policy list.

### Attendance rules
| Hours worked (check-in to check-out) | Status |
|---|---|
| Less than 4 hours | Absent |
| 4 to 8 hours | Half Day |
| 8 hours or more | Present |

- Break time is never subtracted from working hours.
- The "Overtime" status has been removed; 8+ hours is simply Present.
- The same rules apply to Work from Home days.
- **Forgot to check out?** You get a reminder at **5:45 PM**. If you still don't check out that day, it is marked **Half Day**.
- Check-in and check-out reset automatically at **12:00 AM** each day.

### Web (speshwayhrms.com)
- Same work mode, break and attendance-rule changes as the app.
- Attendance page now fits phone screens properly (name no longer cut off).
- A **Back** button now appears below the top bar on every inner page.

## Notes for admins
- The server must be redeployed/restarted for the 5:45 PM reminder and new rules to take effect.
- Past records are re-evaluated with the new rules when viewed (old "Overtime" days now show Present).
- Existing break data is kept on the server but is no longer shown or used.

# Speshway HRMS — Version 1.0.20 (build 23)

Release date: 8 October 2026

## Play Store "What's new" (under 500 characters)

```
<en-US>
• Attach several files as work proof on a task
• Tap a task notification to open that task
• Screens update live when changes are made on the web
• Simpler Attendance screen: check-in and check-out locations fill in automatically
• Office check-in now needs your location
• Payslips: net pay in whole rupees, files named by month and name when shared
• Clearer confirmation before deleting all notifications
• Bug fixes and speed improvements
</en-US>
```

## Full release notes

### Tasks
- **Multiple work-proof files.** Attach up to 10 files (images, PDFs, documents; 10 MB each) as proof on a task. Team leads see "Work proof submitted (N files)" and can open each file.
- **Notifications open the task.** Tapping a task notification goes straight to that task.

### Live updates
- Changes made anywhere (web or another phone) now refresh open screens automatically — attendance, leaves, tasks, teams, payslips and more.
- After the phone was offline or the app was in the background, screens catch up on return.

### Attendance
- **Map removed.** The Current Location card is gone; your location is picked up silently and shown as the address under Check-in / Check-out Location.
- A "Location needed" prompt appears only when location is off or not allowed and you still need to check in or out.
- **Office check-in requires location.** Turn on location to check in from the office.
- Fixed the location loading forever on some phones.

### Payslips
- **Net pay is rounded to whole rupees** (e.g. ₹9,183.33 → ₹9,183) on the app, web and PDF. Stored amounts are unchanged.
- **Readable file names** when sharing or saving: `Payslip_Aug-2026_Ravi-Kumar_9617.pdf`.

### Notifications
- Redesigned "Delete all notifications" confirmation: shows how many will be deleted, with large Delete all / Cancel buttons.

### Web (speshwayhrms.com)
- Same live updates, payslip rounding and notification confirmation as the app.
- Payslip History: **View** opens the payslip on the page; Department column removed.
- Team tasks: every work-proof file has its own link.
- Payslip downloads and email attachments use the new file names.
- Browser notifications can be turned on from the bell.

## Notes for admins
- Redeploy the server (and run `npm install` for the new `@socket.io/mongo-adapter` package) for live updates across servers, office-location enforcement, payslip file names and rounding in PDFs.
- Release AAB: `mobile/build/app/outputs/bundle/release/app-release.aab` (version code 23 — higher than the last Play build 16 and the test APKs up to 22).

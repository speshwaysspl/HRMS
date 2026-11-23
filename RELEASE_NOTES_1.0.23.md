# Speshway HRMS — Version 1.0.23 (build 26)

Release date: 23 November 2026

## Play Store "What's new" (under 500 characters)

```
<en-US>
• Confirm before you check in or check out
• Salary breakdown now follows the company structure
• Payslips show Gross, Deductions and Net Pay clearly
• Deleted holidays no longer come back in the calendar
• Announcements: filter by Published or Scheduled, plus search
• Milestones show the latest on top
• Short Links for admin and HR
• Faster loading and bug fixes
</en-US>
```

## Full release notes

### Everyone
- **Check in / check out confirmation**: before marking attendance you now
  see the time, work mode, location and hours worked. Check-out warns that
  it is final for the day.
- **Payslips**: the salary list shows Gross, Deductions and Net Pay. It used
  to show Basic labelled as "Salary".
- **Salary structure**: breakdowns follow the company table: Basic 50% of
  gross, DA 25% of Basic, HRA 40% of Basic, Conveyance ₹1,600, Medical
  ₹1,250, Special the remainder.
- **Calendar**: a holiday deleted by admin/HR stays deleted.

### Admin / HR
- **Announcements**: All / Published / Scheduled filters with counts, search,
  and scheduled posts listed first. "Delete all" follows the selected filter.
- **Short Links**: create, copy, disable and delete secure short links from
  the menu, with click counts and expiry.
- **Payslip generator**: earnings are split from gross using the company
  structure. PF is entered manually.

### Fixes
- Milestones list the most recent first (latest closed on top, newest open
  on top).
- Team attendance loads with skeletons instead of spinners.
- Server security and speed improvements (permissions checked on the server,
  rate limiting, cached data, faster lists).

## Upload
- App bundle: `mobile/build/app/outputs/bundle/release/app-release.aab`
- Version code 26 · version name 1.0.23

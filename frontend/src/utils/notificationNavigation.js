export const NOTIFICATION_GROUPS = {
  Leave: ["leave_request", "leave_approved", "leave_rejected"],
  Task: ["task_assigned", "task_updated", "task_submitted"],
  Announcements: ["announcement", "holiday", "meeting", "event"],
  Feedback: ["feedback_submitted", "feedback_response"],
  Documents: [
    "candidate_created",
    "profile_completed",
    "documents_uploaded",
    "document_approved",
    "document_rejected",
    "verification_completed",
  ],
  Other: ["other"],
};

export const getNotificationTarget = (notification, user) => {
  if (!user || !user.role) return null;

  const userRoles = Array.isArray(user.role) ? user.role : [user.role];
  const isAdmin = userRoles.includes("admin");
  const isEmployee = userRoles.includes("employee");

  switch (notification.type) {
    case "checkout_reminder":
      return isEmployee ? "/employee-dashboard/attendance" : null;

    case "regularization_request":
      return isAdmin ? "/admin-dashboard/attendance-approvals" : null;

    case "regularization_approved":
    case "regularization_rejected":
      return isEmployee ? "/employee-dashboard/attendance-report" : null;

    case "leave_request":
    case "leave_approved":
    case "leave_rejected":
      if (isAdmin) return "/admin-dashboard/leaves";
      if (isEmployee) return `/employee-dashboard/leaves/${user._id}`;
      return null;

    case "holiday":
    case "meeting":
    case "event":
      if (isAdmin) return "/admin-dashboard/calendar";
      if (isEmployee) return "/employee-dashboard/calendar";
      return null;

    case "announcement":
      if (isAdmin) {
        return notification.relatedId
          ? `/admin-dashboard/announcements/${notification.relatedId}`
          : "/admin-dashboard/announcements";
      }
      if (isEmployee) {
        return notification.relatedId
          ? `/employee-dashboard/announcements/${notification.relatedId}`
          : "/employee-dashboard/announcements";
      }
      return null;

    case "task_assigned":
    case "task_updated":
      if (isEmployee) return "/employee-dashboard/tasks";
      return null;

    case "task_submitted":
      if (isAdmin) return "/admin-dashboard/teams";
      return "/employee-dashboard/tasks";

    case "feedback_submitted":
      if (isAdmin) return "/admin-dashboard/feedback";
      return null;

    case "feedback_response":
      if (isEmployee) return "/employee-dashboard/feedback";
      return null;

    default:
      if (isAdmin) return "/admin-dashboard";
      if (isEmployee) return "/employee-dashboard";
      return null;
  }
};

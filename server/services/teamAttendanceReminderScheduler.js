import cron from 'node-cron';
import Team from '../models/Team.js';
import TeamAttendance from '../models/TeamAttendance.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../controllers/notificationController.js';

const IST_MS = 5.5 * 3600 * 1000;

// Reminds team leads who haven't taken today's roll call for a team that has
// members. Runs on working days only: Saturday, Sunday and company holidays
// already count as present in the monthly sheet.
export const sendTeamAttendanceReminders = async (io) => {
  const nowIst = new Date(Date.now() + IST_MS);
  const today = nowIst.toISOString().slice(0, 10);
  const dow = nowIst.getUTCDay();
  if (dow === 0 || dow === 6) return 0;

  const dayStart = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) - IST_MS);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  if (await Event.exists({ type: 'holiday', date: { $gte: dayStart, $lt: dayEnd } })) return 0;

  const teams = await Team.find({ 'members.0': { $exists: true } }).select('name leadId');
  if (teams.length === 0) return 0;
  const marked = new Set(
    (await TeamAttendance.find({ date: today, teamId: { $in: teams.map((t) => t._id) } }).select('teamId'))
      .map((r) => String(r.teamId))
  );

  const sender = await User.findOne({ role: 'admin' }).select('_id');
  if (!sender) return 0;

  let sent = 0;
  for (const team of teams) {
    if (marked.has(String(team._id)) || !team.leadId) continue;
    // At most one reminder per team and lead per day.
    const already = await Notification.exists({
      type: 'team_attendance_reminder',
      recipientId: team.leadId,
      relatedId: team._id,
      createdAt: { $gte: dayStart },
    });
    if (already) continue;
    await createNotification({
      type: 'team_attendance_reminder',
      title: `Attendance not marked: ${team.name}`,
      message: `You haven't marked today's attendance for ${team.name}. Please mark attendance for your team members.`,
      recipientId: team.leadId,
      senderId: sender._id,
      relatedId: team._id,
    }, io);
    sent++;
  }
  return sent;
};

export const initializeTeamAttendanceReminderScheduler = (io) => {
  // Only when the lead has forgotten: 5:00 PM IST on weekdays.
  cron.schedule('0 17 * * 1-5', async () => {
    try {
      const n = await sendTeamAttendanceReminders(io);
      if (n) console.log(`📋 Team attendance reminders sent: ${n}`);
    } catch (error) {
      console.error('❌ Error in team attendance reminder job:', error);
    }
  }, { timezone: 'Asia/Kolkata' });
  console.log('✅ Team attendance reminder scheduler initialized - weekdays 5:00 PM IST');
};

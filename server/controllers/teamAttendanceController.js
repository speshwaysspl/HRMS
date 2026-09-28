import ExcelJS from "exceljs";
import Team from "../models/Team.js";
import TeamAttendance from "../models/TeamAttendance.js";
import Event from "../models/Event.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const IST_MS = 5.5 * 3600 * 1000;

// Admin, or the lead of this team.
const loadTeamForLead = async (req, res) => {
  const team = await Team.findById(req.params.id).populate({
    path: "members.employeeId",
    select: "userId employeeId",
    populate: { path: "userId", select: "name" },
  });
  if (!team) {
    res.status(404).json({ success: false, error: "Team not found" });
    return null;
  }
  const roles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
  const isLead = team.leadId.toString() === req.user._id.toString();
  if (!roles.includes("admin") && !isLead) {
    res.status(403).json({ success: false, error: "Only the team lead can manage team attendance" });
    return null;
  }
  return team;
};

const memberIds = (team) =>
  team.members.filter((m) => m.employeeId).map((m) => m.employeeId._id.toString());

// GET /api/team/:id/attendance?date=YYYY-MM-DD
export const getTeamAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    if (!DATE_RE.test(date || "")) return res.status(400).json({ success: false, error: "Invalid date" });
    const team = await loadTeamForLead(req, res);
    if (!team) return;
    const record = await TeamAttendance.findOne({ teamId: team._id, date });
    res.json({
      success: true,
      marked: !!record,
      present: record ? record.present.map(String) : [],
      absent: record ? record.absent.map(String) : [],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/team/:id/attendance  { date, present: [employeeObjectId] }
export const saveTeamAttendance = async (req, res) => {
  try {
    const { date, present } = req.body;
    if (!DATE_RE.test(date || "")) return res.status(400).json({ success: false, error: "Invalid date" });
    if (!Array.isArray(present)) return res.status(400).json({ success: false, error: "present must be an array" });
    const team = await loadTeamForLead(req, res);
    if (!team) return;

    const ids = memberIds(team);
    const presentSet = new Set(present.map(String).filter((p) => ids.includes(p)));
    const record = await TeamAttendance.findOneAndUpdate(
      { teamId: team._id, date },
      {
        present: [...presentSet],
        absent: ids.filter((i) => !presentSet.has(i)),
        markedBy: req.user._id,
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, present: record.present.map(String), absent: record.absent.map(String) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const pad = (n) => String(n).padStart(2, "0");
const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const YELLOW = "FFFFFF00", CYAN = "FF00FFFF", GREEN = "FF6AA84F", RED = "FFFF0000";
const thin = { style: "thin", color: { argb: "FFBFBFBF" } };
const border = { top: thin, left: thin, bottom: thin, right: thin };

// Builds the monthly register workbook: one header row, then a yellow banner +
// member rows per team (the company's "attendance and performance sheet" layout).
const buildWorkbook = async (teams, month) => {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const lastCol = days + 3; // name + days + present + absent
  const monthLabel = new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  const records = await TeamAttendance.find({
    teamId: { $in: teams.map((t) => t._id) },
    date: { $regex: `^${month}-` },
  });
  const byTeamDate = new Map(records.map((r) => [`${r.teamId}|${r.date}`, r]));

  // Company holidays (Event type "holiday") in this month, keyed by IST day number.
  const holidayDays = new Set(
    (
      await Event.find({
        type: "holiday",
        date: { $gte: new Date(Date.UTC(y, m - 1, 1) - IST_MS), $lt: new Date(Date.UTC(y, m, 1) - IST_MS) },
      }).select("date")
    ).map((e) => new Date(e.date.getTime() + IST_MS).getUTCDate())
  );

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(monthLabel, { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
  ws.getColumn(1).width = 34;
  for (let c = 2; c <= days + 1; c++) ws.getColumn(c).width = 13;
  ws.getColumn(days + 2).width = 10;
  ws.getColumn(days + 3).width = 10;

  const header = ws.getRow(1);
  header.values = [
    "NAME OF THE EMPLOYEE",
    ...Array.from({ length: days }, (_, i) => `${pad(i + 1)}-${pad(m)}-${y}`),
    "PRESENT",
    "ABSENT",
  ];
  header.height = 22;
  header.eachCell((cell) => {
    cell.fill = fill(YELLOW);
    cell.font = { bold: true, name: "Times New Roman", size: 12 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = border;
  });

  for (const team of teams) {
    ws.addRow([]);
    // Banner: whole row yellow; name centred over the first date columns (right of the
    // frozen name column) so it stays on screen, like the reference sheet.
    const banner = ws.addRow([]);
    banner.height = 28;
    for (let c = 1; c <= lastCol; c++) banner.getCell(c).fill = fill(YELLOW);
    const span = Math.min(8, lastCol);
    ws.mergeCells(banner.number, 2, banner.number, span);
    const title = banner.getCell(2);
    title.value = `${team.name.toUpperCase()}  -  ${monthLabel.toUpperCase()}`;
    title.font = { size: 16 };
    title.alignment = { horizontal: "center", vertical: "middle" };
    ws.addRow([]);

    for (const mem of team.members) {
      const emp = mem.employeeId;
      if (!emp) continue;
      const id = emp._id.toString();
      let present = 0, absent = 0;
      const cells = [];
      for (let d = 1; d <= days; d++) {
        const dow = new Date(y, m - 1, d).getDay();
        const rec = byTeamDate.get(`${team._id}|${month}-${pad(d)}`);
        const isAbsent = rec?.absent.some((x) => x.toString() === id);
        const isPresent = rec?.present.some((x) => x.toString() === id);
        // Weekends and holidays count as present unless explicitly marked absent.
        if (isAbsent) { cells.push(["ABSENT", RED]); absent++; }
        else if (dow === 6) { cells.push(["SATURDAY", CYAN]); present++; }
        else if (dow === 0) { cells.push(["SUNDAY", CYAN]); present++; }
        else if (holidayDays.has(d)) { cells.push(["HOLIDAY", GREEN]); present++; }
        else if (isPresent) { cells.push(["PRESENT", null]); present++; }
        else cells.push(["", null]);
      }
      const row = ws.addRow([emp.userId?.name?.toUpperCase() || "-", ...cells.map((c) => c[0]), present, absent]);
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = border;
        cell.font = { name: "Times New Roman", size: 10, bold: col === 1 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        const bg = cells[col - 2]?.[1];
        if (bg) cell.fill = fill(bg);
      });
    }
  }
  return wb;
};

const sendWorkbook = async (res, wb, filename) => {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
};

// GET /api/team/:id/attendance/export?month=YYYY-MM  -> .xlsx for one team
export const exportTeamAttendance = async (req, res) => {
  try {
    const { month } = req.query;
    if (!MONTH_RE.test(month || "")) return res.status(400).json({ success: false, error: "Invalid month" });
    const team = await loadTeamForLead(req, res);
    if (!team) return;
    const wb = await buildWorkbook([team], month);
    await sendWorkbook(res, wb, `${team.name.replace(/[^\w-]+/g, "_")}_attendance_${month}.xlsx`);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/team/attendance/export?month=YYYY-MM  -> .xlsx for every team:
// admin gets all teams, a team lead gets the teams they lead.
export const exportAllTeamsAttendance = async (req, res) => {
  try {
    const { month } = req.query;
    if (!MONTH_RE.test(month || "")) return res.status(400).json({ success: false, error: "Invalid month" });
    const roles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const filter = roles.includes("admin") ? {} : { leadId: req.user._id };
    const teams = await Team.find(filter)
      .sort({ name: 1 })
      .populate({
        path: "members.employeeId",
        select: "userId employeeId",
        populate: { path: "userId", select: "name" },
      });
    if (teams.length === 0) return res.status(404).json({ success: false, error: "No teams found" });
    const wb = await buildWorkbook(teams, month);
    await sendWorkbook(res, wb, `all_teams_attendance_${month}.xlsx`);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

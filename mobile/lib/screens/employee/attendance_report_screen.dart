import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../main.dart';
import '../../services/api_client.dart';
import '../../services/attendance_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/attendance_calendar.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/summary_card.dart';
import '../../widgets/hrms_app_bar.dart';

class AttendanceReportScreen extends StatefulWidget {
  const AttendanceReportScreen({super.key});

  @override
  State<AttendanceReportScreen> createState() => _AttendanceReportScreenState();
}

class _AttendanceReportScreenState extends State<AttendanceReportScreen> {
  final _service = AttendanceService();
  DateTime _currentMonth = DateTime.now();
  List<Map<String, dynamic>> _monthlyLogs = [];
  bool _loading = true;
  String? _error;
  Object? _lastError;

  @override
  void initState() {
    super.initState();
    final cache = AppCaches.of(context).attendanceMonthly;
    if (cache.hasData) {
      _monthlyLogs = cache.data!;
      _loading = false;
      _load(silent: true);
    } else {
      _load();
    }
  }

  String get _monthKey => DateFormat('yyyy-MM').format(_currentMonth);

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
        _lastError = null;
      });
    }
    try {
      final logs = await _service.getMonthly(_monthKey);
      if (!mounted) return;
      logs.sort((a, b) => (b['date'] ?? '').toString().compareTo((a['date'] ?? '').toString()));
      AppCaches.of(context).attendanceMonthly.set(logs);
      setState(() {
        _monthlyLogs = logs;
        _loading = false;
        _error = null;
        _lastError = null;
      });
    } catch (e) {
      if (!mounted) return;
      if (silent && _monthlyLogs.isNotEmpty) return;
      setState(() {
        _error = extractErrorMessage(e);
        _lastError = e;
        _loading = false;
      });
    }
  }

  void _prevMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month - 1, 1);
    });
    _load();
  }

  void _nextMonth() {
    final next = DateTime(_currentMonth.year, _currentMonth.month + 1, 1);
    final now = DateTime.now();
    if (next.isAfter(DateTime(now.year, now.month, 1))) return;
    setState(() {
      _currentMonth = next;
    });
    _load();
  }

  // Calculate working hours in "Xh Ym"
  String _calcDuration(String? inTime, String? outTime) {
    if (inTime == null || outTime == null || inTime.isEmpty || outTime.isEmpty) {
      return '--';
    }
    try {
      final inParts = inTime.split(':').map(int.parse).toList();
      final outParts = outTime.split(':').map(int.parse).toList();
      int totalMinutes = (outParts[0] * 60 + outParts[1]) - (inParts[0] * 60 + inParts[1]);
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      final h = totalMinutes ~/ 60;
      final m = totalMinutes % 60;
      return '${h}h ${m}m';
    } catch (_) {
      return '--';
    }
  }

  @override
  Widget build(BuildContext context) {
    final presentCount = _monthlyLogs.where((l) {
      final s = (l['status'] ?? '').toString().toLowerCase();
      return s.contains('present');
    }).length;

    final absentCount = _monthlyLogs.where((l) {
      final s = (l['status'] ?? '').toString().toLowerCase();
      return s.contains('absent') || s == 'leave';
    }).length;

    final halfDayCount = _monthlyLogs.where((l) {
      final s = (l['status'] ?? '').toString().toLowerCase();
      return s.contains('half');
    }).length;

    final wfhCount = _monthlyLogs.where((l) {
      final m = (l['workMode'] ?? '').toString().toLowerCase();
      final s = (l['status'] ?? '').toString().toLowerCase();
      return m.contains('wfh') || m.contains('home') || s.contains('home');
    }).length;

    final canGoNext = !DateTime(_currentMonth.year, _currentMonth.month + 1, 1)
        .isAfter(DateTime(DateTime.now().year, DateTime.now().month, 1));

    final cardW = (context.screenW - context.w(32) - context.w(10)) / context.gridColumns();
    final cardH = context.r(44) + context.h(40);

    return Scaffold(
      appBar: HrmsAppBar(
        title: const Text('Attendance Report'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: EdgeInsets.all(context.w(16)),
          children: [
            // Month Selector Bar
            Container(
              padding: EdgeInsets.symmetric(horizontal: context.w(12), vertical: context.h(8)),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(color: AppColors.surfaceSubtle),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: _prevMonth,
                    tooltip: 'Previous Month',
                  ),
                  Row(
                    children: [
                      Icon(Icons.calendar_month, color: AppColors.brand600, size: context.r(20)),
                      SizedBox(width: context.w(8)),
                      Text(
                        DateFormat('MMMM yyyy').format(_currentMonth),
                        style: TextStyle(
                          fontSize: context.sp(16),
                          fontWeight: FontWeight.w700,
                          color: AppColors.ink,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: Icon(Icons.chevron_right, color: canGoNext ? AppColors.ink : AppColors.inkFaint),
                    onPressed: canGoNext ? _nextMonth : null,
                    tooltip: 'Next Month',
                  ),
                ],
              ),
            ),
            SizedBox(height: context.h(16)),

            if (_loading)
              Column(
                children: [
                  SkeletonCard(height: context.h(90)),
                  SizedBox(height: context.h(10)),
                  const SkeletonListTile(),
                  const SkeletonListTile(),
                  const SkeletonListTile(),
                ],
              )
            else if (_error != null)
              buildErrorState(_lastError ?? _error!, _load)
            else ...[
              // Summary Metrics Grid
              GridView.count(
                crossAxisCount: context.gridColumns(),
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: context.h(10),
                crossAxisSpacing: context.w(10),
                childAspectRatio: cardW / cardH,
                children: [
                  SummaryCard(
                    icon: Icons.check_circle_outline,
                    label: 'Present Days',
                    value: '$presentCount',
                    iconColor: AppColors.accent600,
                    iconBg: AppColors.accent50,
                  ),
                  SummaryCard(
                    icon: Icons.cancel_outlined,
                    label: 'Absent / Leaves',
                    value: '$absentCount',
                    iconColor: AppColors.danger,
                    iconBg: AppColors.dangerBg,
                  ),
                  SummaryCard(
                    icon: Icons.timelapse,
                    label: 'Half Days',
                    value: '$halfDayCount',
                    iconColor: AppColors.warning,
                    iconBg: AppColors.warningBg,
                  ),
                  SummaryCard(
                    icon: Icons.home_work_outlined,
                    label: 'WFH Days',
                    value: '$wfhCount',
                    iconColor: AppColors.brand500,
                    iconBg: AppColors.brand50,
                  ),
                ],
              ),
              SizedBox(height: context.h(20)),
              AttendanceCalendar(
                key: ValueKey(_monthKey),
                month: _currentMonth,
                days: _monthlyLogs,
                onChanged: () => _load(silent: true),
              ),
              SizedBox(height: context.h(20)),

              // Monthly Attendance Logs Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Daily Attendance Logs',
                    style: TextStyle(fontSize: context.sp(15), fontWeight: FontWeight.w700, color: AppColors.ink),
                  ),
                  Text(
                    '${_monthlyLogs.length} Records',
                    style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted),
                  ),
                ],
              ),
              SizedBox(height: context.h(10)),

              if (_monthlyLogs.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: EmptyStateView(icon: Icons.event_note, title: 'No records for this month', subtitle: 'Attendance logs will appear here once marked.'),
                )
              else
                ..._monthlyLogs.map((log) => _buildDayTile(log)),

              SizedBox(height: context.h(80)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDayTile(Map<String, dynamic> log) {
    String formattedDate = '';
    try {
      final dt = DateTime.parse(log['date'].toString());
      formattedDate = DateFormat('EEE, d MMM yyyy').format(dt);
    } catch (_) {
      formattedDate = log['date']?.toString() ?? '';
    }

    final inTime = log['inTime']?.toString() ?? '--:--';
    final outTime = log['outTime']?.toString() ?? '--:--';
    final status = log['status']?.toString() ?? 'Not Marked';
    final workMode = (log['workMode'] ?? 'office').toString();
    final duration = _calcDuration(log['inTime']?.toString(), log['outTime']?.toString());
    final breaks = (log['breaks'] as List?)?.length ?? 0;

    return SimpleCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  formattedDate,
                  style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink, fontSize: context.sp(14)),
                ),
              ),
              StatusPill(label: status),
            ],
          ),
          SizedBox(height: context.h(12)),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _logStat(Icons.login_rounded, AppColors.accent600, AppColors.accent50, 'In Time', inTime),
              ),
              Expanded(
                child: _logStat(Icons.logout_rounded, AppColors.danger, AppColors.dangerBg, 'Out Time', outTime),
              ),
              Expanded(
                child: _logStat(Icons.access_time_filled_rounded, Color(0xFF2563EB), AppColors.tint(AppColors.tint(const Color(0xFFDBEAFE))), 'Worked', duration),
              ),
            ],
          ),
          SizedBox(height: context.h(8)),
          Row(
            children: [
              Icon(
                workMode.toLowerCase().contains('wfh') || workMode.toLowerCase().contains('home')
                    ? Icons.home_work_outlined
                    : Icons.business_outlined,
                size: context.r(14),
                color: AppColors.inkMuted,
              ),
              SizedBox(width: context.w(4)),
              Text(
                workMode.toUpperCase(),
                style: TextStyle(fontSize: context.sp(11), color: AppColors.inkMuted, fontWeight: FontWeight.w600),
              ),
              if (breaks > 0) ...[
                SizedBox(width: context.w(12)),
                Icon(Icons.coffee_outlined, size: context.r(14), color: AppColors.warning),
                SizedBox(width: context.w(4)),
                Text('$breaks ${breaks == 1 ? 'Break' : 'Breaks'}', style: TextStyle(fontSize: context.sp(11), color: AppColors.warning)),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _logStat(IconData icon, Color color, Color bg, String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: context.r(26),
          height: context.r(26),
          decoration: BoxDecoration(color: AppColors.tint(bg), shape: BoxShape.circle),
          child: Icon(icon, size: context.r(14), color: color),
        ),
        SizedBox(height: context.h(6)),
        Text(label, style: TextStyle(fontSize: context.sp(11), color: AppColors.inkFaint)),
        Text(
          value,
          style: TextStyle(fontSize: context.sp(13), fontWeight: FontWeight.w600, color: AppColors.ink),
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}

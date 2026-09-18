import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../services/announcement_service.dart';
import '../../services/api_client.dart';
import '../../services/app_events.dart';
import '../../services/auth_provider.dart';
import '../../services/dashboard_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../utils/greeting_utils.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/marquee_app_bar_title.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import 'announcements_screen.dart';
import 'notifications_screen.dart';
import 'payslips_screen.dart';

class EmployeeHomeScreen extends StatefulWidget {
  const EmployeeHomeScreen({super.key});

  @override
  State<EmployeeHomeScreen> createState() => _EmployeeHomeScreenState();
}

class _EmployeeHomeScreenState extends State<EmployeeHomeScreen> {
  final _service = DashboardService();
  final _announcementService = AnnouncementService();

  Map<String, dynamic>? _stats;
  List<Map<String, dynamic>> _announcements = [];
  bool _loading = true;
  String? _error;
  Object? _lastError;

  @override
  void initState() {
    super.initState();
    _load();
    AppEvents.attendanceChanged.addListener(_load);
    AppEvents.leaveChanged.addListener(_load);
  }

  @override
  void dispose() {
    AppEvents.attendanceChanged.removeListener(_load);
    AppEvents.leaveChanged.removeListener(_load);
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _service.getEmployeeStats(),
        _announcementService.getAnnouncements().catchError((_) => <Map<String, dynamic>>[]),
      ]);

      if (!mounted) return;
      setState(() {
        _stats = results[0] as Map<String, dynamic>?;
        _announcements = (results[1] as List).cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = extractErrorMessage(e);
        _lastError = e;
        _loading = false;
      });
    }
  }

  void _openPayslips(String? employeeCode) {
    if (employeeCode != null && employeeCode.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => PayslipsScreen(employeeCode: employeeCode)),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Employee code not found for payslips.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final employee = _stats?['employee'] as Map<String, dynamic>? ?? {};
    final greeting = GreetingUtils.getISTGreeting();
    final motivationalMsg = GreetingUtils.getEmployeeDailyMessage(
      department: employee['department']?.toString(),
      employeeId: employee['employeeId']?.toString(),
      userId: employee['userId']?.toString(),
    );

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: PreferredSize(
        preferredSize: Size.fromHeight(context.h(176)),
        child: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          flexibleSpace: ClipRRect(
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(22),
              bottomRight: Radius.circular(22),
            ),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.asset(
                  'assets/appbar_bg.png',
                  fit: BoxFit.cover,
                ),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      stops: const [0.0, 0.45, 1.0],
                      colors: [
                        Colors.black.withValues(alpha: 0.35),
                        AppColors.brand900.withValues(alpha: 0.55),
                        AppColors.brand950.withValues(alpha: 0.82),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.only(
              bottomLeft: Radius.circular(22),
              bottomRight: Radius.circular(22),
            ),
          ),
          title: const MarqueeAppBarTitle(),
          centerTitle: false,
          actions: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  tooltip: 'Notifications',
                  icon: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 24),
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                    );
                  },
                ),
                Positioned(
                  top: context.h(10),
                  right: context.w(11),
                  child: Container(
                    width: context.r(8),
                    height: context.r(8),
                    decoration: const BoxDecoration(
                      color: Color(0xFFEF4444),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(width: context.w(4)),
          ],
          bottom: PreferredSize(
            preferredSize: Size.fromHeight(context.h(120)),
            child: _buildHeaderGreeting(
              name: user?.name ?? '',
              employee: employee,
              greeting: greeting,
              motivationalMsg: motivationalMsg,
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? _buildSkeleton()
            : _error != null
                ? buildErrorState(_lastError ?? _error!, _load)
                : _buildContent(),
      ),
    );
  }

  Widget _buildSkeleton() {
    final pad = context.w(16);
    return ScrollConfiguration(
      behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
      child: ListView(
        padding: EdgeInsets.fromLTRB(pad, context.h(16), pad, pad),
        children: [
          SkeletonCard(height: context.h(90)),
          SizedBox(height: context.h(20)),
          SkeletonCard(height: context.h(220)),
          SizedBox(height: context.h(20)),
          SkeletonCard(height: context.h(100)),
        ],
      ),
    );
  }

  Widget _buildHeaderGreeting({
    required String name,
    required Map<String, dynamic> employee,
    required String greeting,
    required String motivationalMsg,
  }) {
    final designation = employee['designation']?.toString().trim();
    final department = employee['department']?.toString().trim();
    final roleSub = (designation != null && designation.isNotEmpty)
        ? '$designation${(department != null && department.isNotEmpty) ? ' · $department' : ''}'
        : 'Senior Java Developer · Engineering';

    final todayFormatted = DateFormat('EEE, d MMM yyyy').format(DateTime.now());
    const textShadow = [Shadow(color: Colors.black45, blurRadius: 6, offset: Offset(0, 1))];

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(context.w(16), 0, context.w(16), context.h(12)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left: Greeting, Employee Name, Role
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$greeting,',
                      style: TextStyle(
                        fontSize: context.sp(12.5),
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.2,
                        shadows: textShadow,
                      ),
                    ),
                    SizedBox(height: context.h(1)),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            name.isNotEmpty ? name : 'Charan',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: context.sp(20),
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: 0.2,
                              shadows: textShadow,
                            ),
                          ),
                        ),
                        SizedBox(width: context.w(6)),
                        Text(
                          '👋',
                          style: TextStyle(fontSize: context.sp(15)),
                        ),
                      ],
                    ),
                    SizedBox(height: context.h(2)),
                    Text(
                      roleSub,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: context.sp(11.5),
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w400,
                        shadows: textShadow,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: context.w(8)),
              // Right: Date only.
              Text(
                todayFormatted,
                style: TextStyle(
                  fontSize: context.sp(11.5),
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  letterSpacing: 0.2,
                  shadows: textShadow,
                ),
              ),
            ],
          ),
          SizedBox(height: context.h(10)),
          // Quotation Pill - Frosted dark/translucent pill with green leaf icon
          Container(
            padding: EdgeInsets.symmetric(
              horizontal: context.w(10),
              vertical: context.h(5),
            ),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(context.r(20)),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.18),
                width: 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.eco_rounded,
                  color: const Color(0xFF4ADE80),
                  size: context.r(16),
                ),
                SizedBox(width: context.w(6)),
                Flexible(
                  child: Text(
                    '“$motivationalMsg”',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.95),
                      fontSize: context.sp(11),
                      fontStyle: FontStyle.italic,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    final today = _stats?['todayAttendance'] as Map<String, dynamic>? ?? {};
    final employee = _stats?['employee'] as Map<String, dynamic>? ?? {};

    final pad = context.w(16);
    final gap = context.h(20);

    return ScrollConfiguration(
      behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
      child: ListView(
        padding: EdgeInsets.fromLTRB(pad, context.h(16), pad, pad),
        children: [
          // 1. Quick Actions Section (No "View All")
          _buildQuickActionsHeader(),
          SizedBox(height: context.h(10)),
          _buildQuickActionsGrid(employee),
          SizedBox(height: gap),

          // 2. Today's Attendance Section
          _buildTodayAttendanceCard(today),
          SizedBox(height: gap),

          // 3. Recent Announcements Section (Fetched directly from DB, No "View All")
          _buildRecentAnnouncementsHeader(),
          SizedBox(height: context.h(10)),
          _buildRecentAnnouncementCard(),
          SizedBox(height: gap),

          // 4. Attendance & Work Policy Section
          Row(
            children: [
              Icon(Icons.assignment_outlined, color: AppColors.brand600, size: context.r(20)),
              SizedBox(width: context.w(6)),
              Text(
                'Attendance & Work Policy',
                style: TextStyle(
                  fontSize: context.sp(16),
                  fontWeight: FontWeight.w700,
                  color: AppColors.ink,
                ),
              ),
            ],
          ),
          SizedBox(height: context.h(4)),
          Text(
            'Important guidelines for smooth operations',
            style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted),
          ),
          SizedBox(height: context.h(10)),
          _buildPolicyGuidance(),

          SizedBox(height: context.h(24)),
        ],
      ),
    );
  }

  // ---------------- Quick Actions (No "View All", Perfectly Proportioned) ----------------
  Widget _buildQuickActionsHeader() {
    return Row(
      children: [
        Icon(Icons.bolt_rounded, color: const Color(0xFF0F172A), size: context.r(20)),
        SizedBox(width: context.w(6)),
        Text(
          'Quick Actions',
          style: TextStyle(
            fontSize: context.sp(16.5),
            fontWeight: FontWeight.w800,
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  // 2x2 grid instead of 4-across — each card gets roughly double the width,
  // so the title/subtitle read at a normal size instead of being
  // FittedBox-shrunk down to near-illegible text.
  Widget _buildQuickActionsGrid(Map<String, dynamic> employee) {
    return Column(
      children: [
        Row(
          children: [
            _buildQuickActionCard(
              title: 'Apply Leave',
              subtitle: 'Request time off',
              icon: Icons.calendar_month_rounded,
              iconColor: const Color(0xFF16A34A),
              iconBg: const Color(0xFFDCFCE7),
              gradientColors: [const Color(0xFFF0FDF4), Colors.white],
              borderColor: const Color(0xFFDCFCE7),
              onTap: () => AppEvents.switchToTab(0),
            ),
            SizedBox(width: context.w(10)),
            _buildQuickActionCard(
              title: 'View Payslip',
              subtitle: 'Monthly records',
              icon: Icons.article_rounded,
              iconColor: const Color(0xFF2563EB),
              iconBg: const Color(0xFFDBEAFE),
              gradientColors: [const Color(0xFFEFF6FF), Colors.white],
              borderColor: const Color(0xFFDBEAFE),
              onTap: () => _openPayslips(employee['employeeId']?.toString()),
            ),
          ],
        ),
        SizedBox(height: context.h(10)),
        Row(
          children: [
            _buildQuickActionCard(
              title: 'Mark Attendance',
              subtitle: 'Punch In / Out',
              icon: Icons.access_time_filled_rounded,
              iconColor: const Color(0xFFEA580C),
              iconBg: const Color(0xFFFFEDD5),
              gradientColors: [const Color(0xFFFFF7ED), Colors.white],
              borderColor: const Color(0xFFFFEDD5),
              onTap: () => AppEvents.switchToTab(1),
            ),
            SizedBox(width: context.w(10)),
            _buildQuickActionCard(
              title: 'My Profile',
              subtitle: 'Personal details',
              icon: Icons.person_rounded,
              iconColor: const Color(0xFF9333EA),
              iconBg: const Color(0xFFF3E8FF),
              gradientColors: [const Color(0xFFFAF5FF), Colors.white],
              borderColor: const Color(0xFFF3E8FF),
              onTap: () => AppEvents.switchToTab(4),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required List<Color> gradientColors,
    required Color borderColor,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(context.r(16)),
          child: Container(
            padding: EdgeInsets.all(context.w(14)),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: gradientColors,
              ),
              borderRadius: BorderRadius.circular(context.r(16)),
              border: Border.all(color: borderColor, width: 1.2),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon (left) + chevron (right), aligned on one row.
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      width: context.r(34),
                      height: context.r(34),
                      decoration: BoxDecoration(
                        color: iconBg,
                        borderRadius: BorderRadius.circular(context.r(9)),
                      ),
                      child: Center(
                        child: Icon(icon, color: iconColor, size: context.r(18)),
                      ),
                    ),
                    Container(
                      width: context.r(22),
                      height: context.r(22),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Icon(
                          Icons.chevron_right_rounded,
                          color: iconColor,
                          size: context.r(14),
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: context.h(12)),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: context.sp(14),
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                    height: 1.2,
                  ),
                ),
                SizedBox(height: context.h(3)),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: context.sp(11.5),
                    fontWeight: FontWeight.w400,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ---------------- Today's Attendance ----------------
  Widget _buildTodayAttendanceCard(Map<String, dynamic> today) {
    // Working hours computation from inTime and outTime span (matches web AttendanceReport)
    double workingHours = 0.0;
    if (today['inTime'] != null && today['inTime'].toString().trim().isNotEmpty) {
      try {
        final inTime = _parseTime(today['inTime'].toString());
        if (inTime != null) {
          final outTime = (today['outTime'] != null && today['outTime'].toString().trim().isNotEmpty)
              ? _parseTime(today['outTime'].toString())
              : DateTime.now();
          if (outTime != null) {
            final diff = outTime.difference(inTime);
            if (!diff.isNegative) {
              workingHours = diff.inMinutes / 60.0;
            }
          }
        }
      } catch (_) {}
    } else if (today['workingHours'] is num) {
      workingHours = (today['workingHours'] as num).toDouble();
    }

    final double workedProgress = (workingHours / 8.0).clamp(0.0, 1.0);
    final double displayGaugeProgress = workingHours > 0 && workedProgress < 0.08 ? 0.08 : workedProgress;
    final String workedDurationText = _formatWorkedHours(workingHours);

    // Determine status exactly matching web AttendanceReport
    final serverStatus = today['status']?.toString().trim();
    String statusText;
    Color statusTextColor;
    Color statusBgColor;
    Color statusBorderColor;

    final norm = (serverStatus ?? '').toLowerCase();
    if (norm.contains('overtime')) {
      statusText = 'Present + Overtime';
      statusTextColor = const Color(0xFF16A34A);
      statusBgColor = const Color(0xFFDCFCE7);
      statusBorderColor = const Color(0xFFA7F3D0);
    } else if (norm.contains('present') && !norm.contains('absent')) {
      statusText = 'Present';
      statusTextColor = const Color(0xFF16A34A);
      statusBgColor = const Color(0xFFDCFCE7);
      statusBorderColor = const Color(0xFFA7F3D0);
    } else if (norm.contains('half')) {
      statusText = 'Half Day';
      statusTextColor = const Color(0xFFD97706);
      statusBgColor = const Color(0xFFFEF3C7);
      statusBorderColor = const Color(0xFFFDE68A);
    } else if (norm.contains('leave') || norm.contains('wfh')) {
      statusText = norm.contains('wfh') ? 'WFH' : 'On Leave';
      statusTextColor = const Color(0xFF2563EB);
      statusBgColor = const Color(0xFFEFF6FF);
      statusBorderColor = const Color(0xFFBFDBFE);
    } else if (norm == 'checked in' || (today['inTime'] != null && (today['outTime'] == null || today['outTime'].toString().isEmpty))) {
      statusText = 'Checked In';
      statusTextColor = const Color(0xFF0D9488);
      statusBgColor = const Color(0xFFCCFBF1);
      statusBorderColor = const Color(0xFF99F6E4);
    } else if (norm.contains('absent') || (today['inTime'] != null && today['outTime'] != null && workingHours < 4.0)) {
      // Under 4 hours is treated as Absent per company policy & web dashboard
      statusText = 'Absent';
      statusTextColor = const Color(0xFFDC2626);
      statusBgColor = const Color(0xFFFEF2F2);
      statusBorderColor = const Color(0xFFFECACA);
    } else {
      statusText = serverStatus != null && serverStatus.isNotEmpty ? serverStatus : 'Not Marked';
      statusTextColor = const Color(0xFF64748B);
      statusBgColor = const Color(0xFFF1F5F9);
      statusBorderColor = const Color(0xFFE2E8F0);
    }

    return Container(
      padding: EdgeInsets.all(context.w(16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(context.r(20)),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row with title & status pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.calendar_today_rounded, color: const Color(0xFF0F172A), size: context.r(19)),
                  SizedBox(width: context.w(8)),
                  Text(
                    "Today's Attendance",
                    style: TextStyle(
                      fontSize: context.sp(16.5),
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: context.w(10), vertical: context.h(4)),
                decoration: BoxDecoration(
                  color: statusBgColor,
                  borderRadius: BorderRadius.circular(context.r(20)),
                  border: Border.all(
                    color: statusBorderColor,
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: context.r(6),
                      height: context.r(6),
                      decoration: BoxDecoration(
                        color: statusTextColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    SizedBox(width: context.w(5)),
                    Text(
                      statusText,
                      style: TextStyle(
                        fontSize: context.sp(11.5),
                        fontWeight: FontWeight.w700,
                        color: statusTextColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: context.h(4)),
          Text(
            DateFormat('EEEE, d MMMM yyyy').format(DateTime.now()),
            style: TextStyle(
              fontSize: context.sp(12.5),
              fontWeight: FontWeight.w500,
              color: const Color(0xFF64748B),
            ),
          ),
          SizedBox(height: context.h(14)),

          // Metrics row (Check In box, Check Out box, Circular Gauge)
          Row(
            children: [
              // Check In Box
              Expanded(
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: context.w(8), vertical: context.h(8)),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(context.r(12)),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: context.r(34),
                        height: context.r(34),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(context.r(9)),
                        ),
                        child: Center(
                          child: Icon(Icons.login_rounded, color: const Color(0xFF16A34A), size: context.r(18)),
                        ),
                      ),
                      SizedBox(width: context.w(8)),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Check In',
                              style: TextStyle(
                                fontSize: context.sp(10.5),
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                            SizedBox(height: context.h(2)),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                _formatTimeDisplay(today['inTime']),
                                style: TextStyle(
                                  fontSize: context.sp(14),
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: context.w(4)),
                child: Container(width: 1, height: context.h(36), color: const Color(0xFFE2E8F0)),
              ),
              // Check Out Box
              Expanded(
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: context.w(8), vertical: context.h(8)),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(context.r(12)),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: context.r(34),
                        height: context.r(34),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(context.r(9)),
                        ),
                        child: Center(
                          child: Icon(Icons.logout_rounded, color: const Color(0xFFEF4444), size: context.r(18)),
                        ),
                      ),
                      SizedBox(width: context.w(8)),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Check Out',
                              style: TextStyle(
                                fontSize: context.sp(10.5),
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                            SizedBox(height: context.h(2)),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                _formatTimeDisplay(today['outTime']),
                                style: TextStyle(
                                  fontSize: context.sp(14),
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(width: context.w(6)),
              // Circular Hours Worked Gauge
              SizedBox(
                width: context.r(66),
                height: context.r(66),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: context.r(62),
                      height: context.r(62),
                      child: CircularProgressIndicator(
                        value: displayGaugeProgress,
                        backgroundColor: const Color(0xFFE2E8F0),
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF0D9488)),
                        strokeWidth: context.r(6),
                        strokeCap: StrokeCap.round,
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          workedDurationText,
                          style: TextStyle(
                            fontSize: context.sp(11.5),
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        Text(
                          'Worked',
                          style: TextStyle(
                            fontSize: context.sp(9),
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: context.h(14)),

          // Full-width Deep Emerald Button
          Material(
            color: const Color(0xFF064E3B),
            borderRadius: BorderRadius.circular(context.r(14)),
            child: InkWell(
              onTap: () => AppEvents.switchToTab(1),
              borderRadius: BorderRadius.circular(context.r(14)),
              child: Container(
                height: context.h(46),
                padding: EdgeInsets.symmetric(horizontal: context.w(16)),
                child: Row(
                  children: [
                    Icon(Icons.bar_chart_rounded, color: Colors.white, size: context.r(20)),
                    SizedBox(width: context.w(8)),
                    Expanded(
                      child: Center(
                        child: Text(
                          'Go to Live Attendance Tracker',
                          style: TextStyle(
                            fontSize: context.sp(13.5),
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, color: Colors.white, size: context.r(20)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------- Recent Announcements (No "View All", Fetched from DB) ----------------
  Widget _buildRecentAnnouncementsHeader() {
    return Row(
      children: [
        Icon(Icons.campaign_rounded, color: const Color(0xFF0F172A), size: context.r(20)),
        SizedBox(width: context.w(6)),
        Text(
          'Recent Announcements',
          style: TextStyle(
            fontSize: context.sp(16.5),
            fontWeight: FontWeight.w800,
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildRecentAnnouncementCard() {
    final latest = _announcements.isNotEmpty ? _announcements.first : null;
    final title = (latest?['title']?.toString().trim().isNotEmpty ?? false)
        ? latest!['title'].toString().trim()
        : 'New Holiday List Released';
    final desc = (latest?['description']?.toString().trim().isNotEmpty ?? false)
        ? latest!['description'].toString().trim()
        : 'Please check the updated holiday calendar.';
    final timeStr = _getAnnouncementTime(latest?['createdAt']?.toString());

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(context.r(16)),
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const AnnouncementsScreen()),
          );
        },
        borderRadius: BorderRadius.circular(context.r(16)),
        child: Container(
          padding: EdgeInsets.symmetric(
            horizontal: context.w(14),
            vertical: context.h(14),
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(context.r(16)),
            border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: context.r(46),
                height: context.r(46),
                decoration: const BoxDecoration(
                  color: Color(0xFFDCFCE7),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(
                    Icons.campaign_rounded,
                    color: const Color(0xFF16A34A),
                    size: context.r(24),
                  ),
                ),
              ),
              SizedBox(width: context.w(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: context.sp(13.5),
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    SizedBox(height: context.h(3)),
                    Text(
                      desc,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: context.sp(11.5),
                        fontWeight: FontWeight.w400,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                    SizedBox(height: context.h(4)),
                    Text(
                      timeStr,
                      style: TextStyle(
                        fontSize: context.sp(10.5),
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: const Color(0xFF64748B),
                size: context.r(20),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------- Helpers ----------------
  String _formatTimeDisplay(dynamic val) {
    if (val == null || val.toString().isEmpty) return '--:--';
    final s = val.toString().trim();
    if (s.toUpperCase().contains('AM') || s.toUpperCase().contains('PM')) {
      return s;
    }
    try {
      final parts = s.split(':');
      final h = int.parse(parts[0]);
      final m = int.parse(parts[1]);
      final dt = DateTime(2026, 1, 1, h, m);
      return DateFormat('hh:mm a').format(dt);
    } catch (_) {
      return s;
    }
  }

  String _formatWorkedHours(double hours) {
    if (hours <= 0) return '0h 00m';
    final h = hours.floor();
    final m = ((hours - h) * 60).round();
    return '${h}h ${m.toString().padLeft(2, '0')}m';
  }

  DateTime? _parseTime(String s) {
    try {
      final now = DateTime.now();
      final clean = s.trim().toUpperCase();
      final isPm = clean.contains('PM');
      final isAm = clean.contains('AM');
      final parts = clean.replaceAll('AM', '').replaceAll('PM', '').trim().split(':');
      int h = int.parse(parts[0]);
      int m = int.parse(parts[1]);
      if (isPm && h < 12) h += 12;
      if (isAm && h == 12) h = 0;
      return DateTime(now.year, now.month, now.day, h, m);
    } catch (_) {
      return null;
    }
  }

  String _getAnnouncementTime(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '2 hours ago';
    try {
      final dt = DateTime.parse(dateStr);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) {
        return '${diff.inMinutes <= 1 ? 1 : diff.inMinutes} mins ago';
      } else if (diff.inHours < 24) {
        return '${diff.inHours} hours ago';
      } else if (diff.inDays < 7) {
        return '${diff.inDays} days ago';
      } else {
        return DateFormat('d MMM yyyy').format(dt);
      }
    } catch (_) {
      return '2 hours ago';
    }
  }

  Widget _buildPolicyGuidance() {
    const policies = [
      _PolicyItem(
        index: 1,
        title: 'Daily Attendance',
        description: 'Employees are required to mark their attendance daily.',
        icon: Icons.event_available,
        iconBg: AppColors.accent50,
        iconColor: AppColors.accent700,
      ),
      _PolicyItem(
        index: 2,
        title: 'Working Hours',
        description: 'A minimum of eight (8) working hours is mandatory to be considered a full working day.',
        icon: Icons.access_time,
        iconBg: Color(0xFFDBEAFE),
        iconColor: Color(0xFF2563EB),
      ),
      _PolicyItem(
        index: 3,
        title: 'Partial Attendance',
        description: 'Attendance of less than four (4) hours will be treated as absent, while four (4) hours or more will be considered a half day.',
        icon: Icons.warning_amber_rounded,
        iconBg: Color(0xFFFFEDD5),
        iconColor: Color(0xFFEA580C),
      ),
      _PolicyItem(
        index: 4,
        title: 'Break Time Recording',
        description: 'It is mandatory to record break time on a daily basis.',
        icon: Icons.coffee_outlined,
        iconBg: Color(0xFFF3E8FF),
        iconColor: Color(0xFF9333EA),
      ),
      _PolicyItem(
        index: 5,
        title: 'Leave & WFH Requests',
        description: 'Leave and Work From Home (WFH) requests must be submitted at least one day in advance.',
        icon: Icons.beach_access_outlined,
        iconBg: AppColors.brand50,
        iconColor: AppColors.brand600,
      ),
    ];

    return Column(
      children: policies.map((p) => _buildPolicyCard(p)).toList(),
    );
  }

  Widget _buildPolicyCard(_PolicyItem policy) {
    return Container(
      margin: EdgeInsets.only(bottom: context.h(8)),
      padding: EdgeInsets.all(context.w(14)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: context.r(36),
            height: context.r(36),
            decoration: BoxDecoration(
              color: policy.iconBg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(policy.icon, color: policy.iconColor, size: context.r(20)),
          ),
          SizedBox(width: context.w(12)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  policy.title,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: context.sp(13),
                    color: AppColors.ink,
                  ),
                ),
                SizedBox(height: context.h(3)),
                Text(
                  policy.description,
                  style: TextStyle(
                    fontSize: context.sp(12),
                    color: AppColors.inkMuted,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: context.w(8)),
          Container(
            width: context.r(24),
            height: context.r(24),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.surfaceSubtle),
            ),
            child: Text(
              '${policy.index}',
              style: TextStyle(
                fontSize: context.sp(11),
                fontWeight: FontWeight.w700,
                color: AppColors.inkMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PolicyItem {
  final int index;
  final String title;
  final String description;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;

  const _PolicyItem({
    required this.index,
    required this.title,
    required this.description,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
  });
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/user.dart';
import '../services/app_events.dart';
import '../services/auth_provider.dart';
import '../services/dashboard_service.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import '../screens/employee/announcements_screen.dart';
import '../screens/employee/attendance_report_screen.dart';
import '../screens/employee/attendance_screen.dart';
import '../screens/employee/calendar_screen.dart';
import '../screens/employee/feedback_screen.dart';
import '../screens/employee/leaves_screen.dart';
import '../screens/employee/my_reviews_screen.dart';
import '../screens/employee/notifications_screen.dart';
import '../screens/employee/payslips_screen.dart';
import '../screens/employee/tasks_screen.dart';
import '../screens/login_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/teamlead/approvals_screen.dart';
import '../screens/teamlead/my_teams_screen.dart';
import '../screens/teamlead/team_reviews_screen.dart';
import '../screens/admin/admin_announcements_screen.dart';
import '../screens/admin/admin_attendance_report_screen.dart';
import '../screens/admin/admin_calendar_screen.dart';
import '../screens/admin/admin_daily_quote_screen.dart';
import '../screens/admin/admin_departments_screen.dart';
import '../screens/admin/admin_feedback_screen.dart';
import '../screens/admin/admin_leave_types_screen.dart';
import '../screens/admin/admin_payroll_templates_screen.dart';
import '../screens/admin/admin_payslips_screen.dart';
import '../screens/admin/admin_reviews_screen.dart';
import '../screens/admin/admin_teams_screen.dart';

/// Side navigation. Replaces the old "More" bottom-nav tab. Options are
/// grouped into collapsible accordion sections (ExpansionTile).
class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  void _go(BuildContext context, WidgetBuilder builder) {
    Navigator.of(context).pop(); // close the drawer
    // Always stack drawer destinations directly on the shell, with Home as
    // the tab underneath, so Back / swipe returns Home (not the last screen).
    final nav = Navigator.of(context, rootNavigator: true);
    final role = context.read<AuthProvider>().user?.primaryRole ?? 'employee';
    nav.popUntil((r) => r.isFirst);
    AppEvents.switchToTab(role == 'employee' ? 2 : 0);
    nav.push(MaterialPageRoute(builder: builder));
  }

  Future<void> _openPayslips(BuildContext context) async {
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final role = context.read<AuthProvider>().user?.primaryRole ?? 'employee';
    navigator.pop();
    navigator.popUntil((r) => r.isFirst);
    AppEvents.switchToTab(role == 'employee' ? 2 : 0);
    try {
      final stats = await DashboardService().getEmployeeStats();
      final code = (stats['employee'] as Map?)?['employeeId']?.toString();
      if (code == null) throw Exception('Employee ID not found');
      navigator.push(MaterialPageRoute(builder: (_) => PayslipsScreen(employeeCode: code)));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Could not load payslips right now')));
    }
  }

  static const _blue = Color(0xFF2563EB);
  static const _blueBg = Color(0xFFDBEAFE);
  static const _purple = Color(0xFF9333EA);
  static const _purpleBg = Color(0xFFF3E8FF);
  static const _orange = Color(0xFFEA580C);
  static const _orangeBg = Color(0xFFFFEDD5);
  static const _teal = Color(0xFF0D9488);
  static const _tealBg = Color(0xFFCCFBF1);
  static const _green = Color(0xFF16A34A);
  static const _greenBg = Color(0xFFDCFCE7);
  static const _indigo = Color(0xFF4F46E5);
  static const _indigoBg = Color(0xFFE0E7FF);
  static const _pink = Color(0xFFDB2777);
  static const _pinkBg = Color(0xFFFCE7F3);

  List<Widget> _employeeSections(BuildContext context, bool isTeamLead) => [
        _Section(
          title: 'Leave & Attendance',
          children: [
            _Item(Icons.fingerprint_rounded, 'Attendance', color: _blue, iconBg: _blueBg,
                onTap: () => _go(context, (_) => const AttendanceScreen())),
            _Item(Icons.insights_rounded, 'Attendance Report', color: _indigo, iconBg: _indigoBg,
                onTap: () => _go(context, (_) => const AttendanceReportScreen())),
            _Item(Icons.beach_access_rounded, 'Leaves', color: _green, iconBg: _greenBg,
                onTap: () => _go(context, (_) => const LeavesScreen())),
            _Item(Icons.event_available_rounded, 'Calendar & Holidays', color: _orange, iconBg: _orangeBg,
                onTap: () => _go(context, (_) => const CalendarScreen())),
          ],
        ),
        _Section(
          title: 'Work',
          children: [
            _Item(Icons.task_alt_rounded, 'Tasks', color: _purple, iconBg: _purpleBg,
                onTap: () => _go(context, (_) => const TasksScreen())),
            _Item(Icons.leaderboard_rounded, 'My Reviews', color: _pink, iconBg: _pinkBg,
                onTap: () => _go(context, (_) => const MyReviewsScreen())),
          ],
        ),
        _Section(
          title: 'Communication',
          children: [
            _Item(Icons.campaign_rounded, 'Announcements', color: _orange, iconBg: _orangeBg,
                onTap: () => _go(context, (_) => const AnnouncementsScreen())),
            _Item(Icons.forum_rounded, 'Feedback', color: _teal, iconBg: _tealBg,
                onTap: () => _go(context, (_) => const FeedbackScreen())),
            _Item(Icons.notifications_active_rounded, 'Notifications', color: _blue, iconBg: _blueBg,
                onTap: () => _go(context, (_) => const NotificationsScreen())),
          ],
        ),
        _Section(
          title: 'My Records',
          children: [
            _Item(Icons.receipt_long_rounded, 'Payslips', color: _green, iconBg: _greenBg,
                onTap: () => _openPayslips(context)),
          ],
        ),
        if (isTeamLead)
          _Section(
            title: 'Team Lead',
            children: [
              _Item(Icons.diversity_3_rounded, 'My Teams', color: _indigo, iconBg: _indigoBg,
                  onTap: () => _go(context, (_) => const MyTeamsScreen())),
              _Item(Icons.fact_check_rounded, 'Attendance Approvals', color: _blue, iconBg: _blueBg,
                  onTap: () => _go(context, (_) => const ApprovalsScreen())),
              _Item(Icons.military_tech_rounded, 'Team Reviews', color: _pink, iconBg: _pinkBg,
                  onTap: () => _go(context, (_) => const TeamReviewsScreen())),
            ],
          ),
      ];

  // Home / Leaves / Employees are bottom-nav tabs — the drawer holds the rest.
  List<Widget> _adminSections(BuildContext context) => [
        _Section(
          title: 'Organisation',
          children: [
            _Item(Icons.apartment_rounded, 'Departments', color: _blue, iconBg: _blueBg,
                onTap: () => _go(context, (_) => const AdminDepartmentsScreen())),
            _Item(Icons.category_rounded, 'Leave Types', color: _green, iconBg: _greenBg,
                onTap: () => _go(context, (_) => const AdminLeaveTypesScreen())),
            _Item(Icons.bar_chart_rounded, 'Attendance Report', color: _indigo, iconBg: _indigoBg,
                onTap: () => _go(context, (_) => const AdminAttendanceReportScreen())),
            _Item(Icons.event_note_rounded, 'Calendar & Events', color: _orange, iconBg: _orangeBg,
                onTap: () => _go(context, (_) => const AdminCalendarScreen())),
            _Item(Icons.diversity_3_rounded, 'Teams', color: _teal, iconBg: _tealBg,
                onTap: () => _go(context, (_) => const AdminTeamsScreen())),
            _Item(Icons.military_tech_rounded, 'Performance Reviews', color: _pink, iconBg: _pinkBg,
                onTap: () => _go(context, (_) => const AdminReviewsScreen())),
          ],
        ),
        _Section(
          title: 'Payroll',
          children: [
            _Item(Icons.receipt_long_rounded, 'Payslips', color: _green, iconBg: _greenBg,
                onTap: () => _go(context, (_) => const AdminPayslipsScreen())),
            _Item(Icons.tune_rounded, 'Payroll Templates', color: _purple, iconBg: _purpleBg,
                onTap: () => _go(context, (_) => const AdminPayrollTemplatesScreen())),
          ],
        ),
        _Section(
          title: 'Communication',
          children: [
            _Item(Icons.campaign_rounded, 'Announcements', color: _orange, iconBg: _orangeBg,
                onTap: () => _go(context, (_) => const AdminAnnouncementsScreen())),
            _Item(Icons.forum_rounded, 'Feedback', color: _teal, iconBg: _tealBg,
                onTap: () => _go(context, (_) => const AdminFeedbackScreen())),
            _Item(Icons.format_quote_rounded, 'Daily Quote', color: _purple, iconBg: _purpleBg,
                onTap: () => _go(context, (_) => const AdminDailyQuoteScreen())),
            _Item(Icons.notifications_active_rounded, 'Notifications', color: _blue, iconBg: _blueBg,
                onTap: () => _go(context, (_) => const NotificationsScreen())),
          ],
        ),
      ];

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isTeamLead = user?.isTeamLead ?? false;
    final isAdmin = user?.isAdmin ?? false;

    return Drawer(
      backgroundColor: AppColors.surface,
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            _Header(name: user?.name ?? '', role: _roleLabel(user)),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  if (isAdmin)
                    ..._adminSections(context)
                  else
                    ..._employeeSections(context, isTeamLead),
                  const Divider(height: 1),
                  _Item(Icons.account_circle_rounded, 'My Profile', color: AppColors.brand600,
                      onTap: () => _go(context, (_) => const ProfileScreen())),
                  _Item(Icons.settings_rounded, 'App Settings', color: AppColors.inkMuted, iconBg: AppColors.surfaceSubtle,
                      onTap: () => _go(context, (_) => const SettingsScreen())),
                ],
              ),
            ),
            const Divider(height: 1),
            _Item(
              Icons.logout_rounded,
              'Log out',
              color: AppColors.danger,
              iconBg: AppColors.dangerBg,
              onTap: () async {
                final navigator = Navigator.of(context, rootNavigator: true);
                final auth = context.read<AuthProvider>();
                navigator.pop(); // close the drawer
                await auth.logout();
                navigator.pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              },
            ),
            SizedBox(height: context.h(8)),
          ],
        ),
      ),
    );
  }

  String _roleLabel(AppUser? u) {
    if (u == null) return '';
    if (u.isAdmin) return 'Administrator';
    if (u.isHr) return 'HR';
    if (u.isTeamLead) return 'Team Lead';
    if (u.isCandidate) return 'Candidate';
    return 'Employee';
  }
}

class _Header extends StatelessWidget {
  final String name;
  final String role;
  const _Header({required this.name, required this.role});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: AppColors.brand900,
      padding: EdgeInsets.fromLTRB(context.w(20), MediaQuery.of(context).padding.top + context.h(20), context.w(20), context.h(20)),
      child: Row(
        children: [
          Container(
            width: context.r(48),
            height: context.r(48),
            padding: EdgeInsets.all(context.r(6)),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(context.r(12))),
            child: Image.asset('assets/logo.png', fit: BoxFit.contain),
          ),
          SizedBox(width: context.w(12)),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.white, fontSize: context.sp(16), fontWeight: FontWeight.w700)),
                SizedBox(height: context.h(2)),
                Text(role, style: TextStyle(color: Colors.white70, fontSize: context.sp(12))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return ExpansionTile(
      title: Text(title,
          style: TextStyle(
              fontSize: context.sp(13), fontWeight: FontWeight.w700, color: AppColors.inkMuted, letterSpacing: 0.3)),
      shape: const Border(),
      collapsedShape: const Border(),
      tilePadding: EdgeInsets.symmetric(horizontal: context.w(16)),
      childrenPadding: EdgeInsets.only(bottom: context.h(4)),
      children: children,
    );
  }
}

class _Item extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  final Color? iconBg;
  const _Item(this.icon, this.label, {required this.onTap, this.color, this.iconBg});

  @override
  Widget build(BuildContext context) {
    final tint = color ?? AppColors.brand600;
    final bg = iconBg ?? tint.withValues(alpha: 0.12);
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.symmetric(horizontal: context.w(16)),
      leading: Container(
        width: context.r(32),
        height: context.r(32),
        decoration: BoxDecoration(color: AppColors.tint(bg), borderRadius: BorderRadius.circular(9)),
        child: Icon(icon, size: context.r(17), color: tint),
      ),
      title: Text(label, style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w500, color: color ?? AppColors.ink)),
      onTap: onTap,
    );
  }
}

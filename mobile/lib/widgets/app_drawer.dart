import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/user.dart';
import '../services/app_events.dart';
import '../services/auth_provider.dart';
import '../services/dashboard_service.dart';
import '../services/employee_service.dart';
import '../main.dart';
import 'profile_avatar.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import '../screens/employee/announcements_screen.dart';
import '../screens/employee/attendance_report_screen.dart';
import '../screens/employee/attendance_screen.dart';
import '../screens/employee/calendar_screen.dart';
import '../screens/employee/feedback_screen.dart';
import '../screens/employee/leaves_screen.dart';
import '../screens/employee/payslips_screen.dart';
import '../screens/employee/tasks_screen.dart';
import '../screens/login_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/teamlead/my_teams_screen.dart';
import '../screens/admin/admin_announcements_screen.dart';
import '../screens/admin/admin_attendance_report_screen.dart';
import '../screens/admin/admin_calendar_screen.dart';
import '../screens/admin/admin_daily_quote_screen.dart';
import '../screens/admin/admin_short_links_screen.dart';
import '../screens/admin/admin_departments_screen.dart';
import '../screens/admin/admin_feedback_screen.dart';
import '../screens/admin/admin_leave_types_screen.dart';
import '../screens/admin/admin_payroll_templates_screen.dart';
import '../screens/admin/admin_payslips_screen.dart';
import '../screens/admin/admin_teams_screen.dart';
import 'push_back_drawer.dart';

/// Side navigation. Replaces the old "More" bottom-nav tab. Options are
/// grouped into collapsible accordion sections (ExpansionTile).
class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  void _go(BuildContext context, WidgetBuilder builder) {
    closeAppMenu(context); // close the menu
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
    closeAppMenu(context);
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

  List<Widget> _employeeSections(BuildContext context, bool isTeamLead) => [
        _Section(
          title: 'Leave & Attendance',
          children: [
            _Item(Icons.how_to_reg_outlined, 'Attendance', color: _blue, iconBg: _blueBg,
                onTap: () => _go(context, (_) => const AttendanceScreen())),
            _Item(Icons.assessment_outlined, 'Attendance Report', color: _indigo, iconBg: _indigoBg,
                onTap: () => _go(context, (_) => const AttendanceReportScreen())),
            _Item(Icons.flight_takeoff_outlined, 'Leaves', color: _green, iconBg: _greenBg,
                onTap: () => _go(context, (_) => const LeavesScreen())),
            _Item(Icons.calendar_month_outlined, 'Calendar & Holidays', color: _orange, iconBg: _orangeBg,
                onTap: () => _go(context, (_) => const CalendarScreen())),
          ],
        ),
        _Section(
          title: 'Work',
          children: [
            _Item(Icons.checklist_rounded, 'Tasks', color: _purple, iconBg: _purpleBg,
                onTap: () => _go(context, (_) => const TasksScreen())),
          ],
        ),
        _Section(
          title: 'Communication',
          children: [
            _Item(Icons.campaign_outlined, 'Announcements', color: _orange, iconBg: _orangeBg,
                onTap: () => _go(context, (_) => const AnnouncementsScreen())),
            _Item(Icons.chat_bubble_outline_rounded, 'Feedback', color: _teal, iconBg: _tealBg,
                onTap: () => _go(context, (_) => const FeedbackScreen())),
          ],
        ),
        _Section(
          title: 'My Records',
          children: [
            _Item(Icons.receipt_long_outlined, 'Payslips', color: _green, iconBg: _greenBg,
                onTap: () => _openPayslips(context)),
          ],
        ),
        if (isTeamLead)
          _Section(
            title: 'Team Lead',
            children: [
              _Item(Icons.groups_outlined, 'My Teams', color: _indigo, iconBg: _indigoBg,
                  onTap: () => _go(context, (_) => const MyTeamsScreen())),
            ],
          ),
      ];

  // Home / Leaves / Employees are bottom-nav tabs — the drawer holds the rest.
  List<Widget> _adminSections(BuildContext context) => [
        _Section(
          title: 'Organisation',
          children: [
            _Item(Icons.business_outlined, 'Departments', color: _blue, iconBg: _blueBg,
                onTap: () => _go(context, (_) => const AdminDepartmentsScreen())),
            _Item(Icons.category_outlined, 'Leave Types', color: _green, iconBg: _greenBg,
                onTap: () => _go(context, (_) => const AdminLeaveTypesScreen())),
            _Item(Icons.assessment_outlined, 'Attendance Report', color: _indigo, iconBg: _indigoBg,
                onTap: () => _go(context, (_) => const AdminAttendanceReportScreen())),
            _Item(Icons.calendar_month_outlined, 'Calendar & Events', color: _orange, iconBg: _orangeBg,
                onTap: () => _go(context, (_) => const AdminCalendarScreen())),
            _Item(Icons.groups_outlined, 'Teams', color: _teal, iconBg: _tealBg,
                onTap: () => _go(context, (_) => const AdminTeamsScreen())),
          ],
        ),
        _Section(
          title: 'Payroll',
          children: [
            _Item(Icons.receipt_long_outlined, 'Payslips', color: _green, iconBg: _greenBg,
                onTap: () => _go(context, (_) => const AdminPayslipsScreen())),
            _Item(Icons.tune_outlined, 'Payroll Templates', color: _purple, iconBg: _purpleBg,
                onTap: () => _go(context, (_) => const AdminPayrollTemplatesScreen())),
          ],
        ),
        _Section(
          title: 'Communication',
          children: [
            _Item(Icons.campaign_outlined, 'Announcements', color: _orange, iconBg: _orangeBg,
                onTap: () => _go(context, (_) => const AdminAnnouncementsScreen())),
            _Item(Icons.chat_bubble_outline_rounded, 'Feedback', color: _teal, iconBg: _tealBg,
                onTap: () => _go(context, (_) => const AdminFeedbackScreen())),
            _Item(Icons.format_quote_outlined, 'Daily Quote', color: _purple, iconBg: _purpleBg,
                onTap: () => _go(context, (_) => const AdminDailyQuoteScreen())),
            _Item(Icons.link, 'Short Links', color: _teal, iconBg: _tealBg,
                onTap: () => _go(context, (_) => const AdminShortLinksScreen())),
          ],
        ),
      ];

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isTeamLead = user?.isTeamLead ?? false;
    final isAdmin = user?.isAdmin ?? false;

    // Sits on the push-back backdrop (navy), so it is transparent with light
    // text and the page floats beside it.
    return Material(
      type: MaterialType.transparency,
      child: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Builder(builder: (context) {
              // Photo comes from the shared profile cache (filled by Profile);
              // fetch once if the drawer opens first.
              final cache = AppCaches.of(context).employeeProfile;
              if (!cache.hasData && user != null && user.id.isNotEmpty) {
                EmployeeService().getEmployee(user.id).then(cache.set).catchError((_) {});
              }
              return ListenableBuilder(
                listenable: cache,
                builder: (context, _) => _Header(
                  name: user?.name ?? '',
                  role: _roleLabel(user),
                  photo: cache.data?['profileImage']?.toString(),
                ),
              );
            }),
            Expanded(
              child: ListView(
                padding: EdgeInsets.symmetric(horizontal: context.w(10), vertical: context.h(4)),
                children: [
                  if (isAdmin)
                    ..._adminSections(context)
                  else
                    ..._employeeSections(context, isTeamLead),
                  const _MenuDivider(),
                  _Item(Icons.person_outline_rounded, 'My Profile', color: AppColors.brand600,
                      onTap: () => _go(context, (_) => const ProfileScreen())),
                  _Item(Icons.settings_outlined, 'App Settings', color: AppColors.inkMuted, iconBg: AppColors.surfaceSubtle,
                      onTap: () => _go(context, (_) => const SettingsScreen())),
                ],
              ),
            ),
            const _MenuDivider(),
            _Item(
              Icons.logout_rounded,
              'Log out',
              color: AppColors.danger,
              iconBg: AppColors.dangerBg,
              onTap: () async {
                final navigator = Navigator.of(context, rootNavigator: true);
                final auth = context.read<AuthProvider>();
                final caches = AppCaches.of(context);
                closeAppMenu(context); // close the menu
                await auth.logout();
                caches.clearAll();
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
  final String? photo;
  const _Header({required this.name, required this.role, this.photo});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(context.w(22), MediaQuery.of(context).padding.top + context.h(28), context.w(16), context.h(22)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Avatar with a green ring.
        Container(
          padding: const EdgeInsets.all(3),
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(colors: [AppColors.accent400, AppColors.accent600]),
          ),
          child: ProfileAvatar(photo: photo, name: name, size: context.r(64), borderColor: AppColors.brand950),
        ),
        SizedBox(height: context.h(14)),
        // One line: long names shrink to fit instead of wrapping.
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(name,
              maxLines: 1,
              style: TextStyle(color: Colors.white, fontSize: context.sp(19), fontWeight: FontWeight.w700, height: 1.2)),
        ),
        SizedBox(height: context.h(8)),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.accent500.withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: AppColors.accent400.withValues(alpha: 0.45)),
          ),
          child: Text(role, style: TextStyle(color: AppColors.accent200, fontSize: context.sp(12), fontWeight: FontWeight.w600)),
        ),
      ]),
    );
  }
}

class _MenuDivider extends StatelessWidget {
  const _MenuDivider();
  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.symmetric(horizontal: context.w(16), vertical: context.h(6)),
        child: Divider(height: 1, color: Colors.white.withValues(alpha: 0.10)),
      );
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent, splashColor: Colors.white10),
      child: ExpansionTile(
        title: Text(title.toUpperCase(),
            style: TextStyle(fontSize: context.sp(11.5), fontWeight: FontWeight.w700, color: AppColors.brand200, letterSpacing: 1.1)),
        iconColor: Colors.white,
        collapsedIconColor: AppColors.brand200,
        shape: const Border(),
        collapsedShape: const Border(),
        tilePadding: EdgeInsets.symmetric(horizontal: context.w(12)),
        childrenPadding: EdgeInsets.only(bottom: context.h(4)),
        children: children,
      ),
    );
  }
}

/// Rounded pill row on the dark backdrop. Log out keeps a soft red.
class _Item extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  final Color? iconBg;
  const _Item(this.icon, this.label, {required this.onTap, this.color, this.iconBg});

  @override
  Widget build(BuildContext context) {
    final isDanger = color == AppColors.danger;
    final tint = isDanger ? const Color(0xFFFCA5A5) : Colors.white;
    final bg = isDanger ? const Color(0x33DC2626) : Colors.white.withValues(alpha: 0.08);
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: context.w(isDanger ? 10 : 0), vertical: 2),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          splashColor: Colors.white.withValues(alpha: 0.08),
          highlightColor: Colors.white.withValues(alpha: 0.06),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: context.w(12), vertical: context.h(10)),
            child: Row(children: [
              Container(
                width: context.r(36),
                height: context.r(36),
                decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(11)),
                child: Icon(icon, size: context.r(18), color: tint),
              ),
              SizedBox(width: context.w(14)),
              Expanded(
                child: Text(label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: context.sp(15), fontWeight: FontWeight.w600, color: tint)),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

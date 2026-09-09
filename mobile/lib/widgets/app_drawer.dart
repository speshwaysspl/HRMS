import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/user.dart';
import '../services/auth_provider.dart';
import '../services/dashboard_service.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import '../screens/employee/announcements_screen.dart';
import '../screens/employee/calendar_screen.dart';
import '../screens/employee/corrections_screen.dart';
import '../screens/employee/documents_screen.dart';
import '../screens/employee/feedback_screen.dart';
import '../screens/employee/my_reviews_screen.dart';
import '../screens/employee/notifications_screen.dart';
import '../screens/employee/payslips_screen.dart';
import '../screens/employee/tasks_screen.dart';
import '../screens/login_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/teamlead/approvals_screen.dart';
import '../screens/teamlead/my_teams_screen.dart';
import '../screens/teamlead/team_reviews_screen.dart';
import '../screens/admin/admin_announcements_screen.dart';
import '../screens/admin/admin_attendance_report_screen.dart';
import '../screens/admin/admin_calendar_screen.dart';
import '../screens/admin/admin_daily_quote_screen.dart';
import '../screens/admin/admin_departments_screen.dart';
import '../screens/admin/admin_documents_screen.dart';
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
    Navigator.of(context).push(MaterialPageRoute(builder: builder));
  }

  Future<void> _openPayslips(BuildContext context) async {
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    navigator.pop();
    try {
      final stats = await DashboardService().getEmployeeStats();
      final code = (stats['employee'] as Map?)?['employeeId']?.toString();
      if (code == null) throw Exception('Employee ID not found');
      navigator.push(MaterialPageRoute(builder: (_) => PayslipsScreen(employeeCode: code)));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Could not load payslips right now')));
    }
  }

  List<Widget> _employeeSections(BuildContext context, bool isTeamLead) => [
        _Section(
          title: 'My Work',
          initiallyExpanded: true,
          children: [
            _Item(Icons.checklist_outlined, 'Tasks',
                onTap: () => _go(context, (_) => const TasksScreen())),
            _Item(Icons.edit_calendar_outlined, 'Attendance Corrections',
                onTap: () => _go(context, (_) => const CorrectionsScreen())),
            _Item(Icons.calendar_month_outlined, 'Calendar & Holidays',
                onTap: () => _go(context, (_) => const CalendarScreen())),
          ],
        ),
        _Section(
          title: 'Communication',
          children: [
            _Item(Icons.campaign_outlined, 'Announcements',
                onTap: () => _go(context, (_) => const AnnouncementsScreen())),
            _Item(Icons.chat_bubble_outline, 'Feedback',
                onTap: () => _go(context, (_) => const FeedbackScreen())),
            _Item(Icons.notifications_none, 'Notifications',
                onTap: () => _go(context, (_) => const NotificationsScreen())),
          ],
        ),
        _Section(
          title: 'My Records',
          children: [
            _Item(Icons.description_outlined, 'My Documents',
                onTap: () => _go(context, (_) => const DocumentsScreen())),
            _Item(Icons.receipt_long_outlined, 'Payslips',
                onTap: () => _openPayslips(context)),
            _Item(Icons.rate_review_outlined, 'My Reviews',
                onTap: () => _go(context, (_) => const MyReviewsScreen())),
          ],
        ),
        if (isTeamLead)
          _Section(
            title: 'Team Lead',
            children: [
              _Item(Icons.groups_outlined, 'My Teams',
                  onTap: () => _go(context, (_) => const MyTeamsScreen())),
              _Item(Icons.fact_check_outlined, 'Attendance Approvals',
                  onTap: () => _go(context, (_) => const ApprovalsScreen())),
              _Item(Icons.reviews_outlined, 'Team Reviews',
                  onTap: () => _go(context, (_) => const TeamReviewsScreen())),
            ],
          ),
      ];

  // Home / Leaves / Employees are bottom-nav tabs — the drawer holds the rest.
  List<Widget> _adminSections(BuildContext context) => [
        _Section(
          title: 'Organisation',
          initiallyExpanded: true,
          children: [
            _Item(Icons.apartment_outlined, 'Departments',
                onTap: () => _go(context, (_) => const AdminDepartmentsScreen())),
            _Item(Icons.beach_access_outlined, 'Leave Types',
                onTap: () => _go(context, (_) => const AdminLeaveTypesScreen())),
            _Item(Icons.calendar_month_outlined, 'Attendance Report',
                onTap: () => _go(context, (_) => const AdminAttendanceReportScreen())),
            _Item(Icons.fact_check_outlined, 'Attendance Corrections',
                onTap: () => _go(context, (_) => const ApprovalsScreen())),
            _Item(Icons.event_note_outlined, 'Calendar & Events',
                onTap: () => _go(context, (_) => const AdminCalendarScreen())),
            _Item(Icons.description_outlined, 'Documents',
                onTap: () => _go(context, (_) => const AdminDocumentsScreen())),
            _Item(Icons.hub_outlined, 'Teams',
                onTap: () => _go(context, (_) => const AdminTeamsScreen())),
            _Item(Icons.rate_review_outlined, 'Performance Reviews',
                onTap: () => _go(context, (_) => const AdminReviewsScreen())),
          ],
        ),
        _Section(
          title: 'Payroll',
          children: [
            _Item(Icons.receipt_long_outlined, 'Payslips',
                onTap: () => _go(context, (_) => const AdminPayslipsScreen())),
            _Item(Icons.tune, 'Payroll Templates',
                onTap: () => _go(context, (_) => const AdminPayrollTemplatesScreen())),
          ],
        ),
        _Section(
          title: 'Communication',
          initiallyExpanded: true,
          children: [
            _Item(Icons.campaign_outlined, 'Announcements',
                onTap: () => _go(context, (_) => const AdminAnnouncementsScreen())),
            _Item(Icons.chat_bubble_outline, 'Feedback',
                onTap: () => _go(context, (_) => const AdminFeedbackScreen())),
            _Item(Icons.format_quote_outlined, 'Daily Quote',
                onTap: () => _go(context, (_) => const AdminDailyQuoteScreen())),
            _Item(Icons.notifications_none, 'Notifications',
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
                  _Item(Icons.person_outline, 'Profile & Settings',
                      onTap: () => _go(context, (_) => const ProfileScreen())),
                ],
              ),
            ),
            const Divider(height: 1),
            _Item(
              Icons.logout,
              'Log out',
              color: AppColors.danger,
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
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    return Container(
      width: double.infinity,
      color: AppColors.brand900,
      padding: EdgeInsets.fromLTRB(context.w(20), context.h(20), context.w(20), context.h(20)),
      child: Row(
        children: [
          CircleAvatar(
            radius: context.r(24),
            backgroundColor: AppColors.brand600,
            child: Text(initial,
                style: TextStyle(color: Colors.white, fontSize: context.sp(20), fontWeight: FontWeight.w700)),
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
  final bool initiallyExpanded;
  const _Section({required this.title, required this.children, this.initiallyExpanded = false});

  @override
  Widget build(BuildContext context) {
    return ExpansionTile(
      title: Text(title,
          style: TextStyle(
              fontSize: context.sp(13), fontWeight: FontWeight.w700, color: AppColors.inkMuted, letterSpacing: 0.3)),
      initiallyExpanded: initiallyExpanded,
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
  const _Item(this.icon, this.label, {required this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.symmetric(horizontal: context.w(20)),
      leading: Icon(icon, size: context.r(20), color: color ?? AppColors.ink),
      title: Text(label, style: TextStyle(fontSize: context.sp(14), color: color ?? AppColors.ink)),
      onTap: onTap,
    );
  }
}

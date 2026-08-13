import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_provider.dart';
import '../services/dashboard_service.dart';
import '../theme/app_theme.dart';
import 'employee/announcements_screen.dart';
import 'employee/calendar_screen.dart';
import 'employee/corrections_screen.dart';
import 'employee/documents_screen.dart';
import 'employee/feedback_screen.dart';
import 'employee/my_reviews_screen.dart';
import 'employee/notifications_screen.dart';
import 'employee/payslips_screen.dart';
import 'employee/tasks_screen.dart';
import 'profile_screen.dart';
import 'teamlead/approvals_screen.dart';
import 'teamlead/my_teams_screen.dart';
import 'teamlead/team_reviews_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  Future<void> _openPayslips(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final stats = await DashboardService().getEmployeeStats();
      final code = (stats['employee'] as Map?)?['employeeId']?.toString();
      if (code == null) throw Exception('Employee ID not found');
      if (context.mounted) {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => PayslipsScreen(employeeCode: code)));
      }
    } catch (e) {
      messenger.showSnackBar(const SnackBar(content: Text('Could not load payslips right now')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isTeamLead = user?.isTeamLead ?? false;

    final items = <_MenuItem>[
      _MenuItem('Tasks', Icons.checklist_outlined, (ctx) => const TasksScreen()),
      _MenuItem('Announcements', Icons.campaign_outlined, (ctx) => const AnnouncementsScreen()),
      _MenuItem('Feedback', Icons.chat_bubble_outline, (ctx) => const FeedbackScreen()),
      _MenuItem('My Documents', Icons.description_outlined, (ctx) => const DocumentsScreen()),
      _MenuItem('Notifications', Icons.notifications_none, (ctx) => const NotificationsScreen()),
      _MenuItem('Payslips', Icons.receipt_long_outlined, null, onTap: _openPayslips),
      _MenuItem('Calendar & Holidays', Icons.calendar_month_outlined, (ctx) => const CalendarScreen()),
      _MenuItem('My Reviews', Icons.rate_review_outlined, (ctx) => const MyReviewsScreen()),
      _MenuItem('Attendance Corrections', Icons.edit_calendar_outlined, (ctx) => const CorrectionsScreen()),
      if (isTeamLead) _MenuItem('My Teams', Icons.groups_outlined, (ctx) => const MyTeamsScreen()),
      if (isTeamLead) _MenuItem('Attendance Approvals', Icons.fact_check_outlined, (ctx) => const ApprovalsScreen()),
      if (isTeamLead) _MenuItem('Team Reviews', Icons.reviews_outlined, (ctx) => const TeamReviewsScreen()),
      _MenuItem('Profile & Settings', Icons.person_outline, (ctx) => const ProfileScreen()),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.35,
        ),
        itemCount: items.length,
        itemBuilder: (context, i) {
          final item = items[i];
          return _MenuTile(
            item: item,
            onTap: () {
              if (item.builder != null) {
                Navigator.of(context).push(MaterialPageRoute(builder: item.builder!));
              } else if (item.onTap != null) {
                item.onTap!(context);
              }
            },
          );
        },
      ),
    );
  }
}

class _MenuItem {
  final String label;
  final IconData icon;
  final WidgetBuilder? builder;
  final Future<void> Function(BuildContext)? onTap;
  _MenuItem(this.label, this.icon, this.builder, {this.onTap});
}

class _MenuTile extends StatelessWidget {
  final _MenuItem item;
  final VoidCallback onTap;
  const _MenuTile({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadius.card),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.card),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.surfaceSubtle),
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: AppColors.brand50, borderRadius: BorderRadius.circular(10)),
                child: Icon(item.icon, color: AppColors.brand600, size: 20),
              ),
              const SizedBox(height: 10),
              Text(
                item.label,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.ink),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

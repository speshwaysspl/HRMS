import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/api_client.dart';
import '../../services/auth_provider.dart';
import '../../services/dashboard_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/marquee_app_bar_title.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/summary_card.dart';
import '../employee/notifications_screen.dart';
import '../teamlead/approvals_screen.dart';
import 'admin_announcements_screen.dart';

class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  final _service = DashboardService();
  Map<String, dynamic>? _summary;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _service.getAdminSummary();
      if (!mounted) return;
      setState(() {
        _summary = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = extractErrorMessage(e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = context.watch<AuthProvider>().user?.name ?? '';
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        flexibleSpace: Stack(
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
                  colors: [
                    Colors.black.withValues(alpha: 0.25),
                    AppColors.brand900.withValues(alpha: 0.45),
                  ],
                ),
              ),
            ),
          ],
        ),
        title: const MarqueeAppBarTitle(),
        centerTitle: false,
        actions: [
          IconButton(
            tooltip: 'Notifications',
            icon: const Icon(Icons.notifications_outlined, color: Colors.white),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            },
          ),
          SizedBox(width: context.w(6)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(
                  icon: Icons.cloud_off,
                  message: _error!,
                  action: OutlinedButton(onPressed: _load, child: const Text('Retry')),
                )
              : RefreshIndicator(onRefresh: _load, child: _content(name)),
    );
  }

  Widget _content(String name) {
    final s = _summary ?? {};
    final leave = (s['leaveSummary'] as Map?) ?? {};
    final deptBreakdown = (s['departmentBreakdown'] as List?) ?? [];
    final pad = context.w(16);
    final cardW = (context.screenW - pad * 2 - context.w(10)) / context.gridColumns();
    final cardH = context.r(44) + context.h(40);

    return ListView(
      padding: EdgeInsets.all(pad),
      children: [
        Text('Welcome back, $name',
            style: TextStyle(fontSize: context.sp(20), fontWeight: FontWeight.w700, color: AppColors.ink)),
        SizedBox(height: context.h(4)),
        Text('Organisation overview',
            style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
        SizedBox(height: context.h(20)),

        GridView.count(
          crossAxisCount: context.gridColumns(),
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: context.h(10),
          crossAxisSpacing: context.w(10),
          childAspectRatio: cardW / cardH,
          children: [
            SummaryCard(
              icon: Icons.groups_outlined,
              label: 'Employees',
              value: '${s['totalEmployees'] ?? 0}',
              iconColor: AppColors.brand600,
              iconBg: AppColors.brand50,
            ),
            SummaryCard(
              icon: Icons.apartment_outlined,
              label: 'Departments',
              value: '${s['totalDepartments'] ?? 0}',
            ),
            SummaryCard(
              icon: Icons.pending_actions,
              label: 'Pending Leaves',
              value: '${leave['pending'] ?? 0}',
              iconColor: AppColors.warning,
              iconBg: AppColors.warningBg,
            ),
            SummaryCard(
              icon: Icons.event_available,
              label: 'Approved Leaves',
              value: '${leave['approved'] ?? 0}',
              iconColor: AppColors.accent600,
              iconBg: AppColors.accent50,
            ),
          ],
        ),
        SizedBox(height: context.h(20)),

        Text('Quick Actions',
            style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w700, color: AppColors.ink)),
        SizedBox(height: context.h(10)),
        SimpleCard(
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ApprovalsScreen()),
          ),
          child: _action(Icons.fact_check_outlined, 'Attendance Corrections', 'Review regularisation requests'),
        ),
        SimpleCard(
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const AdminAnnouncementsScreen()),
          ),
          child: _action(Icons.campaign_outlined, 'Announcements', 'Post and view company announcements'),
        ),
        SizedBox(height: context.h(20)),

        if (deptBreakdown.isNotEmpty) ...[
          Text('Headcount by Department',
              style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w700, color: AppColors.ink)),
          SizedBox(height: context.h(10)),
          ...deptBreakdown.map((d) => Padding(
                padding: EdgeInsets.symmetric(vertical: context.h(6)),
                child: Row(
                  children: [
                    Expanded(
                      child: Text('${d['department'] ?? 'Unassigned'}',
                          style: TextStyle(fontSize: context.sp(13), color: AppColors.ink)),
                    ),
                    Text('${d['count'] ?? 0}',
                        style: TextStyle(fontSize: context.sp(13), fontWeight: FontWeight.w700, color: AppColors.inkMuted)),
                  ],
                ),
              )),
        ],
      ],
    );
  }

  Widget _action(IconData icon, String title, String subtitle) => Row(
        children: [
          Container(
            width: context.r(40),
            height: context.r(40),
            decoration: BoxDecoration(color: AppColors.brand50, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: AppColors.brand600, size: context.r(20)),
          ),
          SizedBox(width: context.w(12)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w600, color: AppColors.ink)),
                SizedBox(height: context.h(2)),
                Text(subtitle, style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted)),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: AppColors.inkFaint),
        ],
      );
}

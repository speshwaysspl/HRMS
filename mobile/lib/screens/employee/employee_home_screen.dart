import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_provider.dart';
import '../../services/app_events.dart';
import '../../services/dashboard_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/summary_card.dart';

class EmployeeHomeScreen extends StatefulWidget {
  const EmployeeHomeScreen({super.key});

  @override
  State<EmployeeHomeScreen> createState() => _EmployeeHomeScreenState();
}

class _EmployeeHomeScreenState extends State<EmployeeHomeScreen> {
  final _service = DashboardService();
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String? _error;

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
      final data = await _service.getEmployeeStats();
      if (!mounted) return;
      setState(() {
        _stats = data;
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
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Speshway HRMS'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _buildError()
                : _buildContent(user?.name ?? ''),
      ),
    );
  }

  Widget _buildError() {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 80),
        const Icon(Icons.cloud_off, size: 48, color: AppColors.inkFaint),
        const SizedBox(height: 12),
        Text(_error ?? '', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.inkMuted)),
        const SizedBox(height: 16),
        OutlinedButton(onPressed: _load, child: const Text('Retry')),
      ],
    );
  }

  Widget _buildContent(String name) {
    final today = _stats?['todayAttendance'] as Map<String, dynamic>? ?? {};
    final monthly = _stats?['monthlyStats'] as Map<String, dynamic>? ?? {};
    final leave = _stats?['leaveBalance'] as Map<String, dynamic>? ?? {};
    final employee = _stats?['employee'] as Map<String, dynamic>? ?? {};

    final pad = context.w(16);
    final gap = context.h(20);
    // Cell height that always fits the 44px icon box + card padding + 2 text
    // lines, then derive the grid aspect ratio from the real available width.
    final cardW = (context.screenW - pad * 2 - context.w(10)) / context.gridColumns();
    final cardH = context.r(44) + context.h(40);

    return ListView(
      padding: EdgeInsets.all(pad),
      children: [
        Text(
          'Welcome back, $name',
          style: TextStyle(fontSize: context.sp(20), fontWeight: FontWeight.w700, color: AppColors.ink),
        ),
        SizedBox(height: context.h(4)),
        Text(
          '${employee['designation'] ?? ''} · ${employee['department'] ?? ''}',
          style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13)),
        ),
        SizedBox(height: gap),

        // Today's attendance card
        Container(
          padding: EdgeInsets.all(context.w(16)),
          decoration: BoxDecoration(
            color: AppColors.brand900,
            borderRadius: BorderRadius.circular(AppRadius.panel),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Today's Status", style: TextStyle(color: Colors.white70, fontSize: context.sp(12))),
                    SizedBox(height: context.h(6)),
                    Text(
                      (today['status'] ?? 'Not Marked').toString(),
                      style: TextStyle(color: Colors.white, fontSize: context.sp(18), fontWeight: FontWeight.w700),
                    ),
                    SizedBox(height: context.h(6)),
                    Text(
                      'In: ${today['inTime'] ?? '--:--'}   Out: ${today['outTime'] ?? '--:--'}',
                      style: TextStyle(color: Colors.white70, fontSize: context.sp(12)),
                    ),
                  ],
                ),
              ),
              Icon(
                (today['status']?.toString().contains('Present') ?? false) ? Icons.check_circle : Icons.access_time,
                color: AppColors.accent400,
                size: context.r(36),
              ),
            ],
          ),
        ),
        SizedBox(height: gap),

        Text('This Month', style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w700, color: AppColors.ink)),
        SizedBox(height: context.h(10)),
        GridView.count(
          crossAxisCount: context.gridColumns(),
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: context.h(10),
          crossAxisSpacing: context.w(10),
          childAspectRatio: cardW / cardH,
          children: [
            SummaryCard(
              icon: Icons.event_available,
              label: 'Present Days',
              value: '${monthly['totalPresentDays'] ?? 0}',
              iconColor: AppColors.accent600,
              iconBg: AppColors.accent50,
            ),
            SummaryCard(
              icon: Icons.percent,
              label: 'Attendance %',
              value: '${monthly['attendancePercentage'] ?? 0}%',
            ),
            SummaryCard(
              icon: Icons.beach_access,
              label: 'Leave Balance',
              value: '${leave['remainingLeaves'] ?? 0}',
              iconColor: AppColors.warning,
              iconBg: AppColors.warningBg,
            ),
            SummaryCard(
              icon: Icons.pending_actions,
              label: 'Pending Requests',
              value: '${leave['pendingRequests'] ?? 0}',
            ),
          ],
        ),
        SizedBox(height: gap),
        Text('Quick Status', style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w700, color: AppColors.ink)),
        SizedBox(height: context.h(10)),
        Wrap(
          spacing: context.w(8),
          runSpacing: context.h(8),
          children: [
            StatusPill(label: (today['status'] ?? 'Not Marked').toString()),
            if ((leave['pendingRequests'] ?? 0) > 0) const StatusPill(label: 'Pending'),
          ],
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_provider.dart';
import '../../services/dashboard_service.dart';
import '../../theme/app_theme.dart';
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

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Welcome back, ${name.split(' ').first}',
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.ink),
        ),
        const SizedBox(height: 4),
        Text(
          '${employee['designation'] ?? ''} · ${employee['department'] ?? ''}',
          style: const TextStyle(color: AppColors.inkMuted, fontSize: 13),
        ),
        const SizedBox(height: 20),

        // Today's attendance card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.brand900,
            borderRadius: BorderRadius.circular(AppRadius.panel),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Today's Status", style: TextStyle(color: Colors.white70, fontSize: 12)),
                    const SizedBox(height: 6),
                    Text(
                      (today['status'] ?? 'Not Marked').toString(),
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'In: ${today['inTime'] ?? '--:--'}   Out: ${today['outTime'] ?? '--:--'}',
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Icon(
                (today['status']?.toString().contains('Present') ?? false) ? Icons.check_circle : Icons.access_time,
                color: AppColors.accent400,
                size: 36,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        const Text('This Month', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.ink)),
        const SizedBox(height: 10),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 2.4,
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
        const SizedBox(height: 20),
        const Text('Quick Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.ink)),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            StatusPill(label: (today['status'] ?? 'Not Marked').toString()),
            if ((leave['pendingRequests'] ?? 0) > 0) const StatusPill(label: 'Pending'),
          ],
        ),
      ],
    );
  }
}

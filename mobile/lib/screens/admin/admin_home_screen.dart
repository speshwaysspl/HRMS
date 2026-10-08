import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/app_events.dart';
import '../../services/notification_service.dart';
import 'package:provider/provider.dart';

import '../../services/auth_provider.dart';
import '../../services/dashboard_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/marquee_app_bar_title.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../employee/notifications_screen.dart';
import '../teamlead/approvals_screen.dart';
import 'admin_announcements_screen.dart';
import 'admin_attendance_report_screen.dart';
import 'admin_calendar_screen.dart';
import 'admin_leaves_screen.dart';
import 'admin_team_detail_screen.dart';
import 'admin_teams_screen.dart';

import '../../services/live_refresh.dart';
class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> with LiveRefresh<AdminHomeScreen> {
  @override
  List<String> get liveResources => const ['dashboard', 'attendance', 'leave', 'employee', 'task', 'events', 'announcement'];

  @override
  void onLiveRefresh() => _load();

  final _service = DashboardService();
  Map<String, dynamic>? _summary;
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => NotificationService().refreshUnread(
        context.read<AuthProvider>().user?.id ?? '',
      ),
    );
    AppEvents.teamChanged.addListener(_onTeamChanged);
    _load();
  }

  void _onTeamChanged() {
    final kind = AppEvents.teamChanged.value?['kind'];
    if (mounted && (kind == 'attendance' || kind == 'resync')) {
      _load();
    }
  }

  @override
  void dispose() {
    AppEvents.teamChanged.removeListener(_onTeamChanged);
    super.dispose();
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
        _error = e;
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
            Image.asset('assets/appbar_bg.png', fit: BoxFit.cover),
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
          ValueListenableBuilder<int>(
            valueListenable: AppEvents.unreadNotifications,
            builder: (_, unread, _) => Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  tooltip: 'Notifications',
                  icon: const Icon(
                    Icons.notifications_outlined,
                    color: Colors.white,
                  ),
                  onPressed: () {
                    final userId = context.read<AuthProvider>().user?.id ?? '';
                    Navigator.of(context)
                        .push(
                          MaterialPageRoute(
                            builder: (_) => const NotificationsScreen(),
                          ),
                        )
                        .then(
                          (_) => NotificationService().refreshUnread(userId),
                        );
                  },
                ),
                if (unread > 0)
                  Positioned(
                    top: 10,
                    right: 11,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFEF4444),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          SizedBox(width: context.w(6)),
        ],
      ),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: const [
                SkeletonCard(height: 80),
                SkeletonCard(height: 80),
                SkeletonListTile(),
                SkeletonListTile(),
              ],
            )
          : _error != null
          ? buildErrorState(_error!, _load)
          : RefreshIndicator(onRefresh: _load, child: _content(name)),
    );
  }

  void _push(Widget screen) => Navigator.of(
    context,
  ).push(MaterialPageRoute(builder: (_) => screen)).then((_) => _load());

  static String _ddmm(dynamic v) {
    final d = DateTime.tryParse(v?.toString() ?? '')?.toLocal();
    return d == null ? '' : DateFormat('dd MMM').format(d);
  }

  // Mirrors web AdminSummary.jsx: needs attention -> today -> team work ->
  // coming up -> organisation -> announcements -> headcount.
  Widget _content(String name) {
    final s = _summary ?? {};
    final leave = (s['leaveSummary'] as Map?) ?? {};
    final t = (s['today'] as Map?) ?? {};
    final ta = (s['teamAttendance'] as Map?) ?? {};
    final notMarked = ((ta['notMarked'] as List?) ?? [])
        .whereType<Map>()
        .toList();
    final up = (s['upcoming'] as Map?) ?? {};
    final events = ((up['events'] as List?) ?? []).whereType<Map>().toList();
    final birthdays = ((up['birthdays'] as List?) ?? [])
        .whereType<Map>()
        .toList();
    final ann = ((s['recentAnnouncements'] as List?) ?? [])
        .whereType<Map>()
        .toList();
    final pad = context.w(16);
    int n(dynamic v) => (v as num?)?.toInt() ?? 0;
    final ist = DateTime.now().toUtc().add(
      const Duration(hours: 5, minutes: 30),
    );
    final greeting = ist.hour < 12
        ? 'Good Morning'
        : ist.hour < 17
        ? 'Good Afternoon'
        : 'Good Evening';

    return ListView(
      padding: EdgeInsets.fromLTRB(pad, pad, pad, context.h(32)),
      children: [
        Text(
          name.isEmpty ? greeting : '$greeting, $name',
          style: TextStyle(
            fontSize: context.sp(20),
            fontWeight: FontWeight.w700,
            color: AppColors.ink,
          ),
        ),
        SizedBox(height: context.h(2)),
        Text(
          DateFormat('EEEE, d MMMM yyyy').format(DateTime.now()),
          style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13)),
        ),
        SizedBox(height: context.h(16)),

        // Organisation
        _Panel(
          title: 'Organisation',
          child: Row(
            children: [
              _stat('Employees', '${n(s['totalEmployees'])}'),
              _stat('Departments', '${n(s['totalDepartments'])}'),
              _stat('Active teams', '${n(ta['total'])}'),
              _stat(
                'Leaves applied',
                '${n(leave['approved']) + n(leave['pending']) + n(leave['rejected'])}',
              ),
            ],
          ),
        ),

        // Needs attention
        _ActionTile(
          icon: Icons.event_note_outlined,
          count: n(leave['pending']),
          label: 'leave requests pending',
          hint: 'Approve or reject',
          tone: AppColors.warning,
          onTap: () => _push(const AdminLeavesScreen()),
        ),
        _ActionTile(
          icon: Icons.fact_check_outlined,
          count: n((s['pending'] as Map?)?['regularizations']),
          label: 'attendance corrections',
          hint: 'Review check-in/out fixes',
          tone: AppColors.warning,
          onTap: () => _push(const ApprovalsScreen()),
        ),
        _ActionTile(
          icon: Icons.assignment_late_outlined,
          count: notMarked.length,
          label: 'teams not marked today',
          hint: 'Team roll call still open',
          tone: AppColors.danger,
          onTap: () => _push(const AdminTeamsScreen()),
        ),
        SizedBox(height: context.h(12)),

        // Today's attendance
        _Panel(
          title: "Today's attendance",
          action: 'Report',
          onAction: () => _push(const AdminAttendanceReportScreen()),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _Ring(
                    pct: n(t['activeEmployees']) == 0
                        ? 0
                        : n(t['checkedIn']) / n(t['activeEmployees']),
                  ),
                  SizedBox(width: context.w(14)),
                  Expanded(
                    child: Text(
                      '${n(t['checkedIn'])} of ${n(t['activeEmployees'])} employees checked in',
                      style: TextStyle(
                        color: AppColors.ink,
                        fontWeight: FontWeight.w600,
                        fontSize: context.sp(14),
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: context.h(14)),
              Row(
                children: [
                  for (final x in [
                    (
                      'Checked in',
                      n(t['checkedIn']),
                      AppColors.accent600,
                      'checked-in',
                    ),
                    ('On leave', n(t['onLeave']), AppColors.warning, 'Leave'),
                    (
                      'Not in',
                      n(t['notCheckedIn']),
                      AppColors.danger,
                      'not-checked-in',
                    ),
                  ])
                    Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: () => _push(
                          AdminAttendanceReportScreen(initialFilter: x.$4),
                        ),
                        child: Container(
                          margin: EdgeInsets.symmetric(
                            horizontal: context.w(3),
                          ),
                          padding: EdgeInsets.all(context.w(10)),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceSubtle,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                x.$1,
                                style: TextStyle(
                                  color: AppColors.inkMuted,
                                  fontSize: context.sp(12),
                                ),
                              ),
                              Text(
                                '${x.$2}',
                                style: TextStyle(
                                  color: x.$3,
                                  fontWeight: FontWeight.w700,
                                  fontSize: context.sp(22),
                                ),
                              ),
                              Text(
                                '${n(t['activeEmployees']) == 0 ? 0 : (x.$2 * 100 / n(t['activeEmployees'])).round()}%',
                                style: TextStyle(
                                  color: AppColors.inkMuted,
                                  fontSize: context.sp(11),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),

        // Team roll call
        _Panel(
          title: 'Team roll call',
          action: 'All teams',
          onAction: () => _push(const AdminTeamsScreen()),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _bigNumber(
                '${n(ta['marked'])}',
                'of ${n(ta['total'])} teams marked today',
              ),
              SizedBox(height: context.h(10)),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: n(ta['total']) == 0
                      ? 0
                      : n(ta['marked']) / n(ta['total']),
                  minHeight: 8,
                  color: AppColors.accent600,
                  backgroundColor: AppColors.surfaceSubtle,
                ),
              ),
              SizedBox(height: context.h(10)),
              if (notMarked.isEmpty)
                Text(
                  'Every team has marked attendance today.',
                  style: TextStyle(
                    color: AppColors.accent600,
                    fontWeight: FontWeight.w600,
                    fontSize: context.sp(13),
                  ),
                )
              else ...[
                Text(
                  'Not marked yet',
                  style: TextStyle(
                    color: AppColors.inkMuted,
                    fontSize: context.sp(12),
                  ),
                ),
                for (final tm in notMarked.take(6))
                  _listRow(
                    leading: Icon(
                      Icons.circle,
                      size: 10,
                      color: AppColors.warning,
                    ),
                    title: tm['name']?.toString() ?? '',
                    subtitle: tm['lead']?.toString() ?? 'No lead',
                    onTap: () => _push(
                      AdminTeamDetailScreen(
                        id: tm['_id'].toString(),
                        name: tm['name']?.toString() ?? 'Team',
                      ),
                    ),
                  ),
                if (notMarked.length > 6)
                  TextButton(
                    onPressed: () => _push(const AdminTeamsScreen()),
                    child: Text('+${notMarked.length - 6} more'),
                  ),
              ],
            ],
          ),
        ),

        // Coming up
        _Panel(
          title: 'Coming up',
          action: 'Calendar',
          onAction: () => _push(const AdminCalendarScreen()),
          child: events.isEmpty && birthdays.isEmpty
              ? Text(
                  'No holidays, events or birthdays in the next few weeks.',
                  style: TextStyle(color: AppColors.inkMuted),
                )
              : Column(
                  children: [
                    for (final b in birthdays)
                      _listRow(
                        leading: const Icon(
                          Icons.cake_outlined,
                          size: 18,
                          color: Color(0xFFDB2777),
                        ),
                        title: "${b['name']}'s birthday",
                        subtitle: switch (n(b['inDays'])) {
                          0 => 'Today',
                          1 => 'Tomorrow',
                          final d => 'In $d days',
                        },
                      ),
                    for (final e in events)
                      _listRow(
                        leading: Icon(
                          Icons.event_outlined,
                          size: 18,
                          color: e['type'] == 'holiday'
                              ? AppColors.accent600
                              : AppColors.brand600,
                        ),
                        title: e['title']?.toString() ?? '',
                        subtitle: '${e['type'] ?? ''} · ${_ddmm(e['date'])}',
                      ),
                  ],
                ),
        ),

        // Recent announcements
        _Panel(
          title: 'Recent announcements',
          action: 'All',
          onAction: () => _push(const AdminAnnouncementsScreen()),
          child: ann.isEmpty
              ? Text(
                  'No announcements yet.',
                  style: TextStyle(color: AppColors.inkMuted),
                )
              : Column(
                  children: [
                    for (final a in ann)
                      _listRow(
                        leading: Icon(
                          Icons.campaign_outlined,
                          size: 18,
                          color: AppColors.inkFaint,
                        ),
                        title: a['title']?.toString() ?? '',
                        trailing: _ddmm(a['date']),
                        onTap: () => _push(const AdminAnnouncementsScreen()),
                      ),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _bigNumber(String value, String caption) => Row(
    crossAxisAlignment: CrossAxisAlignment.baseline,
    textBaseline: TextBaseline.alphabetic,
    children: [
      Text(
        value,
        style: TextStyle(
          fontSize: context.sp(28),
          fontWeight: FontWeight.w700,
          color: AppColors.ink,
        ),
      ),
      SizedBox(width: context.w(8)),
      Flexible(
        child: Text(
          caption,
          style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13)),
        ),
      ),
    ],
  );

  Widget _stat(String label, String value, {Color? color}) => Expanded(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: context.sp(20),
            fontWeight: FontWeight.w700,
            color: color ?? AppColors.ink,
          ),
        ),
        Text(
          label,
          style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
        ),
      ],
    ),
  );

  Widget _listRow({
    required Widget leading,
    required String title,
    String? subtitle,
    String? trailing,
    VoidCallback? onTap,
  }) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(8),
    child: ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 48),
      child: Row(
        children: [
          SizedBox(width: 24, child: Center(child: leading)),
          SizedBox(width: context.w(10)),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.ink,
                    fontSize: context.sp(14),
                  ),
                ),
                if (subtitle != null && subtitle.isNotEmpty)
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColors.inkMuted,
                      fontSize: context.sp(12),
                    ),
                  ),
              ],
            ),
          ),
          if (trailing != null)
            Text(
              trailing,
              style: TextStyle(
                color: AppColors.inkMuted,
                fontSize: context.sp(12),
              ),
            ),
          if (onTap != null)
            Icon(Icons.chevron_right, size: 18, color: AppColors.inkFaint),
        ],
      ),
    ),
  );
}

/// One "needs attention" row: count + label, tinted when there's work.
class _ActionTile extends StatelessWidget {
  final IconData icon;
  final int count;
  final String label;
  final String hint;
  final Color tone;
  final VoidCallback onTap;
  const _ActionTile({
    required this.icon,
    required this.count,
    required this.label,
    required this.hint,
    required this.tone,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final active = count > 0;
    return Padding(
      padding: EdgeInsets.only(bottom: context.h(8)),
      child: Material(
        color: active
            ? AppColors.tint(tone.withValues(alpha: 0.08))
            : AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
          side: BorderSide(
            color: active
                ? tone.withValues(alpha: 0.35)
                : AppColors.surfaceSubtle,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.card),
          onTap: onTap,
          child: Padding(
            padding: EdgeInsets.all(context.w(12)),
            child: Row(
              children: [
                Container(
                  width: context.r(38),
                  height: context.r(38),
                  decoration: BoxDecoration(
                    color: active
                        ? tone.withValues(alpha: 0.15)
                        : AppColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    icon,
                    size: context.r(20),
                    color: active ? tone : AppColors.inkFaint,
                  ),
                ),
                SizedBox(width: context.w(12)),
                Text(
                  '$count',
                  style: TextStyle(
                    fontSize: context.sp(22),
                    fontWeight: FontWeight.w700,
                    color: active ? AppColors.ink : AppColors.inkMuted,
                  ),
                ),
                SizedBox(width: context.w(8)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.ink,
                          fontSize: context.sp(13),
                        ),
                      ),
                      Text(
                        active ? hint : 'All clear',
                        style: TextStyle(
                          color: AppColors.inkMuted,
                          fontSize: context.sp(12),
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: AppColors.inkFaint),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;
  final Widget child;
  const _Panel({
    required this.title,
    required this.child,
    this.action,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(bottom: context.h(12)),
      padding: EdgeInsets.all(context.w(14)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                    fontSize: context.sp(14),
                  ),
                ),
              ),
              if (action != null)
                TextButton(onPressed: onAction, child: Text(action!)),
            ],
          ),
          SizedBox(height: context.h(6)),
          child,
        ],
      ),
    );
  }
}

/// Checked-in share as a ring (mirrors web Ring).
class _Ring extends StatelessWidget {
  final double pct;
  const _Ring({required this.pct});

  @override
  Widget build(BuildContext context) {
    final size = context.r(68);
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        fit: StackFit.expand,
        children: [
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: pct),
            duration: MediaQuery.of(context).disableAnimations
                ? Duration.zero
                : const Duration(milliseconds: 700),
            curve: Curves.easeOutCubic,
            builder: (_, v, _) => CircularProgressIndicator(
              value: v,
              strokeWidth: 7,
              strokeCap: StrokeCap.round,
              color: AppColors.accent600,
              backgroundColor: AppColors.surfaceSubtle,
            ),
          ),
          Center(
            child: Text(
              '${(pct * 100).round()}%',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
                fontSize: context.sp(16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

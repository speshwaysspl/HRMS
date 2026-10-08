import '../../services/app_events.dart';
import '../../widgets/app_drawer.dart';
import 'package:flutter/material.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/hrms_app_bar.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import 'team_attendance_tab.dart';
import 'team_detail_screen.dart';

class MyTeamsScreen extends StatefulWidget {
  const MyTeamsScreen({super.key});

  @override
  State<MyTeamsScreen> createState() => _MyTeamsScreenState();
}

class _MyTeamsScreenState extends State<MyTeamsScreen> {
  final _service = TeamService();
  List<Map<String, dynamic>> _teams = [];
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    AppEvents.teamChanged.addListener(_onTeamChanged);
    _load();
  }

  /// Server push: someone changed a team this screen shows.
  void _onTeamChanged() {
    final e = AppEvents.teamChanged.value;
    if (e == null || !mounted) return;
    if (const {'team', 'members', 'deleted', 'resync'}.contains(e['kind'])) _load();
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
      final data = await _service.getTeams();
      if (!mounted) return;
      setState(() {
        _teams = data;
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
    return Scaffold(
      appBar: HrmsAppBar(title: const Text('My Teams')),
      // Tab root gets the menu; when pushed, keep the back arrow.
      drawer: Navigator.of(context).canPop() ? null : const AppDrawer(),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: const [
                SkeletonListTile(),
                SkeletonListTile(),
                SkeletonListTile(),
                SkeletonListTile(),
              ],
            )
          : _error != null
          ? buildErrorState(_error!, _load)
          : RefreshIndicator(
              onRefresh: _load,
              child: _teams.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 100),
                        EmptyStateView(
                          icon: Icons.groups_outlined,
                          title: 'No teams assigned to you yet.',
                        ),
                      ],
                    )
                  : ListView(
                      padding: EdgeInsets.fromLTRB(
                        context.w(16),
                        context.h(4),
                        context.w(16),
                        context.h(24),
                      ),
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Your teams · ${_teams.length}',
                                style: TextStyle(
                                  color: AppColors.inkMuted,
                                  fontSize: context.sp(13),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            TextButton.icon(
                              onPressed: () =>
                                  downloadAllTeamsAttendance(context),
                              icon: Icon(
                                Icons.table_view_outlined,
                                size: context.r(20),
                              ),
                              label: const Text('Attendance'),
                            ),
                          ],
                        ),
                        SizedBox(height: context.h(4)),
                        ..._teams.map(
                          (t) => Padding(
                            padding: EdgeInsets.only(bottom: context.h(12)),
                            child: _TeamCard(
                              team: t,
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => TeamDetailScreen(
                                    id: t['_id'].toString(),
                                    name: t['name']?.toString() ?? 'Team',
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
            ),
    );
  }
}

List<String> _memberNames(Map<String, dynamic> team) {
  final members = (team['members'] as List?) ?? const [];
  return members.map((m) {
    if (m is Map) {
      final e = m['employeeId'];
      final u = e is Map ? e['userId'] : m['userId'];
      if (u is Map && u['name'] != null) return u['name'].toString();
      if (m['name'] != null) return m['name'].toString();
    }
    return '';
  }).toList();
}

String _initials(String name) {
  final parts = name
      .trim()
      .split(RegExp(r'\s+'))
      .where((p) => p.isNotEmpty)
      .toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts.first[0].toUpperCase();
  return (parts.first[0] + parts.last[0]).toUpperCase();
}

class _TeamCard extends StatelessWidget {
  final Map<String, dynamic> team;
  final VoidCallback onTap;
  const _TeamCard({required this.team, required this.onTap});

  static const _maxAvatars = 4;

  @override
  Widget build(BuildContext context) {
    final name = team['name']?.toString() ?? 'Team';
    final description = team['description']?.toString().trim() ?? '';
    final names = _memberNames(team);
    final count = names.length;
    final shown = names.take(_maxAvatars).toList();
    final overflow = count > _maxAvatars;
    final size = context.r(30);
    final step = size * 0.7;
    final radius = BorderRadius.circular(AppRadius.card);

    return Semantics(
      button: true,
      label: '$name, $count ${count == 1 ? 'member' : 'members'}',
      excludeSemantics: true,
      child: Material(
        color: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: BorderSide(color: AppColors.surfaceSubtle),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Padding(
            padding: EdgeInsets.all(context.w(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.ink,
                          fontSize: context.sp(16),
                        ),
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      color: AppColors.inkFaint,
                      size: context.r(22),
                    ),
                  ],
                ),
                if (description.isNotEmpty) ...[
                  SizedBox(height: context.h(4)),
                  Text(
                    description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColors.inkMuted,
                      fontSize: context.sp(13),
                      height: 1.4,
                    ),
                  ),
                ],
                SizedBox(height: context.h(14)),
                Row(
                  children: [
                    if (shown.isNotEmpty) ...[
                      SizedBox(
                        height: size,
                        width:
                            size +
                            (shown.length - 1 + (overflow ? 1 : 0)) * step,
                        child: Stack(
                          children: [
                            for (var i = 0; i < shown.length; i++)
                              Positioned(
                                left: i * step,
                                child: _Avatar(
                                  text: _initials(shown[i]),
                                  size: size,
                                ),
                              ),
                            if (overflow)
                              Positioned(
                                left: shown.length * step,
                                child: _Avatar(
                                  text: '+${count - _maxAvatars}',
                                  size: size,
                                  muted: true,
                                ),
                              ),
                          ],
                        ),
                      ),
                      SizedBox(width: context.w(10)),
                    ],
                    Expanded(
                      child: Text(
                        count == 0
                            ? 'No members yet'
                            : '$count ${count == 1 ? 'member' : 'members'}',
                        style: TextStyle(
                          color: AppColors.inkMuted,
                          fontSize: context.sp(13),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String text;
  final double size;
  final bool muted;
  const _Avatar({required this.text, required this.size, this.muted = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: muted ? AppColors.surfaceSubtle : AppColors.brand50,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.surface, width: 2),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: size * 0.36,
          fontWeight: FontWeight.w700,
          color: muted ? AppColors.inkMuted : AppColors.brand500,
        ),
      ),
    );
  }
}

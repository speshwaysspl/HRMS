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
import 'team_palette.dart';

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
  String _query = '';

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
    if (const {'team', 'members', 'deleted', 'resync'}.contains(e['kind'])) {
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

  void _open(Map<String, dynamic> t) => Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => TeamDetailScreen(
        id: t['_id'].toString(),
        name: t['name']?.toString() ?? 'Team',
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final visible = q.isEmpty
        ? _teams
        : _teams
              .where(
                (t) =>
                    (t['name']?.toString().toLowerCase() ?? '').contains(q) ||
                    _leadName(t).toLowerCase().contains(q),
              )
              .toList();
    final totalMembers = _teams.fold<int>(
      0,
      (a, t) => a + _memberNames(t).length,
    );
    final pad = context.w(16);

    return Scaffold(
      appBar: HrmsAppBar(title: const Text('My Teams')),
      // Tab root gets the menu; when pushed, keep the back arrow.
      drawer: Navigator.of(context).canPop() ? null : const AppDrawer(),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(pad),
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
                        pad,
                        context.h(12),
                        pad,
                        context.h(24),
                      ),
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                onChanged: (v) => setState(() => _query = v),
                                textInputAction: TextInputAction.search,
                                decoration: InputDecoration(
                                  hintText: 'Search team or lead...',
                                  prefixIcon: const Icon(Icons.search_rounded),
                                  filled: true,
                                  fillColor: AppColors.surface,
                                  contentPadding: EdgeInsets.symmetric(
                                    vertical: context.h(12),
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(
                                      context.r(14),
                                    ),
                                    borderSide: BorderSide(
                                      color: AppColors.surfaceSubtle,
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(
                                      context.r(14),
                                    ),
                                    borderSide: BorderSide(
                                      color: AppColors.surfaceSubtle,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            SizedBox(width: context.w(10)),
                            Tooltip(
                              message: 'Download all teams attendance (Excel)',
                              child: Material(
                                color: AppColors.brand50,
                                borderRadius: BorderRadius.circular(
                                  context.r(14),
                                ),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(
                                    context.r(14),
                                  ),
                                  onTap: () =>
                                      downloadAllTeamsAttendance(context),
                                  child: SizedBox(
                                    width: context.r(50),
                                    height: context.r(50),
                                    child: Icon(
                                      Icons.description_outlined,
                                      color: AppColors.brand500,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: context.h(12)),
                        _SummaryCard(
                          teams: _teams.length,
                          members: totalMembers,
                        ),
                        if (visible.isEmpty)
                          Padding(
                            padding: EdgeInsets.symmetric(
                              vertical: context.h(32),
                            ),
                            child: Center(
                              child: Text(
                                'No team matches "$_query".',
                                style: TextStyle(color: AppColors.inkMuted),
                              ),
                            ),
                          ),
                        for (final t in visible)
                          Padding(
                            padding: EdgeInsets.only(top: context.h(10)),
                            child: _TeamCard(team: t, onTap: () => _open(t)),
                          ),
                      ],
                    ),
            ),
    );
  }
}

String _leadName(Map<String, dynamic> team) {
  final lead = team['leadId'];
  return lead is Map ? (lead['name']?.toString().trim() ?? '') : '';
}

List<String> _memberNames(Map<String, dynamic> team) {
  final members = (team['members'] as List?) ?? const [];
  return members.map((m) {
    if (m is Map) {
      final e = m['employeeId'];
      final u = e is Map ? e['userId'] : m['userId'];
      if (u is Map && u['name'] != null) return u['name'].toString().trim();
      if (m['name'] != null) return m['name'].toString().trim();
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

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.teams, required this.members});
  final int teams;
  final int members;

  @override
  Widget build(BuildContext context) {
    Widget stat(int v, String label) => Expanded(
      child: Semantics(
        label: '$v $label',
        excludeSemantics: true,
        child: Column(
          children: [
            Text(
              '$v',
              style: TextStyle(
                fontSize: context.sp(20),
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: context.sp(12.5),
                color: AppColors.inkMuted,
              ),
            ),
          ],
        ),
      ),
    );

    return Container(
      padding: EdgeInsets.all(context.w(14)),
      decoration: TeamPalette.card(context.r(16)),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(context.w(10)),
            decoration: BoxDecoration(
              color: AppColors.brand50,
              borderRadius: BorderRadius.circular(context.r(12)),
            ),
            child: Icon(Icons.groups_rounded, color: AppColors.brand500),
          ),
          SizedBox(width: context.w(12)),
          Expanded(
            flex: 2,
            child: Text(
              'Teams you lead',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: context.sp(15),
                color: AppColors.ink,
              ),
            ),
          ),
          stat(teams, teams == 1 ? 'Team' : 'Teams'),
          Container(
            width: 1,
            height: context.h(32),
            color: AppColors.surfaceSubtle,
          ),
          stat(members, 'Members'),
        ],
      ),
    );
  }
}

class _TeamCard extends StatelessWidget {
  final Map<String, dynamic> team;
  final VoidCallback onTap;
  const _TeamCard({required this.team, required this.onTap});

  static const _maxAvatars = 4;

  /// "Devops KT 8" -> "D8", "Devops 23" -> "D23", "Platform" -> "P".
  static String _badge(String name) {
    final words = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty)
        .toList();
    if (words.isEmpty) return '?';
    final number = RegExp(r'\d+$').firstMatch(words.last)?.group(0);
    if (number != null && number.length <= 3) {
      return '${words.first[0].toUpperCase()}$number';
    }
    if (words.length == 1) return words.first[0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final name = team['name']?.toString().trim() ?? 'Team';
    final lead = _leadName(team);
    final description = team['description']?.toString().trim() ?? '';
    final names = _memberNames(team);
    final count = names.length;
    final shown = names.take(_maxAvatars).toList();
    final overflow = count > _maxAvatars;
    final size = context.r(34);
    final step = size * 0.78;
    final radius = BorderRadius.circular(context.r(16));

    return Semantics(
      button: true,
      label:
          '$name${lead.isNotEmpty ? ', lead $lead' : ''}, $count ${count == 1 ? 'member' : 'members'}',
      excludeSemantics: true,
      child: Material(
        color: AppColors.surface,
        borderRadius: radius,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Container(
            padding: EdgeInsets.all(context.w(14)),
            decoration: TeamPalette.card(context.r(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: context.r(22),
                      backgroundColor: AppColors.brand50,
                      child: Text(
                        _badge(name),
                        style: TextStyle(
                          color: AppColors.brand500,
                          fontWeight: FontWeight.w700,
                          fontSize: context.sp(13.5),
                        ),
                      ),
                    ),
                    SizedBox(width: context.w(12)),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: AppColors.ink,
                              fontSize: context.sp(16),
                            ),
                          ),
                          if (lead.isNotEmpty)
                            Text(
                              'Lead: $lead',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: AppColors.inkMuted,
                                fontSize: context.sp(12.5),
                              ),
                            ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: AppColors.inkFaint,
                      size: context.r(24),
                    ),
                  ],
                ),
                if (description.isNotEmpty) ...[
                  SizedBox(height: context.h(10)),
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
                Padding(
                  padding: EdgeInsets.symmetric(vertical: context.h(12)),
                  child: Divider(height: 1, color: AppColors.surfaceSubtle),
                ),
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
                      SizedBox(width: context.w(12)),
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
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 3),
          child: Text(
            text,
            style: TextStyle(
              fontSize: size * 0.34,
              fontWeight: FontWeight.w700,
              color: muted ? AppColors.inkMuted : AppColors.brand500,
            ),
          ),
        ),
      ),
    );
  }
}

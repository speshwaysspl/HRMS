import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/state_views.dart';
import 'team_palette.dart';

enum _MemberFilter { all, overdue, pending, complete }

/// Team members with their task progress: search, filter, a team summary and
/// one card per member. Mirrors the web Members tab.
class TeamMembersTab extends StatefulWidget {
  const TeamMembersTab({
    super.key,
    required this.stats,
    required this.onRefresh,
    required this.onOpen,
  });

  /// `memberStats` rows: { member, totalTasks, completed, pending, overdue, progress }.
  final List<Map> stats;
  final Future<void> Function() onRefresh;
  final void Function(Map stat) onOpen;

  @override
  State<TeamMembersTab> createState() => _TeamMembersTabState();
}

class _TeamMembersTabState extends State<TeamMembersTab> {
  String _query = '';
  _MemberFilter _filter = _MemberFilter.all;

  static int _n(Map m, String k) => (m[k] as num?)?.toInt() ?? 0;
  static String _name(Map m) =>
      ((m['member'] as Map?)?['userId'] as Map?)?['name']?.toString().trim() ??
      'Unknown';
  static String _empId(Map m) =>
      (m['member'] as Map?)?['employeeId']?.toString() ?? '';

  bool _matches(Map m) {
    final q = _query.trim().toLowerCase();
    if (q.isNotEmpty &&
        !_name(m).toLowerCase().contains(q) &&
        !_empId(m).toLowerCase().contains(q)) {
      return false;
    }
    return switch (_filter) {
      _MemberFilter.all => true,
      _MemberFilter.overdue => _n(m, 'overdue') > 0,
      _MemberFilter.pending => _n(m, 'pending') > 0,
      _MemberFilter.complete =>
        _n(m, 'totalTasks') > 0 && _n(m, 'completed') == _n(m, 'totalTasks'),
    };
  }

  @override
  Widget build(BuildContext context) {
    final stats = widget.stats;
    if (stats.isEmpty) {
      return RefreshIndicator(
        onRefresh: widget.onRefresh,
        child: ListView(
          children: const [
            SizedBox(height: 100),
            EmptyStateView(
              icon: Icons.person_outline,
              title: 'No members in this team yet',
            ),
          ],
        ),
      );
    }

    final completed = stats.fold<int>(0, (a, m) => a + _n(m, 'completed'));
    final pending = stats.fold<int>(0, (a, m) => a + _n(m, 'pending'));
    final overdue = stats.fold<int>(0, (a, m) => a + _n(m, 'overdue'));
    final visible = stats.where(_matches).toList();
    final pad = context.w(16);

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        padding: EdgeInsets.fromLTRB(pad, context.h(12), pad, context.h(24)),
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  onChanged: (v) => setState(() => _query = v),
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Search member by name or ID...',
                    prefixIcon: const Icon(Icons.search_rounded),
                    filled: true,
                    fillColor: AppColors.surface,
                    contentPadding: EdgeInsets.symmetric(
                      vertical: context.h(12),
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(context.r(14)),
                      borderSide: BorderSide(color: AppColors.surfaceSubtle),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(context.r(14)),
                      borderSide: BorderSide(color: AppColors.surfaceSubtle),
                    ),
                  ),
                ),
              ),
              SizedBox(width: context.w(10)),
              _FilterButton(
                value: _filter,
                onChanged: (f) => setState(() => _filter = f),
              ),
            ],
          ),
          SizedBox(height: context.h(12)),
          _SummaryCard(
            members: stats.length,
            completed: completed,
            pending: pending,
            overdue: overdue,
          ),
          if (visible.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: context.h(32)),
              child: Center(
                child: Text(
                  'No members match this search or filter.',
                  style: TextStyle(color: AppColors.inkMuted),
                ),
              ),
            ),
          for (final m in visible)
            _MemberCard(
              name: _name(m),
              employeeId: _empId(m),
              total: _n(m, 'totalTasks'),
              completed: _n(m, 'completed'),
              pending: _n(m, 'pending'),
              overdue: _n(m, 'overdue'),
              progress: ((m['progress'] as num?) ?? 0).toDouble(),
              onTap: () => widget.onOpen(m),
            ),
        ],
      ),
    );
  }
}

class _FilterButton extends StatelessWidget {
  const _FilterButton({required this.value, required this.onChanged});
  final _MemberFilter value;
  final ValueChanged<_MemberFilter> onChanged;

  static const _labels = {
    _MemberFilter.all: 'All members',
    _MemberFilter.overdue: 'Has overdue tasks',
    _MemberFilter.pending: 'Has pending tasks',
    _MemberFilter.complete: 'All tasks completed',
  };

  @override
  Widget build(BuildContext context) {
    final active = value != _MemberFilter.all;
    return PopupMenuButton<_MemberFilter>(
      tooltip: 'Filter members',
      initialValue: value,
      onSelected: onChanged,
      itemBuilder: (_) => [
        for (final e in _labels.entries)
          CheckedPopupMenuItem(
            value: e.key,
            checked: e.key == value,
            child: Text(e.value),
          ),
      ],
      child: Container(
        width: context.r(50),
        height: context.r(50),
        decoration: BoxDecoration(
          color: active ? AppColors.brand50 : AppColors.surface,
          borderRadius: BorderRadius.circular(context.r(14)),
          border: Border.all(
            color: active ? AppColors.brand500 : AppColors.surfaceSubtle,
          ),
        ),
        child: Icon(
          Icons.filter_alt_outlined,
          color: active ? AppColors.brand500 : AppColors.ink,
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.members,
    required this.completed,
    required this.pending,
    required this.overdue,
  });
  final int members, completed, pending, overdue;

  @override
  Widget build(BuildContext context) {
    Widget stat(int v, String label, Color c) => Expanded(
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
                color: c,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            SizedBox(height: context.h(2)),
            Text(
              label,
              maxLines: 1,
              style: TextStyle(
                fontSize: context.sp(12.5),
                color: AppColors.inkMuted,
              ),
            ),
          ],
        ),
      ),
    );
    Widget divider() => Container(
      width: 1,
      height: context.h(32),
      color: AppColors.surfaceSubtle,
    );

    return Container(
      padding: EdgeInsets.all(context.w(14)),
      decoration: TeamPalette.card(context.r(16)),
      child: Column(
        children: [
          Row(
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$members member${members == 1 ? '' : 's'}',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: context.sp(15.5),
                        color: AppColors.ink,
                      ),
                    ),
                    Text(
                      'Task progress across the team',
                      style: TextStyle(
                        fontSize: context.sp(12.5),
                        color: AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          Padding(
            padding: EdgeInsets.symmetric(vertical: context.h(12)),
            child: Divider(height: 1, color: AppColors.surfaceSubtle),
          ),
          Row(
            children: [
              stat(completed, 'Completed', TeamPalette.ok),
              divider(),
              stat(pending, 'Pending', TeamPalette.warn),
              divider(),
              stat(overdue, 'Overdue', TeamPalette.bad),
            ],
          ),
        ],
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  const _MemberCard({
    required this.name,
    required this.employeeId,
    required this.total,
    required this.completed,
    required this.pending,
    required this.overdue,
    required this.progress,
    required this.onTap,
  });
  final String name, employeeId;
  final int total, completed, pending, overdue;
  final double progress;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    Widget legend(Color c, String label, int v) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: c, shape: BoxShape.circle),
        ),
        SizedBox(width: context.w(5)),
        Text(
          '$label $v',
          style: TextStyle(
            color: c,
            fontSize: context.sp(12),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );

    return Padding(
      padding: EdgeInsets.only(top: context.h(10)),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(context.r(16)),
        child: InkWell(
          borderRadius: BorderRadius.circular(context.r(16)),
          onTap: onTap,
          child: Container(
            padding: EdgeInsets.all(context.w(14)),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(context.r(16)),
              border: Border.all(color: AppColors.surfaceSubtle),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: context.r(20),
                      backgroundColor: AppColors.brand50,
                      child: Text(
                        (name.isNotEmpty ? name[0] : '?').toUpperCase(),
                        style: TextStyle(
                          color: AppColors.brand500,
                          fontWeight: FontWeight.w700,
                          fontSize: context.sp(15),
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
                              fontSize: context.sp(15),
                              color: AppColors.ink,
                            ),
                          ),
                          if (employeeId.isNotEmpty)
                            Text(
                              employeeId,
                              style: TextStyle(
                                color: AppColors.inkMuted,
                                fontSize: context.sp(12.5),
                              ),
                            ),
                        ],
                      ),
                    ),
                    Text(
                      'Total: $total',
                      style: TextStyle(
                        color: AppColors.inkMuted,
                        fontSize: context.sp(13),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: context.h(12)),
                Semantics(
                  label: '${progress.round()} percent complete',
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: (progress / 100).clamp(0.0, 1.0),
                      minHeight: context.h(6),
                      color: TeamPalette.ok,
                      backgroundColor: AppColors.surfaceSubtle,
                    ),
                  ),
                ),
                SizedBox(height: context.h(10)),
                Row(
                  children: [
                    Expanded(
                      child: Wrap(
                        spacing: context.w(14),
                        runSpacing: context.h(4),
                        children: [
                          legend(TeamPalette.ok, 'Completed', completed),
                          legend(TeamPalette.warn, 'Pending', pending),
                          legend(TeamPalette.bad, 'Overdue', overdue),
                        ],
                      ),
                    ),
                    Text(
                      '${progress.round()}%',
                      style: TextStyle(
                        color: AppColors.inkMuted,
                        fontSize: context.sp(12.5),
                        fontWeight: FontWeight.w600,
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

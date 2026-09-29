import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_client.dart';
import '../../services/milestone_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/state_views.dart';

final _ymd = DateFormat('yyyy-MM-dd');
final _pretty = DateFormat('EEE, d MMM');

/// Monday–Sunday of the current week shifted by [offset] weeks.
({DateTime start, DateTime due}) weekRange(int offset) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final monday = today
      .subtract(Duration(days: today.weekday - 1))
      .add(Duration(days: 7 * offset));
  return (start: monday, due: monday.add(const Duration(days: 6)));
}

DateTime? _parse(dynamic v) =>
    DateTime.tryParse(v?.toString() ?? '')?.toLocal();

/// Mirrors web MilestonesPanel.jsx: open/closed milestones with progress, and
/// create / edit / close / reopen / delete for the team lead or an admin.
class MilestonesTab extends StatefulWidget {
  const MilestonesTab({
    super.key,
    required this.teamId,
    required this.milestones,
    required this.canManage,
    required this.onChanged,
    required this.onViewTasks,
    this.unplannedCount = 0,
  });

  final String teamId;
  final List<Map<String, dynamic>> milestones;
  final bool canManage;
  final Future<void> Function() onChanged;
  final void Function(String milestoneId) onViewTasks;
  final int unplannedCount;

  @override
  State<MilestonesTab> createState() => _MilestonesTabState();
}

class _MilestonesTabState extends State<MilestonesTab> {
  final _service = MilestoneService();
  bool _showClosed = false;

  void _toast(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _run(Future<void> Function() fn, String done) async {
    try {
      await fn();
      _toast(done);
      await widget.onChanged();
    } catch (e) {
      _toast(extractErrorMessage(e));
    }
  }

  Future<void> _delete(Map m) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete milestone?'),
        content: Text(
          '"${m['title']}" will be removed. Its tasks stay, just unlinked.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok == true) {
      _run(() => _service.delete(m['_id'].toString()), 'Milestone deleted');
    }
  }

  String _dueText(Map m, {required bool closed}) {
    if (closed) {
      final c = _parse(m['closedAt']);
      return c == null ? 'Closed' : 'Closed ${_pretty.format(c)}';
    }
    final due = _parse(m['dueDate']);
    if (due == null) return 'No due date';
    final now = DateTime.now();
    final days = DateTime(
      due.year,
      due.month,
      due.day,
    ).difference(DateTime(now.year, now.month, now.day)).inDays;
    if (days < 0) return 'Past due by ${-days} day${days == -1 ? '' : 's'}';
    if (days == 0) return 'Due today';
    return 'Due by ${_pretty.format(due)}';
  }

  @override
  Widget build(BuildContext context) {
    final open = widget.milestones
        .where((m) => m['state'] != 'closed')
        .toList();
    final closed = widget.milestones
        .where((m) => m['state'] == 'closed')
        .toList();
    final shown = _showClosed ? closed : open;
    final showUnplanned = !_showClosed && widget.unplannedCount > 0;

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(
            context.w(16),
            context.h(8),
            context.w(16),
            context.h(4),
          ),
          child: SegmentedButton<bool>(
            showSelectedIcon: false,
            segments: [
              ButtonSegment(
                value: false,
                icon: const Icon(Icons.flag_outlined),
                label: Text('${open.length} Open'),
              ),
              ButtonSegment(
                value: true,
                icon: const Icon(Icons.check_circle_outline),
                label: Text('${closed.length} Closed'),
              ),
            ],
            selected: {_showClosed},
            onSelectionChanged: (s) => setState(() => _showClosed = s.first),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: widget.onChanged,
            child: shown.isEmpty && !showUnplanned
                ? ListView(
                    children: [
                      const SizedBox(height: 60),
                      EmptyStateView(
                        icon: Icons.flag_outlined,
                        title: _showClosed
                            ? 'No closed milestones yet'
                            : 'No open milestones',
                        subtitle: _showClosed
                            ? 'Close a milestone when its week is done.'
                            : widget.canManage
                            ? 'Plan the week: tap New milestone, open it and add its tasks.'
                            : "Your team lead hasn't planned a milestone yet.",
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: EdgeInsets.fromLTRB(
                      context.w(16),
                      context.h(4),
                      context.w(16),
                      context.h(96),
                    ),
                    itemCount: shown.length + (showUnplanned ? 1 : 0),
                    itemBuilder: (_, i) => i < shown.length
                        ? _card(shown[i], closed: _showClosed)
                        : SimpleCard(
                            onTap: () => widget.onViewTasks('none'),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Unplanned tasks',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.ink,
                                        ),
                                      ),
                                      Text(
                                        'Tasks not in any milestone',
                                        style: TextStyle(
                                          color: AppColors.inkMuted,
                                          fontSize: context.sp(12),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '${widget.unplannedCount}',
                                  style: TextStyle(
                                    color: AppColors.inkMuted,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Icon(
                                  Icons.chevron_right,
                                  color: AppColors.inkFaint,
                                ),
                              ],
                            ),
                          ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _card(Map<String, dynamic> m, {required bool closed}) {
    final progress = (m['progress'] as num?)?.toInt() ?? 0;
    final dueText = _dueText(m, closed: closed);
    final late = dueText.startsWith('Past due');
    final desc = (m['description'] ?? '').toString();
    final id = m['_id'].toString();

    return SimpleCard(
      onTap: () => widget.onViewTasks(id),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(top: context.h(4)),
                  child: Text(
                    m['title']?.toString() ?? '',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: context.sp(16),
                      color: AppColors.ink,
                    ),
                  ),
                ),
              ),
              if (widget.canManage)
                PopupMenuButton<String>(
                  tooltip: 'Milestone actions',
                  onSelected: (a) {
                    switch (a) {
                      case 'edit':
                        _openForm(m);
                      case 'close':
                        _run(
                          () => _service.setState(id, 'closed'),
                          'Milestone closed',
                        );
                      case 'reopen':
                        _run(
                          () => _service.setState(id, 'open'),
                          'Milestone reopened',
                        );
                      case 'delete':
                        _delete(m);
                    }
                  },
                  itemBuilder: (_) => [
                    const PopupMenuItem(
                      value: 'edit',
                      child: ListTile(
                        leading: Icon(Icons.edit_outlined),
                        title: Text('Edit'),
                      ),
                    ),
                    closed
                        ? const PopupMenuItem(
                            value: 'reopen',
                            child: ListTile(
                              leading: Icon(Icons.replay),
                              title: Text('Reopen'),
                            ),
                          )
                        : const PopupMenuItem(
                            value: 'close',
                            child: ListTile(
                              leading: Icon(Icons.check_circle_outline),
                              title: Text('Close'),
                            ),
                          ),
                    PopupMenuItem(
                      value: 'delete',
                      child: ListTile(
                        leading: const Icon(
                          Icons.delete_outline,
                          color: AppColors.danger,
                        ),
                        title: Text(
                          'Delete',
                          style: TextStyle(color: AppColors.danger),
                        ),
                      ),
                    ),
                  ],
                ),
            ],
          ),
          Row(
            children: [
              Icon(
                Icons.event_outlined,
                size: context.r(14),
                color: late ? AppColors.danger : AppColors.inkFaint,
              ),
              SizedBox(width: context.w(4)),
              Text(
                dueText,
                style: TextStyle(
                  fontSize: context.sp(12),
                  color: late ? AppColors.danger : AppColors.inkMuted,
                  fontWeight: late ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ],
          ),
          if (desc.isNotEmpty) ...[
            SizedBox(height: context.h(6)),
            Text(
              desc,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: AppColors.inkMuted,
                fontSize: context.sp(13),
              ),
            ),
          ],
          SizedBox(height: context.h(12)),
          Semantics(
            label: '$progress percent complete',
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress / 100,
                minHeight: 6,
                backgroundColor: AppColors.surfaceSubtle,
                color: AppColors.accent600,
              ),
            ),
          ),
          SizedBox(height: context.h(6)),
          Text(
            '$progress% complete · ${m['openTasks'] ?? 0} open · ${m['completedTasks'] ?? 0} done',
            style: TextStyle(
              color: AppColors.inkMuted,
              fontSize: context.sp(12),
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openForm([Map<String, dynamic>? m]) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => MilestoneFormSheet(teamId: widget.teamId, milestone: m),
    );
    if (ok == true) {
      _toast(m == null ? 'Milestone created' : 'Milestone saved');
      await widget.onChanged();
    }
  }
}

/// Opens the create sheet from outside the tab (the screen's FAB).
Future<bool> showNewMilestoneSheet(BuildContext context, String teamId) async {
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => MilestoneFormSheet(teamId: teamId),
  );
  return ok == true;
}

class MilestoneFormSheet extends StatefulWidget {
  const MilestoneFormSheet({super.key, required this.teamId, this.milestone});
  final String teamId;
  final Map<String, dynamic>? milestone;

  @override
  State<MilestoneFormSheet> createState() => _MilestoneFormSheetState();
}

class _MilestoneFormSheetState extends State<MilestoneFormSheet> {
  final _service = MilestoneService();
  late final _title = TextEditingController(
    text: widget.milestone?['title']?.toString() ?? '',
  );
  late final _desc = TextEditingController(
    text: widget.milestone?['description']?.toString() ?? '',
  );
  late DateTime? _start = widget.milestone == null
      ? weekRange(0).start
      : _parse(widget.milestone!['startDate']);
  late DateTime? _due = widget.milestone == null
      ? weekRange(0).due
      : _parse(widget.milestone!['dueDate']);
  bool _busy = false;
  String? _err;

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _pick(bool start) async {
    final d = await showDatePicker(
      context: context,
      initialDate: (start ? _start : _due) ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
    );
    if (d != null) setState(() => start ? _start = d : _due = d);
  }

  bool _isWeek(int offset) {
    final r = weekRange(offset);
    bool same(DateTime? a, DateTime b) =>
        a != null && a.year == b.year && a.month == b.month && a.day == b.day;
    return same(_start, r.start) && same(_due, r.due);
  }

  Future<void> _submit() async {
    if (_title.text.trim().isEmpty) {
      setState(() => _err = 'Give the milestone a title');
      return;
    }
    if (_start != null && _due != null && _due!.isBefore(_start!)) {
      setState(() => _err = "Due date can't be before the start date");
      return;
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final start = _start == null ? null : _ymd.format(_start!);
      final due = _due == null ? null : _ymd.format(_due!);
      if (widget.milestone == null) {
        await _service.create(
          teamId: widget.teamId,
          title: _title.text.trim(),
          description: _desc.text.trim(),
          startDate: start,
          dueDate: due,
        );
      } else {
        await _service.update(
          widget.milestone!['_id'].toString(),
          title: _title.text.trim(),
          description: _desc.text.trim(),
          startDate: start,
          dueDate: due,
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _err = extractErrorMessage(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final f = DateFormat('d MMM yyyy');
    return Padding(
      padding: EdgeInsets.fromLTRB(
        context.w(20),
        context.h(20),
        context.w(20),
        MediaQuery.of(context).viewInsets.bottom + context.h(20),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.milestone == null ? 'New milestone' : 'Edit milestone',
              style: TextStyle(
                fontSize: context.sp(16),
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(12)),
            TextField(
              controller: _title,
              enabled: !_busy,
              autofocus: widget.milestone == null,
              decoration: const InputDecoration(
                labelText: 'Title',
                hintText: 'e.g. Week 40 – Auth screens',
              ),
            ),
            SizedBox(height: context.h(14)),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Week',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                  ),
                ),
                for (final (label, off) in [
                  ('This week', 0),
                  ('Next week', 1),
                ]) ...[
                  SizedBox(width: context.w(6)),
                  ChoiceChip(
                    label: Text(label),
                    selected: _isWeek(off),
                    onSelected: _busy
                        ? null
                        : (_) => setState(() {
                            final r = weekRange(off);
                            _start = r.start;
                            _due = r.due;
                          }),
                  ),
                ],
              ],
            ),
            SizedBox(height: context.h(8)),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _busy ? null : () => _pick(true),
                    child: Text(
                      _start == null ? 'Starts' : 'From ${f.format(_start!)}',
                    ),
                  ),
                ),
                SizedBox(width: context.w(10)),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _busy ? null : () => _pick(false),
                    child: Text(
                      _due == null ? 'Due' : 'Due ${f.format(_due!)}',
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: context.h(14)),
            TextField(
              controller: _desc,
              enabled: !_busy,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                hintText: 'What should the team ship this week?',
              ),
            ),
            if (_err != null)
              Padding(
                padding: EdgeInsets.only(top: context.h(8)),
                child: Text(
                  _err!,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ),
            SizedBox(height: context.h(16)),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        widget.milestone == null
                            ? 'Create milestone'
                            : 'Save changes',
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

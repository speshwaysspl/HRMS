import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../services/app_events.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import '../../services/api_client.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/state_views.dart';
import '../../widgets/month_picker_dialog.dart';
import 'team_palette.dart';

/// Month + year picker (no day). Returns the first day of the chosen month.
Future<DateTime?> showMonthPicker(BuildContext context, {DateTime? initial}) =>
    showHrmsMonthPicker(context, initial: initial);

/// Asks for a month and opens the all-teams attendance Excel.
Future<void> downloadAllTeamsAttendance(BuildContext context) async {
  final picked = await showMonthPicker(context);
  if (picked == null || !context.mounted) return;
  final messenger = ScaffoldMessenger.of(context);
  messenger.showSnackBar(const SnackBar(content: Text('Preparing Excel...')));
  try {
    final file = await TeamService().exportAllTeamsAttendance(
      DateFormat('yyyy-MM').format(picked),
    );
    final r = await OpenFilex.open(file.path);
    if (r.type != ResultType.done) {
      messenger.showSnackBar(SnackBar(content: Text('Saved to ${file.path}')));
    }
  } catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
  }
}

/// Team lead's manual daily roll-call: each member is present, half day or
/// absent. Independent of punch-in attendance. Monthly register exports to Excel.
class TeamAttendanceTab extends StatefulWidget {
  const TeamAttendanceTab({
    super.key,
    required this.teamId,
    required this.teamName,
    required this.members,
  });

  final String teamId;
  final String teamName;

  /// Populated Employee maps (`_id`, `employeeId`, `userId.name`).
  final List<Map> members;

  @override
  State<TeamAttendanceTab> createState() => _TeamAttendanceTabState();
}

class _TeamAttendanceTabState extends State<TeamAttendanceTab>
    with AutomaticKeepAliveClientMixin {
  final _service = TeamService();
  static final _dayFmt = DateFormat('yyyy-MM-dd');
  DateTime _date = DateTime.now();
  Set<String> _present = {};
  Set<String> _half = {};
  bool _marked = false;
  bool _loading = true;
  bool _saving = false;
  bool _exporting = false;
  String _query = '';
  Object? _error;

  @override
  bool get wantKeepAlive => true;

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
    if (e['kind'] == 'resync' ||
        (e['teamId'] == widget.teamId && e['kind'] == 'attendance')) {
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
      final r = await _service.getTeamAttendance(
        widget.teamId,
        _dayFmt.format(_date),
      );
      if (!mounted) return;
      setState(() {
        _present = r.present;
        _half = r.halfDay;
        _marked = r.marked;
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

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (d == null) return;
    _date = d;
    _load();
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await _service.saveTeamAttendance(
        widget.teamId,
        _dayFmt.format(_date),
        _present,
        halfDay: _half,
      );
      if (!mounted) return;
      setState(() => _marked = true);
      _snack('Attendance saved');
    } catch (e) {
      _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _export() async {
    final month = await showMonthPicker(context, initial: _date);
    if (month == null) return;
    setState(() => _exporting = true);
    try {
      final file = await _service.exportTeamAttendance(
        widget.teamId,
        widget.teamName,
        DateFormat('yyyy-MM').format(month),
      );
      final r = await OpenFilex.open(file.path);
      if (r.type != ResultType.done) _snack('Saved to ${file.path}');
    } catch (e) {
      _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  String _id(Map m) => m['_id'].toString();
  String _name(Map m) =>
      (m['userId'] as Map?)?['name']?.toString().trim() ?? 'Unknown';

  void _setStatus(String id, String v) => setState(() {
    _present.remove(id);
    _half.remove(id);
    if (v == 'present') _present.add(id);
    if (v == 'half') _half.add(id);
  });

  void _toggleAll(bool allSelected) => setState(() {
    _present = allSelected ? {} : widget.members.map(_id).toSet();
    _half = {};
  });

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final members = widget.members;
    // Team leads change today only; admins can also correct past dates.
    final isToday = _dayFmt.format(_date) == _dayFmt.format(DateTime.now());
    final editable =
        isToday || (context.read<AuthProvider>().user?.isAdmin ?? false);
    final canEdit = editable && !_saving;
    final presentCount = members.where((m) => _present.contains(_id(m))).length;
    final halfCount = members.where((m) => _half.contains(_id(m))).length;
    final rest = members.length - presentCount - halfCount;
    // Until the day is saved, unchosen members are "not marked"; once saved
    // they count as absent.
    final absentCount = _marked ? rest : 0;
    final notMarkedCount = _marked ? 0 : rest;
    final allSelected = members.isNotEmpty && presentCount == members.length;

    final q = _query.trim().toLowerCase();
    final visible = q.isEmpty
        ? members
        : members
              .where(
                (m) =>
                    _name(m).toLowerCase().contains(q) ||
                    (m['employeeId']?.toString().toLowerCase() ?? '').contains(
                      q,
                    ),
              )
              .toList();

    final pad = context.w(16);

    Widget body;
    if (_loading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_error != null) {
      body = buildErrorState(_error!, _load);
    } else if (members.isEmpty) {
      body = const EmptyStateView(
        icon: Icons.group_outlined,
        title: 'No members in this team',
      );
    } else {
      body = ListView(
        padding: EdgeInsets.fromLTRB(pad, context.h(12), pad, context.h(12)),
        children: [
          _DateBar(
            date: _date,
            exporting: _exporting,
            onPickDate: _saving ? null : _pickDate,
            onExport: _exporting ? null : _export,
          ),
          SizedBox(height: context.h(12)),
          Row(
            children: [
              _StatTile(
                icon: Icons.groups_rounded,
                count: presentCount,
                label: 'Present',
                fg: TeamPalette.ok,
              ),
              SizedBox(width: context.w(8)),
              _StatTile(
                icon: Icons.timelapse_rounded,
                count: halfCount,
                label: 'Half Day',
                fg: TeamPalette.warn,
              ),
              SizedBox(width: context.w(8)),
              _StatTile(
                icon: Icons.person_off_rounded,
                count: absentCount,
                label: 'Absent',
                fg: TeamPalette.bad,
              ),
              SizedBox(width: context.w(8)),
              _StatTile(
                icon: Icons.group_outlined,
                count: notMarkedCount,
                label: 'Not Marked',
                fg: AppColors.ink,
              ),
            ],
          ),
          if (!editable || !isToday) ...[
            SizedBox(height: context.h(8)),
            Text(
              !editable
                  ? 'View only — attendance can be changed for today only.'
                  : 'Editing a past date.',
              style: TextStyle(
                fontSize: context.sp(12.5),
                fontWeight: FontWeight.w600,
                color: editable ? TeamPalette.warn : AppColors.inkMuted,
              ),
            ),
          ],
          SizedBox(height: context.h(12)),
          TextField(
            onChanged: (v) => setState(() => _query = v),
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Search member by name or ID...',
              prefixIcon: const Icon(Icons.search_rounded),
              filled: true,
              fillColor: AppColors.surfaceMuted,
              contentPadding: EdgeInsets.symmetric(vertical: context.h(12)),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(context.r(28)),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          SizedBox(height: context.h(12)),
          Material(
            color: AppColors.brand50,
            borderRadius: BorderRadius.circular(context.r(14)),
            child: InkWell(
              borderRadius: BorderRadius.circular(context.r(14)),
              onTap: canEdit ? () => _toggleAll(allSelected) : null,
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: context.w(8),
                  vertical: context.h(6),
                ),
                child: Row(
                  children: [
                    Checkbox(
                      value: allSelected,
                      onChanged: canEdit
                          ? (_) => _toggleAll(allSelected)
                          : null,
                    ),
                    Expanded(
                      child: Text(
                        'Mark all present',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.brand600,
                          fontSize: context.sp(14.5),
                        ),
                      ),
                    ),
                    Text(
                      'Total: ${members.length} members',
                      style: TextStyle(
                        color: AppColors.inkMuted,
                        fontSize: context.sp(12.5),
                      ),
                    ),
                    SizedBox(width: context.w(8)),
                  ],
                ),
              ),
            ),
          ),
          if (visible.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: context.h(24)),
              child: Center(
                child: Text(
                  'No member matches "$_query"',
                  style: TextStyle(color: AppColors.inkMuted),
                ),
              ),
            ),
          for (final m in visible)
            _MemberRow(
              name: _name(m),
              employeeId: m['employeeId']?.toString() ?? '',
              status: _half.contains(_id(m))
                  ? 'half'
                  : _present.contains(_id(m))
                  ? 'present'
                  : 'absent',
              onChanged: canEdit ? (v) => _setStatus(_id(m), v) : null,
            ),
        ],
      );
    }

    return Column(
      children: [
        Expanded(child: body),
        SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(pad, context.h(4), pad, context.h(12)),
            child: SizedBox(
              width: double.infinity,
              height: context.h(54),
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: TeamPalette.fill,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: AppColors.surfaceSubtle,
                  shape: const StadiumBorder(),
                  textStyle: TextStyle(
                    fontSize: context.sp(15.5),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                onPressed:
                    !editable ||
                        _saving ||
                        _loading ||
                        _error != null ||
                        members.isEmpty
                    ? null
                    : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.save_rounded),
                label: const Text('Save Attendance'),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _DateBar extends StatelessWidget {
  const _DateBar({
    required this.date,
    required this.exporting,
    required this.onPickDate,
    required this.onExport,
  });
  final DateTime date;
  final bool exporting;
  final VoidCallback? onPickDate;
  final VoidCallback? onExport;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(context.w(10)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(context.r(16)),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              button: true,
              label: 'Change date',
              child: InkWell(
                borderRadius: BorderRadius.circular(context.r(12)),
                onTap: onPickDate,
                child: Padding(
                  padding: EdgeInsets.all(context.w(4)),
                  child: Row(
                    children: [
                      Container(
                        padding: EdgeInsets.all(context.w(10)),
                        decoration: BoxDecoration(
                          color: AppColors.brand50,
                          borderRadius: BorderRadius.circular(context.r(12)),
                        ),
                        child: Icon(
                          Icons.calendar_today_outlined,
                          color: AppColors.brand500,
                          size: context.r(20),
                        ),
                      ),
                      SizedBox(width: context.w(12)),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              DateFormat('d MMM yyyy').format(date),
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: context.sp(16),
                                color: AppColors.ink,
                              ),
                            ),
                            Text(
                              DateFormat('EEEE').format(date),
                              style: TextStyle(
                                fontSize: context.sp(12.5),
                                color: AppColors.inkMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.keyboard_arrow_down_rounded,
                        color: AppColors.inkMuted,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Container(
            width: 1,
            height: context.h(36),
            margin: EdgeInsets.symmetric(horizontal: context.w(8)),
            color: AppColors.surfaceSubtle,
          ),
          FilledButton.icon(
            onPressed: onExport,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.brand50,
              foregroundColor: AppColors.brand500,
              minimumSize: Size(0, context.h(44)),
              shape: const StadiumBorder(),
            ),
            icon: exporting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.description_outlined),
            label: const Text('Excel'),
          ),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.icon,
    required this.count,
    required this.label,
    required this.fg,
  });
  final IconData icon;
  final int count;
  final String label;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Semantics(
        label: '$count $label',
        excludeSemantics: true,
        child: Container(
          padding: EdgeInsets.symmetric(
            vertical: context.h(12),
            horizontal: context.w(4),
          ),
          decoration: TeamPalette.card(context.r(14)),
          child: Column(
            children: [
              Icon(icon, color: fg, size: context.r(20)),
              SizedBox(height: context.h(4)),
              Text(
                '$count',
                style: TextStyle(
                  fontSize: context.sp(20),
                  fontWeight: FontWeight.w700,
                  color: fg,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label,
                  maxLines: 1,
                  style: TextStyle(
                    fontSize: context.sp(12),
                    color: AppColors.inkMuted,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MemberRow extends StatelessWidget {
  const _MemberRow({
    required this.name,
    required this.employeeId,
    required this.status,
    required this.onChanged,
  });
  final String name;
  final String employeeId;

  /// present | half | absent
  final String status;
  final ValueChanged<String>? onChanged;

  String get _initials {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(top: context.h(8)),
      padding: EdgeInsets.symmetric(
        horizontal: context.w(4),
        vertical: context.h(10),
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(context.r(14)),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Row(
        children: [
          // Quick toggle for Present.
          Checkbox(
            value: status == 'present',
            onChanged: onChanged == null
                ? null
                : (v) => onChanged!(v == true ? 'present' : 'absent'),
          ),
          CircleAvatar(
            radius: context.r(20),
            backgroundColor: AppColors.brand50,
            child: Text(
              _initials,
              style: TextStyle(
                color: AppColors.brand500,
                fontWeight: FontWeight.w700,
                fontSize: context.sp(13),
              ),
            ),
          ),
          SizedBox(width: context.w(10)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.ink,
                    fontSize: context.sp(14.5),
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
          SizedBox(width: context.w(6)),
          _StatusToggle(value: status, onChanged: onChanged),
          SizedBox(width: context.w(8)),
        ],
      ),
    );
  }
}

class _StatusToggle extends StatelessWidget {
  const _StatusToggle({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String>? onChanged;

  static const _opts = [
    ('present', 'P', 'Present'),
    ('half', 'Half', 'Half day'),
    ('absent', 'A', 'Absent'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(context.r(20)),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < _opts.length; i++) ...[
            if (i > 0)
              Container(
                width: 1,
                height: context.h(40),
                color: AppColors.surfaceSubtle,
              ),
            _segment(context, _opts[i]),
          ],
        ],
      ),
    );
  }

  Widget _segment(BuildContext context, (String, String, String) o) {
    final selected = value == o.$1;
    final c = switch (o.$1) {
      'present' => TeamPalette.ok,
      'half' => TeamPalette.warn,
      _ => TeamPalette.bad,
    };
    return Semantics(
      button: true,
      selected: selected,
      label: o.$3,
      excludeSemantics: true,
      child: Material(
        color: selected ? TeamPalette.soft(c) : Colors.transparent,
        child: InkWell(
          onTap: onChanged == null ? null : () => onChanged!(o.$1),
          child: Container(
            constraints: BoxConstraints(
              minWidth: context.w(44),
              minHeight: context.h(40),
            ),
            alignment: Alignment.center,
            padding: EdgeInsets.symmetric(horizontal: context.w(8)),
            child: Text(
              o.$2,
              style: TextStyle(
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected ? c : AppColors.ink,
                fontSize: context.sp(13.5),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

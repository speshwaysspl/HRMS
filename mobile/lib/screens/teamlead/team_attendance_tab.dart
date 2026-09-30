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

/// Month + year picker (no day). Returns the first day of the chosen month.
Future<DateTime?> showMonthPicker(BuildContext context, {DateTime? initial}) {
  final now = DateTime.now();
  var year = (initial ?? now).year;
  final selected = initial ?? now;
  return showDialog<DateTime>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setD) => AlertDialog(
        title: Row(
          children: [
            const Expanded(child: Text('Select month')),
            IconButton(
              tooltip: 'Previous year',
              onPressed: year > 2020 ? () => setD(() => year--) : null,
              icon: const Icon(Icons.chevron_left),
            ),
            Text('$year'),
            IconButton(
              tooltip: 'Next year',
              onPressed: year < now.year ? () => setD(() => year++) : null,
              icon: const Icon(Icons.chevron_right),
            ),
          ],
        ),
        content: SizedBox(
          width: 300,
          child: GridView.count(
            shrinkWrap: true,
            crossAxisCount: 3,
            childAspectRatio: 2,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            children: [
              for (var m = 1; m <= 12; m++)
                Builder(
                  builder: (_) {
                    final future = year == now.year && m > now.month;
                    final isSel = year == selected.year && m == selected.month;
                    final label = Text(
                      DateFormat.MMM().format(DateTime(year, m)),
                    );
                    final onTap = future
                        ? null
                        : () => Navigator.pop(ctx, DateTime(year, m));
                    return isSel
                        ? FilledButton(onPressed: onTap, child: label)
                        : OutlinedButton(onPressed: onTap, child: label);
                  },
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
        ],
      ),
    ),
  );
}

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
    if (e['teamId'] == widget.teamId && e['kind'] == 'attendance') _load();
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

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final members = widget.members;
    // Attendance can only be changed for today; past dates are view-only.
    // Team leads change today only; admins can also correct past dates.
    final isToday = _dayFmt.format(_date) == _dayFmt.format(DateTime.now());
    final editable = isToday || (context.read<AuthProvider>().user?.isAdmin ?? false);
    final presentCount = members.where((m) => _present.contains(_id(m))).length;
    final halfCount = members.where((m) => _half.contains(_id(m))).length;
    final allSelected = members.isNotEmpty && presentCount == members.length;

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(
            context.w(16),
            context.h(12),
            context.w(16),
            context.h(4),
          ),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _saving ? null : _pickDate,
                  icon: const Icon(Icons.event_outlined),
                  label: Text(DateFormat('d MMM yyyy').format(_date)),
                ),
              ),
              SizedBox(width: context.w(10)),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _exporting ? null : _export,
                  icon: _exporting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.table_view_outlined),
                  label: const Text('Excel'),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.w(16),
            vertical: context.h(6),
          ),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: _marked ? 'Marked · ' : 'Not marked yet · '),
                  TextSpan(
                    text: '$presentCount present',
                    style: const TextStyle(
                      color: Color(0xFF16A34A),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const TextSpan(text: ' · '),
                  TextSpan(
                    text: '$halfCount half day',
                    style: const TextStyle(
                      color: Color(0xFFB45309),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const TextSpan(text: ' · '),
                  TextSpan(
                    text: '${members.length - presentCount - halfCount} absent',
                    style: const TextStyle(
                      color: Color(0xFFDC2626),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (!editable)
                    const TextSpan(text: ' · View only (today only)'),
                  if (editable && !isToday)
                    const TextSpan(
                      text: ' · Editing a past date',
                      style: TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w600),
                    ),
                ],
              ),
              style: TextStyle(
                color: AppColors.inkMuted,
                fontSize: context.sp(13),
              ),
            ),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
              ? buildErrorState(_error!, _load)
              : members.isEmpty
              ? const EmptyStateView(
                  icon: Icons.group_outlined,
                  title: 'No members in this team',
                )
              : ListView.builder(
                  itemCount: members.length + 1,
                  itemBuilder: (_, i) {
                    if (i == 0) {
                      return CheckboxListTile(
                        value: allSelected,
                        onChanged: _saving || !editable
                            ? null
                            : (_) => setState(() {
                                _present = allSelected
                                    ? {}
                                    : members.map(_id).toSet();
                                _half = {};
                              }),
                        title: const Text(
                          'Mark all present',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        controlAffinity: ListTileControlAffinity.leading,
                      );
                    }
                    final m = members[i - 1];
                    final id = _id(m);
                    final status = _half.contains(id)
                        ? 'half'
                        : _present.contains(id)
                        ? 'present'
                        : 'absent';
                    return ListTile(
                      title: Text(
                        (m['userId'] as Map?)?['name']?.toString() ?? 'Unknown',
                      ),
                      subtitle: Text(m['employeeId']?.toString() ?? ''),
                      trailing: SegmentedButton<String>(
                        showSelectedIcon: false,
                        style: const ButtonStyle(
                          visualDensity: VisualDensity.compact,
                        ),
                        segments: const [
                          ButtonSegment(
                            value: 'present',
                            label: Text('P'),
                            tooltip: 'Present',
                          ),
                          ButtonSegment(
                            value: 'half',
                            label: Text('Half'),
                            tooltip: 'Half day',
                          ),
                          ButtonSegment(
                            value: 'absent',
                            label: Text('A'),
                            tooltip: 'Absent',
                          ),
                        ],
                        selected: {status},
                        onSelectionChanged: _saving || !editable
                            ? null
                            : (v) => setState(() {
                                _present.remove(id);
                                _half.remove(id);
                                if (v.first == 'present') _present.add(id);
                                if (v.first == 'half') _half.add(id);
                              }),
                      ),
                    );
                  },
                ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.all(context.w(16)),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
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
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_outlined),
                label: const Text('Save Attendance'),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

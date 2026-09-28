import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import '../../services/api_client.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/state_views.dart';

/// Asks for a month and opens the all-teams attendance Excel.
Future<void> downloadAllTeamsAttendance(BuildContext context) async {
  final picked = await showDatePicker(
    context: context,
    initialDate: DateTime.now(),
    firstDate: DateTime(2020),
    lastDate: DateTime.now(),
    helpText: 'Pick any day in the month',
  );
  if (picked == null || !context.mounted) return;
  final messenger = ScaffoldMessenger.of(context);
  messenger.showSnackBar(const SnackBar(content: Text('Preparing Excel...')));
  try {
    final file = await TeamService().exportAllTeamsAttendance(DateFormat('yyyy-MM').format(picked));
    final r = await OpenFilex.open(file.path);
    if (r.type != ResultType.done) {
      messenger.showSnackBar(SnackBar(content: Text('Saved to ${file.path}')));
    }
  } catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
  }
}

/// Team lead's manual daily roll-call: tick who is present, the rest are
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
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await _service.getTeamAttendance(widget.teamId, _dayFmt.format(_date));
      if (!mounted) return;
      setState(() {
        _present = r.present;
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
      await _service.saveTeamAttendance(widget.teamId, _dayFmt.format(_date), _present);
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
    final month = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      helpText: 'Pick any day in the month',
    );
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
    final presentCount = members.where((m) => _present.contains(_id(m))).length;
    final allSelected = members.isNotEmpty && presentCount == members.length;

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(context.w(16), context.h(12), context.w(16), context.h(4)),
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
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.table_view_outlined),
                  label: const Text('Excel'),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: context.w(16), vertical: context.h(6)),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text.rich(
              TextSpan(children: [
                TextSpan(text: _marked ? 'Marked · ' : 'Not marked yet · '),
                TextSpan(
                  text: '$presentCount present',
                  style: const TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.w600),
                ),
                const TextSpan(text: ' · '),
                TextSpan(
                  text: '${members.length - presentCount} absent',
                  style: const TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w600),
                ),
              ]),
              style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13)),
            ),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
              ? buildErrorState(_error!, _load)
              : members.isEmpty
              ? const EmptyStateView(icon: Icons.group_outlined, title: 'No members in this team')
              : ListView.builder(
                  itemCount: members.length + 1,
                  itemBuilder: (_, i) {
                    if (i == 0) {
                      return CheckboxListTile(
                        value: allSelected,
                        onChanged: _saving
                            ? null
                            : (_) => setState(() {
                                _present = allSelected ? {} : members.map(_id).toSet();
                              }),
                        title: const Text('Mark all present', style: TextStyle(fontWeight: FontWeight.w600)),
                        controlAffinity: ListTileControlAffinity.leading,
                      );
                    }
                    final m = members[i - 1];
                    final id = _id(m);
                    final isPresent = _present.contains(id);
                    return CheckboxListTile(
                      value: isPresent,
                      onChanged: _saving
                          ? null
                          : (v) => setState(() {
                              v == true ? _present.add(id) : _present.remove(id);
                            }),
                      controlAffinity: ListTileControlAffinity.leading,
                      title: Text((m['userId'] as Map?)?['name']?.toString() ?? 'Unknown'),
                      subtitle: Text(m['employeeId']?.toString() ?? ''),
                      secondary: Text(
                        isPresent ? 'Present' : 'Absent',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: isPresent ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                        ),
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
                onPressed: _saving || _loading || _error != null || members.isEmpty ? null : _save,
                icon: _saving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
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

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/api_client.dart';
import '../services/attendance_service.dart';
import '../services/event_service.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

/// Month grid of attendance, colour-coded by status, with a day sheet that
/// lets the employee request a correction (e.g. forgot to check out).
/// Mirrors frontend/src/components/attendance/AttendanceCalendar.jsx.
class AttendanceCalendar extends StatefulWidget {
  final DateTime month;
  final List<Map<String, dynamic>> days;
  final VoidCallback? onChanged;
  const AttendanceCalendar({super.key, required this.month, required this.days, this.onChanged});

  @override
  State<AttendanceCalendar> createState() => _AttendanceCalendarState();
}

enum _Cat { present, half, absent, leave, holiday, none }

_Cat _category(String status, bool holiday) {
  if (holiday) return _Cat.holiday;
  if (status == 'Leave') return _Cat.leave;
  if (status.contains('Half')) return _Cat.half;
  if (status.contains('Present') || status.contains('Overtime')) return _Cat.present;
  if (status == 'Absent') return _Cat.absent;
  return _Cat.none;
}

const _labels = {
  _Cat.present: 'Present',
  _Cat.half: 'Half-Day',
  _Cat.absent: 'Absent',
  _Cat.leave: 'Leave',
  _Cat.holiday: 'Holiday',
};

Color _catColor(_Cat c) => switch (c) {
      _Cat.present => AppColors.accent500,
      _Cat.half => const Color(0xFFF59E0B),
      _Cat.absent => AppColors.danger,
      _Cat.leave => AppColors.brand500,
      _Cat.holiday => const Color(0xFF9333EA),
      _Cat.none => AppColors.inkFaint,
    };

class _AttendanceCalendarState extends State<AttendanceCalendar> {
  final _attendance = AttendanceService();
  Map<String, String> _holidays = {};
  Map<String, Map<String, dynamic>> _requests = {};

  @override
  void initState() {
    super.initState();
    _loadHolidays();
    _loadRequests();
  }

  Future<void> _loadHolidays() async {
    try {
      final events = await EventService().getEvents();
      if (!mounted) return;
      setState(() => _holidays = {
            for (final e in events.where((e) => e['type'] == 'holiday'))
              DateTime.parse(e['date'].toString()).toUtc().toIso8601String().substring(0, 10): '${e['title']}',
          });
    } catch (_) {}
  }

  Future<void> _loadRequests() async {
    try {
      final list = await _attendance.getMyRegularizations();
      if (!mounted) return;
      setState(() => _requests = {for (final r in list) r['date'].toString(): r});
    } catch (_) {}
  }

  String _key(int day) => DateFormat('yyyy-MM-dd').format(DateTime(widget.month.year, widget.month.month, day));

  @override
  Widget build(BuildContext context) {
    final byDate = {for (final d in widget.days) d['date'].toString(): d};
    final daysInMonth = DateTime(widget.month.year, widget.month.month + 1, 0).day;
    final lead = DateTime(widget.month.year, widget.month.month, 1).weekday - 1; // Monday-first
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());

    final counts = {for (final c in _labels.keys) c: 0};
    for (var d = 1; d <= daysInMonth; d++) {
      final c = _category((byDate[_key(d)]?['status'] ?? '').toString(), _holidays.containsKey(_key(d)));
      if (counts.containsKey(c)) counts[c] = counts[c]! + 1;
    }

    return Container(
      padding: EdgeInsets.all(context.w(12)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: context.w(12),
            runSpacing: context.h(6),
            children: [
              for (final e in _labels.entries)
                Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(
                      width: 9, height: 9, decoration: BoxDecoration(color: _catColor(e.key), shape: BoxShape.circle)),
                  SizedBox(width: context.w(5)),
                  Text('${e.value} ${counts[e.key]}', style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted)),
                ]),
            ],
          ),
          SizedBox(height: context.h(12)),
          Row(
            children: [
              for (final w in const ['M', 'T', 'W', 'T', 'F', 'S', 'S'])
                Expanded(
                  child: Center(
                    child: Text(w,
                        style: TextStyle(fontSize: context.sp(11), fontWeight: FontWeight.w700, color: AppColors.inkFaint)),
                  ),
                ),
            ],
          ),
          SizedBox(height: context.h(6)),
          GridView.count(
            crossAxisCount: 7,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 5,
            crossAxisSpacing: 5,
            children: [
              for (var i = 0; i < lead; i++) const SizedBox.shrink(),
              for (var d = 1; d <= daysInMonth; d++) _dayCell(context, d, byDate[_key(d)], today),
            ],
          ),
        ],
      ),
    );
  }

  Widget _dayCell(BuildContext context, int day, Map<String, dynamic>? rec, String today) {
    final key = _key(day);
    final future = key.compareTo(today) > 0;
    final cat = _category((rec?['status'] ?? '').toString(), _holidays.containsKey(key));
    final color = _catColor(cat);
    final filled = !future && cat != _Cat.none;
    final pending = _requests[key]?['status'] == 'Pending';
    return Semantics(
      button: !future,
      label: '$day ${_labels[cat] ?? 'no record'}',
      child: Material(
        color: filled ? color.withValues(alpha: AppColors.isDark ? 0.35 : 0.18) : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: future ? null : () => _openDay(key, rec),
          child: Container(
            decoration: key == today
                ? BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.ink, width: 1.5))
                : null,
            child: Stack(
              children: [
                Center(
                  child: Text('$day',
                      style: TextStyle(
                        fontSize: context.sp(13),
                        fontWeight: FontWeight.w700,
                        color: future ? AppColors.inkFaint : AppColors.ink,
                      )),
                ),
                if (pending)
                  const Positioned(
                    top: 4,
                    right: 4,
                    child: CircleAvatar(radius: 3, backgroundColor: Color(0xFFF59E0B)),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openDay(String key, Map<String, dynamic>? rec) async {
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DaySheet(
        date: key,
        record: rec,
        holiday: _holidays[key],
        request: _requests[key],
        canRequest: key.compareTo(today) < 0,
        service: _attendance,
      ),
    );
    if (submitted == true) {
      await _loadRequests();
      widget.onChanged?.call();
    }
  }
}

class _DaySheet extends StatefulWidget {
  final String date;
  final Map<String, dynamic>? record;
  final String? holiday;
  final Map<String, dynamic>? request;
  final bool canRequest;
  final AttendanceService service;
  const _DaySheet({
    required this.date,
    required this.record,
    required this.holiday,
    required this.request,
    required this.canRequest,
    required this.service,
  });

  @override
  State<_DaySheet> createState() => _DaySheetState();
}

class _DaySheetState extends State<_DaySheet> {
  bool _open = false;
  TimeOfDay? _in;
  TimeOfDay? _out;
  late final TextEditingController _reason;
  bool _saving = false;
  String? _error;

  String? _t(String k) {
    final v = widget.record?[k]?.toString();
    return (v == null || v.isEmpty || v == 'Not Marked') ? null : v;
  }

  bool get _missingOut => _t('inTime') != null && _t('outTime') == null;

  @override
  void initState() {
    super.initState();
    final inStr = _t('inTime');
    if (inStr != null) {
      final p = inStr.split(':').map(int.parse).toList();
      _in = TimeOfDay(hour: p[0], minute: p[1]);
    }
    _reason = TextEditingController(text: _missingOut ? 'Forgot to check out' : '');
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  String _fmt(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _pick(bool isIn) async {
    final t = await showTimePicker(
      context: context,
      initialTime: (isIn ? _in : _out) ?? const TimeOfDay(hour: 18, minute: 0),
    );
    if (t != null) setState(() => isIn ? _in = t : _out = t);
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (_in == null && _out == null) return setState(() => _error = 'Enter a check-in or check-out time.');
    if (_in != null && _out != null && _fmt(_out!).compareTo(_fmt(_in!)) <= 0) {
      return setState(() => _error = 'Check-out must be after check-in.');
    }
    if (_reason.text.trim().isEmpty) return setState(() => _error = 'Add a short reason.');
    setState(() => _saving = true);
    try {
      await widget.service.requestRegularization(
        date: widget.date,
        requestedInTime: _in == null ? null : _fmt(_in!),
        requestedOutTime: _out == null ? null : _fmt(_out!),
        reason: _reason.text.trim(),
      );
      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Correction request sent for approval')));
      }
    } catch (e) {
      setState(() => _error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final label = DateFormat('EEEE, d MMMM yyyy').format(DateTime.parse(widget.date));
    final status = widget.holiday != null
        ? 'Holiday — ${widget.holiday}'
        : (widget.record?['status']?.toString() ?? 'No record');
    final req = widget.request;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: EdgeInsets.fromLTRB(context.w(20), context.h(20), context.w(20), context.h(24)),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(label, style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
              SizedBox(height: context.h(4)),
              Text(status, style: TextStyle(fontSize: context.sp(14), color: AppColors.inkMuted)),
              if (_t('inTime') != null) ...[
                SizedBox(height: context.h(14)),
                Row(children: [
                  Expanded(child: _kv(context, 'Check in', _t('inTime')!)),
                  Expanded(child: _kv(context, 'Check out', _t('outTime') ?? '—')),
                ]),
              ],
              SizedBox(height: context.h(16)),
              if (req != null)
                Text(
                  'Correction request: ${req['status']}'
                  '${req['requestedOutTime'] != null ? ' · out ${req['requestedOutTime']}' : ''}'
                  '${req['requestedInTime'] != null ? ' · in ${req['requestedInTime']}' : ''}',
                  style: TextStyle(fontSize: context.sp(14), color: AppColors.ink, fontWeight: FontWeight.w600),
                )
              else if (widget.canRequest && widget.holiday == null && !_open)
                FilledButton.icon(
                  onPressed: () => setState(() => _open = true),
                  icon: const Icon(Icons.edit_calendar_outlined, size: 18),
                  label: Text(_missingOut ? 'Forgot to check out? Request correction' : 'Request correction'),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                ),
              if (_open) ...[
                Row(children: [
                  Expanded(child: _timeField(context, 'Check in', _in, () => _pick(true))),
                  SizedBox(width: context.w(10)),
                  Expanded(child: _timeField(context, 'Check out', _out, () => _pick(false))),
                ]),
                SizedBox(height: context.h(12)),
                TextField(
                  controller: _reason,
                  maxLength: 200,
                  decoration: const InputDecoration(labelText: 'Reason'),
                ),
                if (_error != null)
                  Padding(
                    padding: EdgeInsets.only(bottom: context.h(8)),
                    child: Text(_error!, style: TextStyle(color: AppColors.danger, fontSize: context.sp(13))),
                  ),
                FilledButton(
                  onPressed: _saving ? null : _submit,
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                  child: Text(_saving ? 'Sending…' : 'Send for approval'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _kv(BuildContext context, String k, String v) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(k, style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted)),
          Text(v, style: TextStyle(fontSize: context.sp(15), fontWeight: FontWeight.w700, color: AppColors.ink)),
        ],
      );

  Widget _timeField(BuildContext context, String label, TimeOfDay? t, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: InputDecorator(
          decoration: InputDecoration(labelText: label, suffixIcon: const Icon(Icons.schedule)),
          child: Text(t == null ? '--:--' : _fmt(t), style: TextStyle(color: AppColors.ink, fontSize: context.sp(15))),
        ),
      );
}

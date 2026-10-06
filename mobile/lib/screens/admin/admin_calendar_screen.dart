import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_client.dart';
import '../../services/event_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/hrms_app_bar.dart';

import '../../services/live_refresh.dart';
const _eventTypes = ['holiday', 'wfh'];

class AdminCalendarScreen extends StatefulWidget {
  const AdminCalendarScreen({super.key});

  @override
  State<AdminCalendarScreen> createState() => _AdminCalendarScreenState();
}

class _AdminCalendarScreenState extends State<AdminCalendarScreen> with LiveRefresh<AdminCalendarScreen> {
  @override
  List<String> get liveResources => const ['events', 'leave'];

  @override
  void onLiveRefresh() => _load();

  final _service = EventService();
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  Object? _error;
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);
  String? _selected; // yyyy-MM-dd day filter

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
      final data = await _service.getEvents();
      data.sort(
        (a, b) => (a['date'] ?? '').toString().compareTo(
          (b['date'] ?? '').toString(),
        ),
      );
      if (!mounted) return;
      setState(() {
        _items = data;
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

  Future<void> _edit([Map<String, dynamic>? existing, DateTime? day]) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          _EventSheet(service: _service, existing: existing, initialDate: day),
    );
    if (saved == true) _load();
  }

  Future<void> _delete(Map<String, dynamic> e) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete event?'),
        content: Text('“${e['title']}” will be removed from the calendar.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Delete',
              style: TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _service.remove(e['_id'].toString());
      _load();
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractErrorMessage(err))));
      }
    }
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'holiday':
        return Icons.beach_access;
      case 'wfh':
        return Icons.home_work_outlined;
      case 'meeting':
        return Icons.groups_outlined;
      default:
        return Icons.event_outlined;
    }
  }

  // Events are stored at UTC midnight of their calendar day.
  static String _dayKey(dynamic v) {
    final d = DateTime.tryParse(v?.toString() ?? '');
    return d == null ? '' : DateFormat('yyyy-MM-dd').format(d.toUtc());
  }

  Future<void> _importHolidays() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Import India holidays'),
        content: const Text(
          'Import India public holidays? Existing matching holidays will be skipped.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Import'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final msg = await _service.seed();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(msg)));
      }
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final byDay = <String, List<Map<String, dynamic>>>{};
    for (final e in _items) {
      byDay.putIfAbsent(_dayKey(e['date']), () => []).add(e);
    }
    final prefix = DateFormat('yyyy-MM').format(_month);
    final monthEvents = _items
        .where((e) => _dayKey(e['date']).startsWith(prefix))
        .where((e) => _selected == null || _dayKey(e['date']) == _selected)
        .toList();

    return Scaffold(
      appBar: HrmsAppBar(
        title: const Text('Calendar'),
        actions: [
          IconButton(
            tooltip: 'Import India holidays',
            icon: const Icon(Icons.download_outlined),
            onPressed: _importHolidays,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _edit(),
        icon: const Icon(Icons.add),
        label: const Text('Add event'),
      ),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: const [
                SkeletonCard(height: 300),
                SkeletonListTile(),
                SkeletonListTile(),
              ],
            )
          : _error != null
          ? buildErrorState(_error!, _load)
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                  context.w(16),
                  context.h(12),
                  context.w(16),
                  context.h(96),
                ),
                children: [
                  _MonthGrid(
                    month: _month,
                    byDay: byDay,
                    selected: _selected,
                    onMonth: (m) => setState(() {
                      _month = m;
                      _selected = null;
                    }),
                    // A day with events filters the list; an empty day opens "add".
                    onDay: (k) {
                      if ((byDay[k] ?? const []).isNotEmpty) {
                        setState(() => _selected = k);
                      } else {
                        setState(() => _selected = null);
                        _edit(null, DateTime.parse(k));
                      }
                    },
                  ),
                  SizedBox(height: context.h(12)),
                  _MonthSummary(month: _month, items: _items, dayKey: _dayKey),
                  SizedBox(height: context.h(16)),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _selected == null
                              ? 'Events this month · ${monthEvents.length}'
                              : '${DateFormat('EEEE, dd MMM').format(DateTime.parse(_selected!))} · ${monthEvents.length}',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppColors.ink,
                            fontSize: context.sp(15),
                          ),
                        ),
                      ),
                      if (_selected != null)
                        TextButton(
                          onPressed: () => setState(() => _selected = null),
                          child: const Text('Whole month'),
                        ),
                    ],
                  ),
                  SizedBox(height: context.h(8)),
                  if (monthEvents.isEmpty)
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: context.h(24)),
                      child: Text(
                        _selected == null
                            ? 'No holidays or work-from-home days marked for this month.'
                            : 'Nothing on this day.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.inkMuted),
                      ),
                    ),
                  for (final e in monthEvents) _eventCard(e),
                ],
              ),
            ),
    );
  }

  Widget _eventCard(Map<String, dynamic> e) {
    final type = e['type']?.toString() ?? 'event';
    final c = _typeColor(type);
    final d = DateTime.tryParse(e['date']?.toString() ?? '')?.toUtc();
    final date = d == null ? '' : DateFormat('EEEE dd MMM').format(d);
    final desc = e['description']?.toString() ?? '';
    return SimpleCard(
      onTap: () => _edit(e),
      child: Row(
        children: [
          Container(
            width: context.r(48),
            height: context.r(48),
            decoration: BoxDecoration(
              color: c.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: d == null
                ? Icon(_iconFor(type), color: c, size: context.r(20))
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        DateFormat('EEE').format(d).toUpperCase(),
                        style: TextStyle(
                          color: c,
                          fontSize: context.sp(10),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        '${d.day}',
                        style: TextStyle(
                          color: c,
                          fontSize: context.sp(18),
                          fontWeight: FontWeight.w700,
                          height: 1.1,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
          ),
          SizedBox(width: context.w(12)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  e['title']?.toString() ?? '',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.ink,
                  ),
                ),
                SizedBox(height: context.h(2)),
                Text(
                  [
                    _typeLabel(type),
                    if (desc.isNotEmpty) desc else date,
                  ].join('  ·  '),
                  style: TextStyle(
                    color: AppColors.inkMuted,
                    fontSize: context.sp(12),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Remove',
            icon: const Icon(Icons.delete_outline, color: AppColors.danger),
            onPressed: () => _delete(e),
          ),
        ],
      ),
    );
  }
}

String _typeLabel(String t) => switch (t) {
  'holiday' => 'Holiday',
  'wfh' => 'Work from home',
  'meeting' => 'Meeting',
  'event' => 'Event',
  _ => 'Other',
};

Color _typeColor(String t) => switch (t) {
  'holiday' => AppColors.danger,
  'wfh' => const Color(0xFF2563EB),
  'meeting' => AppColors.brand600,
  'event' => AppColors.accent600,
  _ => AppColors.inkMuted,
};

const _weekendFg = Color(0xFFE11D48);

/// Working days / holidays / WFH counts for the month (mirrors web AdminCalendar).
class _MonthSummary extends StatelessWidget {
  final DateTime month;
  final List<Map<String, dynamic>> items;
  final String Function(dynamic) dayKey;
  const _MonthSummary({
    required this.month,
    required this.items,
    required this.dayKey,
  });

  @override
  Widget build(BuildContext context) {
    final prefix = DateFormat('yyyy-MM').format(month);
    final holidayWeekdays = <String>{};
    var holidays = 0, wfh = 0, weekdays = 0;
    for (final e in items) {
      final k = dayKey(e['date']);
      if (!k.startsWith(prefix)) continue;
      if (e['type'] == 'holiday') {
        holidays++;
        final wd = DateTime.parse(k).weekday;
        if (wd != DateTime.saturday && wd != DateTime.sunday) {
          holidayWeekdays.add(k);
        }
      } else if (e['type'] == 'wfh') {
        wfh++;
      }
    }
    final days = DateTime(month.year, month.month + 1, 0).day;
    for (var i = 1; i <= days; i++) {
      final wd = DateTime(month.year, month.month, i).weekday;
      if (wd != DateTime.saturday && wd != DateTime.sunday) weekdays++;
    }
    Widget stat(String label, int v, Color c) => Expanded(
      child: Semantics(
        label: '$label: $v',
        excludeSemantics: true,
        child: Column(
          children: [
            Text(
              label,
              style: TextStyle(
                color: AppColors.inkMuted,
                fontSize: context.sp(12),
              ),
            ),
            SizedBox(height: context.h(2)),
            Text(
              '$v',
              style: TextStyle(
                color: c,
                fontSize: context.sp(20),
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
      ),
    );
    return Container(
      padding: EdgeInsets.symmetric(vertical: context.h(12)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Row(
        children: [
          stat(
            'Working days',
            weekdays - holidayWeekdays.length,
            AppColors.ink,
          ),
          stat('Holidays', holidays, AppColors.danger),
          stat('WFH days', wfh, _typeColor('wfh')),
        ],
      ),
    );
  }
}

/// Month grid with tinted, dotted days (mirrors web AdminCalendar).
class _MonthGrid extends StatelessWidget {
  final DateTime month;
  final Map<String, List<Map<String, dynamic>>> byDay;
  final String? selected;
  final ValueChanged<DateTime> onMonth;
  final ValueChanged<String> onDay;
  const _MonthGrid({
    required this.month,
    required this.byDay,
    required this.selected,
    required this.onMonth,
    required this.onDay,
  });

  @override
  Widget build(BuildContext context) {
    final first = DateTime(month.year, month.month, 1).weekday % 7; // Sun=0
    final days = DateTime(month.year, month.month + 1, 0).day;
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    return Container(
      padding: EdgeInsets.all(context.w(12)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Previous month',
                icon: const Icon(Icons.chevron_left),
                onPressed: () => onMonth(DateTime(month.year, month.month - 1)),
              ),
              Expanded(
                child: Text(
                  DateFormat('MMMM yyyy').format(month),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                    fontSize: context.sp(16),
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Next month',
                icon: const Icon(Icons.chevron_right),
                onPressed: () => onMonth(DateTime(month.year, month.month + 1)),
              ),
            ],
          ),
          GridView.count(
            crossAxisCount: 7,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 4,
            crossAxisSpacing: 4,
            children: [
              for (final (i, d) in const [
                'S',
                'M',
                'T',
                'W',
                'T',
                'F',
                'S',
              ].indexed)
                Center(
                  child: Text(
                    d,
                    style: TextStyle(
                      color: i == 0 || i == 6 ? _weekendFg : AppColors.inkMuted,
                      fontSize: context.sp(12),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              for (var i = 0; i < first; i++) const SizedBox.shrink(),
              for (var day = 1; day <= days; day++) _cell(context, day, today),
            ],
          ),
          SizedBox(height: context.h(8)),
          Wrap(
            spacing: 14,
            runSpacing: 4,
            children: [
              for (final t in const ['holiday', 'wfh', 'event'])
                _legend(context, _typeColor(t), _typeLabel(t)),
              _legend(context, _weekendFg, 'Weekend'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _legend(BuildContext context, Color c, String label) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(color: c, shape: BoxShape.circle),
      ),
      const SizedBox(width: 5),
      Text(
        label,
        style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
      ),
    ],
  );

  Widget _cell(BuildContext context, int day, String today) {
    final date = DateTime(month.year, month.month, day);
    final k = DateFormat('yyyy-MM-dd').format(date);
    final evs = byDay[k] ?? const [];
    final weekend =
        date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;
    final main = evs.isEmpty
        ? null
        : _typeColor(evs.first['type']?.toString() ?? 'event');
    final isSel = selected == k;
    return Semantics(
      button: true,
      selected: isSel,
      label:
          '$day${evs.isEmpty ? '' : ', ${evs.map((e) => e['title']).join(', ')}'}${weekend ? ', weekend' : ''}',
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => onDay(k),
        child: Container(
          decoration: BoxDecoration(
            color: main != null
                ? main.withValues(alpha: 0.12)
                : weekend
                ? AppColors.tint(const Color(0xFFFFF1F2))
                : null,
            borderRadius: BorderRadius.circular(8),
            border: k == today
                ? Border.all(color: AppColors.accent600, width: 2)
                : isSel
                ? Border.all(color: AppColors.brand600, width: 2)
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$day',
                style: TextStyle(
                  fontSize: context.sp(13),
                  fontWeight: k == today ? FontWeight.w700 : FontWeight.w500,
                  color: weekend && main == null ? _weekendFg : AppColors.ink,
                ),
              ),
              if (evs.isNotEmpty)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final e in evs.take(3))
                      Container(
                        margin: const EdgeInsets.only(
                          top: 2,
                          left: 1,
                          right: 1,
                        ),
                        width: 5,
                        height: 5,
                        decoration: BoxDecoration(
                          color: _typeColor(e['type']?.toString() ?? 'event'),
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EventSheet extends StatefulWidget {
  final EventService service;
  final Map<String, dynamic>? existing;
  final DateTime? initialDate;
  const _EventSheet({required this.service, this.existing, this.initialDate});

  @override
  State<_EventSheet> createState() => _EventSheetState();
}

class _EventSheetState extends State<_EventSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _title;
  late final TextEditingController _desc;
  String _type = 'holiday';
  DateTime? _date;
  bool _saving = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(
      text: widget.existing?['title']?.toString() ?? '',
    );
    _desc = TextEditingController(
      text: widget.existing?['description']?.toString() ?? '',
    );
    _type = widget.existing?['type']?.toString() ?? 'holiday';
    if (!_eventTypes.contains(_type)) _type = 'holiday';
    _date =
        DateTime.tryParse(
          widget.existing?['date']?.toString() ?? '',
        )?.toUtc() ??
        widget.initialDate;
  }

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 3),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_date == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Pick a date')));
      return;
    }
    setState(() => _saving = true);
    final dateStr = DateFormat('yyyy-MM-dd').format(_date!);
    try {
      if (_isEdit) {
        await widget.service.update(
          widget.existing!['_id'].toString(),
          title: _title.text.trim(),
          date: dateStr,
          type: _type,
          description: _desc.text.trim(),
        );
      } else {
        await widget.service.add(
          title: _title.text.trim(),
          date: dateStr,
          type: _type,
          description: _desc.text.trim(),
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: EdgeInsets.all(context.w(20)),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppRadius.panel),
          ),
        ),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _isEdit ? 'Edit Event' : 'New Event',
                  style: TextStyle(
                    fontSize: context.sp(17),
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                  ),
                ),
                SizedBox(height: context.h(16)),
                TextFormField(
                  controller: _title,
                  decoration: const InputDecoration(labelText: 'Title'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                SizedBox(height: context.h(14)),
                DropdownButtonFormField<String>(
                  initialValue: _type,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: _eventTypes
                      .map(
                        (t) => DropdownMenuItem(
                          value: t,
                          child: Text(_typeLabel(t)),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _type = v ?? _type),
                ),
                SizedBox(height: context.h(14)),
                OutlinedButton.icon(
                  onPressed: _pickDate,
                  icon: const Icon(Icons.calendar_today_outlined, size: 16),
                  label: Text(
                    _date == null
                        ? 'Select date'
                        : DateFormat('d MMM, yyyy').format(_date!),
                  ),
                ),
                SizedBox(height: context.h(14)),
                TextFormField(
                  controller: _desc,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Description (optional)',
                  ),
                ),
                SizedBox(height: context.h(18)),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(_isEdit ? 'Save' : 'Create'),
                ),
                SizedBox(height: context.h(8)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

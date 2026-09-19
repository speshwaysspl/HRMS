import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../main.dart';
import '../../services/api_client.dart';
import '../../services/event_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  final _service = EventService();
  List<Map<String, dynamic>> _events = [];
  bool _loading = true;
  String? _error;
  Object? _lastError;
  DateTime _visibleMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime? _selectedDay = DateTime.now();

  @override
  void initState() {
    super.initState();
    final cache = AppCaches.of(context).events;
    if (cache.hasData) {
      _events = cache.data!;
      _loading = false;
      _load(silent: true);
    } else {
      _load();
    }
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
        _lastError = null;
      });
    }
    try {
      final data = await _service.getEvents();
      data.sort((a, b) => (a['date'] ?? '').toString().compareTo((b['date'] ?? '').toString()));
      if (!mounted) return;
      AppCaches.of(context).events.set(data);
      setState(() {
        _events = data;
        _loading = false;
        _error = null;
        _lastError = null;
      });
    } catch (e) {
      if (!mounted) return;
      if (silent && _events.isNotEmpty) return;
      setState(() {
        _error = extractErrorMessage(e);
        _lastError = e;
        _loading = false;
      });
    }
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'holiday':
        return Icons.beach_access;
      case 'meeting':
        return Icons.groups_outlined;
      default:
        return Icons.event_outlined;
    }
  }

  Color _colorFor(String type) {
    switch (type) {
      case 'holiday':
        return const Color(0xFFDC2626);
      case 'meeting':
        return const Color(0xFF2563EB);
      default:
        return AppColors.accent700;
    }
  }

  DateTime? _dateOf(Map<String, dynamic> e) {
    try {
      return DateTime.parse(e['date'].toString());
    } catch (_) {
      return null;
    }
  }

  bool _sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  void _prevMonth() {
    setState(() {
      _visibleMonth = DateTime(_visibleMonth.year, _visibleMonth.month - 1, 1);
      _selectedDay = null;
    });
  }

  void _nextMonth() {
    setState(() {
      _visibleMonth = DateTime(_visibleMonth.year, _visibleMonth.month + 1, 1);
      _selectedDay = null;
    });
  }

  Widget _buildMonthGrid() {
    final firstOfMonth = DateTime(_visibleMonth.year, _visibleMonth.month, 1);
    final daysInMonth = DateTime(_visibleMonth.year, _visibleMonth.month + 1, 0).day;
    // Monday=1..Sunday=7 -> convert to 0-indexed leading blanks (week starts Monday).
    final leadingBlanks = firstOfMonth.weekday - 1;
    final today = DateTime.now();

    final eventsByDay = <int, List<Map<String, dynamic>>>{};
    for (final e in _events) {
      final d = _dateOf(e);
      if (d != null && d.year == _visibleMonth.year && d.month == _visibleMonth.month) {
        eventsByDay.putIfAbsent(d.day, () => []).add(e);
      }
    }

    const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return Container(
      padding: EdgeInsets.all(context.w(14)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.panel),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(icon: const Icon(Icons.chevron_left), onPressed: _prevMonth),
              Text(
                DateFormat('MMMM yyyy').format(_visibleMonth),
                style: TextStyle(fontSize: context.sp(15.5), fontWeight: FontWeight.w700, color: AppColors.ink),
              ),
              IconButton(icon: const Icon(Icons.chevron_right), onPressed: _nextMonth),
            ],
          ),
          SizedBox(height: context.h(4)),
          Row(
            children: weekdayLabels
                .map((l) => Expanded(
                      child: Center(
                        child: Text(l, style: TextStyle(fontSize: context.sp(11.5), fontWeight: FontWeight.w600, color: AppColors.inkFaint)),
                      ),
                    ))
                .toList(),
          ),
          SizedBox(height: context.h(6)),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: leadingBlanks + daysInMonth,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 7),
            itemBuilder: (_, index) {
              if (index < leadingBlanks) return const SizedBox.shrink();
              final day = index - leadingBlanks + 1;
              final date = DateTime(_visibleMonth.year, _visibleMonth.month, day);
              final isToday = _sameDay(date, today);
              final isSelected = _selectedDay != null && _sameDay(date, _selectedDay!);
              final dayEvents = eventsByDay[day] ?? [];
              final hasHoliday = dayEvents.any((e) => (e['type']?.toString() ?? '') == 'holiday');
              final dotColor = dayEvents.isNotEmpty ? _colorFor(dayEvents.first['type']?.toString() ?? '') : null;

              return InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: () => setState(() => _selectedDay = date),
                child: Padding(
                  padding: EdgeInsets.all(context.w(2)),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isSelected
                          ? AppColors.brand600
                          : (hasHoliday ? AppColors.dangerBg : (isToday ? AppColors.accent50 : null)),
                      border: isToday && !isSelected ? Border.all(color: AppColors.accent500, width: 1.4) : null,
                    ),
                    alignment: Alignment.center,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$day',
                          style: TextStyle(
                            fontSize: context.sp(13),
                            fontWeight: isToday || isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected
                                ? Colors.white
                                : (hasHoliday ? AppColors.danger : AppColors.ink),
                          ),
                        ),
                        if (dotColor != null)
                          Container(
                            margin: EdgeInsets.only(top: context.h(1)),
                            width: 4,
                            height: 4,
                            decoration: BoxDecoration(color: isSelected ? Colors.white : dotColor, shape: BoxShape.circle),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredEvents = _selectedDay == null
        ? const <Map<String, dynamic>>[]
        : _events.where((e) {
            final d = _dateOf(e);
            return d != null && _sameDay(d, _selectedDay!);
          }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Calendar & Holidays')),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: [
                SkeletonCard(height: context.h(340)),
                SizedBox(height: context.h(16)),
                const SkeletonListTile(),
                const SkeletonListTile(),
              ],
            )
          : _error != null
              ? buildErrorState(_lastError ?? _error!, _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: EdgeInsets.all(context.w(16)),
                    children: [
                      _buildMonthGrid(),
                      SizedBox(height: context.h(18)),
                      Text(
                        _selectedDay != null && _sameDay(_selectedDay!, DateTime.now())
                            ? 'Today · ${DateFormat('d MMMM yyyy').format(_selectedDay!)}'
                            : DateFormat('d MMMM yyyy').format(_selectedDay ?? DateTime.now()),
                        style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w700, color: AppColors.ink),
                      ),
                      SizedBox(height: context.h(10)),
                      if (filteredEvents.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: EmptyStateView(icon: Icons.event_busy, title: 'No events on this day', subtitle: 'Pick another day to see holidays or meetings.'),
                        )
                      else
                        ...filteredEvents.map((e) {
                          String date = '';
                          try {
                            date = DateFormat('EEE, d MMM yyyy').format(DateTime.parse(e['date'].toString()));
                          } catch (_) {}
                          final type = e['type']?.toString() ?? 'event';
                          final color = _colorFor(type);
                          return SimpleCard(
                            child: Row(
                              children: [
                                Container(
                                  width: context.r(40),
                                  height: context.r(40),
                                  decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                                  child: Icon(_iconFor(type), color: color, size: context.r(20)),
                                ),
                                SizedBox(width: context.w(12)),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(e['title']?.toString() ?? '', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink)),
                                      SizedBox(height: context.h(2)),
                                      Text(date, style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
    );
  }
}

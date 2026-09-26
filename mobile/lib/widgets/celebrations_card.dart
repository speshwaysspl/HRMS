import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../screens/employee/calendar_screen.dart';
import '../services/celebration_service.dart';
import '../services/event_service.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

/// Home-screen strip: next holiday countdown + today's birthdays / work
/// anniversaries with a one-tap "Wish" button. Renders nothing when there's
/// neither. Mirrors frontend/src/components/EmployeeDashboard/CelebrationsAndHoliday.jsx.
class CelebrationsCard extends StatefulWidget {
  const CelebrationsCard({super.key});

  @override
  State<CelebrationsCard> createState() => _CelebrationsCardState();
}

class _CelebrationsCardState extends State<CelebrationsCard> {
  final _service = CelebrationService();
  ({String title, DateTime date, String description})? _holiday;
  List<Map<String, dynamic>> _people = [];
  String? _sending;

  @override
  void initState() {
    super.initState();
    _loadHoliday();
    _loadPeople();
  }

  DateTime get _today {
    final n = DateTime.now();
    return DateTime.utc(n.year, n.month, n.day);
  }

  Future<void> _loadHoliday() async {
    try {
      final events = await EventService().getEvents();
      final upcoming =
          events
              .where((e) => e['type'] == 'holiday')
              .map((e) {
                final d = DateTime.parse(e['date'].toString()).toUtc();
                return (
                  title: '${e['title']}',
                  date: DateTime.utc(d.year, d.month, d.day),
                  description: (e['description'] ?? '').toString().trim(),
                );
              })
              .where((h) => !h.date.isBefore(_today))
              .toList()
            ..sort((a, b) => a.date.compareTo(b.date));
      if (mounted) {
        setState(() => _holiday = upcoming.isEmpty ? null : upcoming.first);
      }
    } catch (_) {}
  }

  Future<void> _loadPeople() async {
    try {
      final people = await _service.getToday();
      if (mounted) setState(() => _people = people);
    } catch (_) {}
  }

  Future<void> _wish(Map<String, dynamic> p) async {
    final key = '${p['kind']}-${p['userId']}';
    setState(() => _sending = key);
    try {
      await _service.wish(p['userId'].toString(), p['kind'].toString());
      if (!mounted) return;
      setState(
        () => _people = [
          for (final x in _people)
            x['userId'] == p['userId'] ? {...x, 'wished': true} : x,
        ],
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Couldn't send your wish. Please try again."),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_holiday == null && _people.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: EdgeInsets.only(bottom: context.h(20)),
      child: Column(
        children: [
          if (_holiday != null) _holidayTile(context, _holiday!),
          if (_holiday != null && _people.isNotEmpty)
            SizedBox(height: context.h(20)),
          if (_people.isNotEmpty) _peopleTile(context),
        ],
      ),
    );
  }

  BoxDecoration get _card => BoxDecoration(
    color: AppColors.surface,
    borderRadius: BorderRadius.circular(AppRadius.card),
    border: Border.all(color: AppColors.surfaceSubtle),
  );

  /// Same look as the home screen's "Recent Announcements" section: bold
  /// header, then a tappable card with a label, title, description and a
  /// footer row. Tapping opens Calendar & Holidays.
  Widget _holidayTile(
    BuildContext context,
    ({String title, DateTime date, String description}) h,
  ) {
    final days = h.date.difference(_today).inDays;
    final when = days == 0
        ? 'Today'
        : (days == 1 ? 'Tomorrow' : 'In $days days');
    final radius = BorderRadius.circular(context.r(16));
    final accent = AppColors.brand600;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.celebration_outlined,
              color: AppColors.ink,
              size: context.r(20),
            ),
            SizedBox(width: context.w(6)),
            Text(
              'Next Holiday',
              style: TextStyle(
                fontSize: context.sp(16.5),
                fontWeight: FontWeight.w800,
                color: AppColors.ink,
              ),
            ),
          ],
        ),
        SizedBox(height: context.h(10)),
        Material(
          color: AppColors.surface,
          borderRadius: radius,
          child: InkWell(
            borderRadius: radius,
            onTap: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const CalendarScreen())),
            child: Container(
              padding: EdgeInsets.all(context.w(16)),
              decoration: BoxDecoration(
                borderRadius: radius,
                border: Border.all(color: AppColors.surfaceSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Date "tile" in the slot the announcement image uses.
                      Container(
                        width: context.r(52),
                        height: context.r(52),
                        decoration: BoxDecoration(
                          color: AppColors.brand50,
                          borderRadius: BorderRadius.circular(context.r(10)),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              DateFormat('MMM').format(h.date).toUpperCase(),
                              style: TextStyle(
                                fontSize: context.sp(10),
                                fontWeight: FontWeight.w700,
                                color: accent,
                                height: 1.1,
                              ),
                            ),
                            Text(
                              '${h.date.day}',
                              style: TextStyle(
                                fontSize: context.sp(19),
                                fontWeight: FontWeight.w800,
                                color: AppColors.ink,
                                height: 1.1,
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
                              'HOLIDAY',
                              style: TextStyle(
                                fontSize: context.sp(10.5),
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.4,
                                color: accent,
                              ),
                            ),
                            SizedBox(height: context.h(4)),
                            Text(
                              h.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: context.sp(14),
                                fontWeight: FontWeight.w700,
                                color: AppColors.ink,
                                height: 1.3,
                              ),
                            ),
                            SizedBox(height: context.h(5)),
                            Text(
                              [
                                DateFormat('EEEE, d MMMM').format(h.date),
                                if (h.description.isNotEmpty) h.description,
                              ].join(' · '),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: context.sp(12.5),
                                color: AppColors.inkMuted,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: context.h(12)),
                  Row(
                    children: [
                      // Left side shrinks (ellipsis) so large font sizes never overflow.
                      Expanded(
                        child: Row(
                          children: [
                            Icon(
                              Icons.access_time_rounded,
                              size: context.r(13),
                              color: AppColors.inkFaint,
                            ),
                            SizedBox(width: context.w(6)),
                            Flexible(
                              child: Text(
                                when,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: context.sp(12),
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.inkFaint,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: context.w(8)),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'View calendar',
                            style: TextStyle(
                              fontSize: context.sp(13),
                              fontWeight: FontWeight.w600,
                              color: AppColors.brand500,
                            ),
                          ),
                          Icon(
                            Icons.chevron_right_rounded,
                            size: context.r(18),
                            color: AppColors.brand500,
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _peopleTile(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(context.w(14)),
      decoration: _card,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Celebrating today',
            style: TextStyle(
              fontSize: context.sp(12),
              fontWeight: FontWeight.w600,
              color: AppColors.inkMuted,
            ),
          ),
          for (final p in _people) ...[
            SizedBox(height: context.h(12)),
            _personRow(context, p),
          ],
        ],
      ),
    );
  }

  Widget _personRow(BuildContext context, Map<String, dynamic> p) {
    final isBirthday = p['kind'] == 'birthday';
    final isMe = p['isMe'] == true;
    final wished = p['wished'] == true;
    final key = '${p['kind']}-${p['userId']}';
    final years = p['years'];
    return Row(
      children: [
        CircleAvatar(
          radius: context.r(20),
          backgroundColor: AppColors.surfaceSubtle,
          child: Icon(
            isBirthday ? Icons.cake_outlined : Icons.workspace_premium_outlined,
            color: AppColors.ink,
            size: context.r(19),
          ),
        ),
        SizedBox(width: context.w(12)),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isMe ? 'You' : '${p['name']}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: context.sp(14),
                  fontWeight: FontWeight.w700,
                  color: AppColors.ink,
                ),
              ),
              Text(
                isBirthday
                    ? 'Birthday'
                    : '$years year${years == 1 ? '' : 's'} at Speshway',
                style: TextStyle(
                  fontSize: context.sp(12),
                  color: AppColors.inkMuted,
                ),
              ),
            ],
          ),
        ),
        if (!isMe)
          wished
              ? Text(
                  'Wished ✓',
                  style: TextStyle(
                    fontSize: context.sp(13),
                    fontWeight: FontWeight.w600,
                    color: AppColors.inkMuted,
                  ),
                )
              : FilledButton(
                  onPressed: _sending == key ? null : () => _wish(p),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.ink,
                    foregroundColor: AppColors.surface,
                    minimumSize: const Size(72, 40),
                  ),
                  child: Text(_sending == key ? '…' : 'Wish'),
                ),
      ],
    );
  }
}

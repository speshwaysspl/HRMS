import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_client.dart';
import '../../services/event_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/simple_list_tile.dart';

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
      data.sort((a, b) => (a['date'] ?? '').toString().compareTo((b['date'] ?? '').toString()));
      if (!mounted) return;
      setState(() {
        _events = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = extractErrorMessage(e);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Calendar & Holidays')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _events.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          CenteredMessage(icon: Icons.event_busy, message: 'No events scheduled.'),
                        ])
                      : ListView(
                          padding: const EdgeInsets.all(16),
                          children: _events.map((e) {
                            String date = '';
                            try {
                              date = DateFormat('EEE, d MMM yyyy').format(DateTime.parse(e['date'].toString()));
                            } catch (_) {}
                            final type = e['type']?.toString() ?? 'event';
                            return SimpleCard(
                              child: Row(
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(color: AppColors.accent50, borderRadius: BorderRadius.circular(10)),
                                    child: Icon(_iconFor(type), color: AppColors.accent700, size: 20),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(e['title']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink)),
                                        const SizedBox(height: 2),
                                        Text(date, style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                ),
    );
  }
}

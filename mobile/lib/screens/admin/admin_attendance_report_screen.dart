import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_client.dart';
import '../../services/attendance_admin_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';

class AdminAttendanceReportScreen extends StatefulWidget {
  const AdminAttendanceReportScreen({super.key});

  @override
  State<AdminAttendanceReportScreen> createState() => _AdminAttendanceReportScreenState();
}

class _AdminAttendanceReportScreenState extends State<AdminAttendanceReportScreen> {
  final _service = AttendanceAdminService();
  DateTime _date = DateTime.now();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  String get _dateStr => DateFormat('yyyy-MM-dd').format(_date);

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _service.getDayReport(_dateStr);
      if (!mounted) return;
      setState(() {
        _rows = data;
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

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2023),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _date = picked);
      _load();
    }
  }

  List<Map<String, dynamic>> get _visible {
    if (_query.isEmpty) return _rows;
    final q = _query.toLowerCase();
    return _rows.where((r) => (r['name'] ?? '').toString().toLowerCase().contains(q)).toList();
  }

  int _count(String status) => _rows.where((r) => (r['status'] ?? '') == status).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Attendance Report')),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(context.w(16), context.h(12), context.w(16), 0),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickDate,
                    icon: Icon(Icons.calendar_today_outlined, size: context.r(16)),
                    label: Text(DateFormat('EEE, d MMM yyyy').format(_date)),
                  ),
                ),
              ],
            ),
          ),
          if (!_loading && _error == null)
            Padding(
              padding: EdgeInsets.fromLTRB(context.w(16), context.h(8), context.w(16), 0),
              child: Row(
                children: [
                  _tally('Present', _count('Present'), AppColors.accent600),
                  _tally('Absent', _count('Absent'), AppColors.danger),
                  _tally('Not Yet', _count('Not Yet'), AppColors.inkMuted),
                ],
              ),
            ),
          Padding(
            padding: EdgeInsets.fromLTRB(context.w(16), context.h(8), context.w(16), context.h(4)),
            child: TextField(
              onChanged: (v) => setState(() => _query = v.trim()),
              decoration: const InputDecoration(
                hintText: 'Search employee',
                prefixIcon: Icon(Icons.search, size: 20),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: _visible.isEmpty
                            ? ListView(children: const [
                                SizedBox(height: 100),
                                CenteredMessage(icon: Icons.event_busy, message: 'No records for this day.'),
                              ])
                            : ListView(
                                padding: EdgeInsets.all(context.w(16)),
                                children: _visible.map(_row).toList(),
                              ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _tally(String label, int n, Color color) => Expanded(
        child: Container(
          margin: EdgeInsets.only(right: context.w(8)),
          padding: EdgeInsets.symmetric(vertical: context.h(8)),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.surfaceSubtle),
          ),
          child: Column(
            children: [
              Text('$n', style: TextStyle(fontSize: context.sp(18), fontWeight: FontWeight.w700, color: color)),
              Text(label, style: TextStyle(fontSize: context.sp(11), color: AppColors.inkMuted)),
            ],
          ),
        ),
      );

  Widget _row(Map<String, dynamic> r) {
    final status = (r['status'] ?? 'Not Yet').toString();
    return SimpleCard(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r['name']?.toString() ?? '—',
                    style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink)),
                SizedBox(height: context.h(3)),
                Text(
                  'In: ${r['inTime'] ?? '—'}   Out: ${r['outTime'] ?? '—'}'
                  '${r['isLate'] == true ? '   · late' : ''}',
                  style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
                ),
              ],
            ),
          ),
          SizedBox(width: context.w(8)),
          StatusPill(label: status),
        ],
      ),
    );
  }
}

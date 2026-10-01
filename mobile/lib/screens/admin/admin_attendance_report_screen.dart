import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/attendance_admin_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/hrms_app_bar.dart';

class AdminAttendanceReportScreen extends StatefulWidget {
  /// 'checked-in' | 'Leave' | 'not-checked-in' — preselected by the
  /// admin dashboard tiles (mirrors web ?status=).
  final String? initialFilter;
  const AdminAttendanceReportScreen({super.key, this.initialFilter});

  @override
  State<AdminAttendanceReportScreen> createState() =>
      _AdminAttendanceReportScreenState();
}

class _AdminAttendanceReportScreenState
    extends State<AdminAttendanceReportScreen> {
  final _service = AttendanceAdminService();
  DateTime _date = DateTime.now();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  Object? _error;
  String _query = '';
  late String? _filter = widget.initialFilter;

  static const _notIn = {'Not Yet', 'Absent', 'Work from Home - Not Marked'};
  static bool _matches(String? filter, String status) => switch (filter) {
    null => true,
    'checked-in' => !_notIn.contains(status) && status != 'Leave',
    'not-checked-in' => _notIn.contains(status),
    final f => status == f,
  };

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
        _error = e;
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
    final q = _query.toLowerCase();
    return _rows
        .where((r) => _matches(_filter, (r['status'] ?? '').toString()))
        .where(
          (r) =>
              q.isEmpty ||
              (r['name'] ?? '').toString().toLowerCase().contains(q),
        )
        .toList();
  }

  int _countGroup(String f) =>
      _rows.where((r) => _matches(f, (r['status'] ?? '').toString())).length;

  int _count(String status) =>
      _rows.where((r) => (r['status'] ?? '') == status).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: HrmsAppBar(title: const Text('Attendance Report')),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(
              context.w(16),
              context.h(12),
              context.w(16),
              0,
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickDate,
                    icon: Icon(
                      Icons.calendar_today_outlined,
                      size: context.r(16),
                    ),
                    label: Text(DateFormat('EEE, d MMM yyyy').format(_date)),
                  ),
                ),
              ],
            ),
          ),
          if (!_loading && _error == null)
            Padding(
              padding: EdgeInsets.fromLTRB(
                context.w(16),
                context.h(8),
                context.w(16),
                0,
              ),
              child: Row(
                children: [
                  _tally('Present', _count('Present'), AppColors.accent600),
                  _tally('Absent', _count('Absent'), AppColors.danger),
                  _tally('Not Yet', _count('Not Yet'), AppColors.inkMuted),
                ],
              ),
            ),
          if (!_loading && _error == null)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.fromLTRB(
                context.w(16),
                context.h(8),
                context.w(16),
                0,
              ),
              child: Row(
                children: [
                  for (final f in const [
                    (null, 'All'),
                    ('checked-in', 'Checked in'),
                    ('Leave', 'On leave'),
                    ('not-checked-in', 'Not checked in'),
                  ])
                    Padding(
                      padding: EdgeInsets.only(right: context.w(8)),
                      child: ChoiceChip(
                        label: Text(
                          f.$1 == null
                              ? f.$2
                              : '${f.$2} (${_countGroup(f.$1!)})',
                        ),
                        selected: _filter == f.$1,
                        onSelected: (_) => setState(() => _filter = f.$1),
                      ),
                    ),
                ],
              ),
            ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              context.w(16),
              context.h(8),
              context.w(16),
              context.h(4),
            ),
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
                ? ListView(
                    padding: EdgeInsets.all(context.w(16)),
                    children: const [
                      SkeletonListTile(),
                      SkeletonListTile(),
                      SkeletonListTile(),
                      SkeletonListTile(),
                    ],
                  )
                : _error != null
                ? buildErrorState(_error!, _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: _visible.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 100),
                              EmptyStateView(
                                icon: Icons.event_busy,
                                title: 'No records for this day',
                              ),
                            ],
                          )
                        : Builder(
                            builder: (context) {
                              final rows = _visible;
                              return ListView.builder(
                                padding: EdgeInsets.all(context.w(16)),
                                itemCount: rows.length,
                                itemBuilder: (_, i) => _row(rows[i]),
                              );
                            },
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
          Text(
            '$n',
            style: TextStyle(
              fontSize: context.sp(18),
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: context.sp(11),
              color: AppColors.inkMuted,
            ),
          ),
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
                Text(
                  r['name']?.toString() ?? '—',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.ink,
                  ),
                ),
                SizedBox(height: context.h(3)),
                Text(
                  'In: ${r['inTime'] ?? '—'}   Out: ${r['outTime'] ?? '—'}'
                  '${r['isLate'] == true ? '   · late' : ''}',
                  style: TextStyle(
                    color: AppColors.inkMuted,
                    fontSize: context.sp(12),
                  ),
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

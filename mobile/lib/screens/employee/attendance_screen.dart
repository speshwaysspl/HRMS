import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_client.dart';
import '../../services/app_events.dart';
import '../../services/attendance_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/status_pill.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  final _service = AttendanceService();
  Map<String, dynamic>? _today;
  List<Map<String, dynamic>> _history = [];
  bool _loading = true;
  bool _submitting = false;
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
      final results = await Future.wait([_service.getToday(), _service.getReport()]);
      if (!mounted) return;
      setState(() {
        _today = results[0] as Map<String, dynamic>?;
        _history = (results[1] as List<Map<String, dynamic>>)..sort((a, b) => (b['date'] ?? '').compareTo(a['date'] ?? ''));
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

  String get _todayDate => DateFormat('yyyy-MM-dd').format(DateTime.now());
  String get _nowTime => DateFormat('HH:mm').format(DateTime.now());

  Future<void> _checkIn() async {
    setState(() => _submitting = true);
    try {
      await _service.checkIn(date: _todayDate, inTime: _nowTime);
      await _load();
      AppEvents.bumpAttendance();
      if (mounted) _toast('Checked in at $_nowTime');
    } catch (e) {
      if (mounted) _toast(extractErrorMessage(e), isError: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _checkOut() async {
    setState(() => _submitting = true);
    try {
      await _service.checkOut(date: _todayDate, outTime: _nowTime);
      await _load();
      AppEvents.bumpAttendance();
      if (mounted) _toast('Checked out at $_nowTime');
    } catch (e) {
      if (mounted) _toast(extractErrorMessage(e), isError: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _toast(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? AppColors.danger : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasCheckedIn = _today != null && _today!['inTime'] != null;
    final hasCheckedOut = _today != null && _today!['outTime'] != null;

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Attendance')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: EdgeInsets.all(context.w(24)),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        SizedBox(height: context.h(12)),
                        OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: EdgeInsets.all(context.w(16)),
                    children: [
                      _buildCheckCard(hasCheckedIn, hasCheckedOut),
                      SizedBox(height: context.h(24)),
                      Text('Recent History', style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w700, color: AppColors.ink)),
                      SizedBox(height: context.h(10)),
                      if (_history.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: Text('No attendance records yet.', style: TextStyle(color: AppColors.inkMuted))),
                        )
                      else
                        ..._history.take(30).map(_buildHistoryTile),
                    ],
                  ),
                ),
    );
  }

  Widget _buildCheckCard(bool hasCheckedIn, bool hasCheckedOut) {
    return Container(
      padding: EdgeInsets.all(context.w(18)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.panel),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(DateFormat('EEEE, d MMMM yyyy').format(DateTime.now()),
              style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
          SizedBox(height: context.h(12)),
          Row(
            children: [
              Expanded(
                child: _timeBlock('Check In', _today?['inTime']?.toString() ?? '--:--'),
              ),
              Container(width: 1, height: context.h(40), color: AppColors.surfaceSubtle),
              Expanded(
                child: _timeBlock('Check Out', _today?['outTime']?.toString() ?? '--:--'),
              ),
            ],
          ),
          SizedBox(height: context.h(18)),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _submitting || hasCheckedOut || (hasCheckedIn && hasCheckedOut)
                  ? null
                  : (hasCheckedIn ? _checkOut : _checkIn),
              icon: Icon(hasCheckedIn ? Icons.logout : Icons.login, size: 18),
              label: Text(
                hasCheckedOut
                    ? 'Attendance Completed'
                    : (hasCheckedIn ? 'Check Out' : 'Check In'),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: hasCheckedOut
                    ? AppColors.surfaceSubtle
                    : (hasCheckedIn ? AppColors.brand600 : AppColors.accent600),
                foregroundColor: hasCheckedOut ? AppColors.inkMuted : Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _timeBlock(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
        SizedBox(height: context.h(4)),
        Text(value, style: TextStyle(fontSize: context.sp(20), fontWeight: FontWeight.w700, color: AppColors.ink)),
      ],
    );
  }

  Widget _buildHistoryTile(Map<String, dynamic> record) {
    final date = record['date']?.toString() ?? '';
    String formattedDate = date;
    try {
      formattedDate = DateFormat('d MMM, yyyy').format(DateTime.parse(date));
    } catch (_) {}

    final hasOut = record['outTime'] != null;
    final status = hasOut ? 'Present' : (record['inTime'] != null ? 'Pending' : 'Absent');

    return Container(
      margin: EdgeInsets.only(bottom: context.h(8)),
      padding: EdgeInsets.symmetric(horizontal: context.w(14), vertical: context.h(12)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(formattedDate, style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink, fontSize: context.sp(13))),
                SizedBox(height: context.h(3)),
                Text(
                  'In: ${record['inTime'] ?? '--:--'}   Out: ${record['outTime'] ?? '--:--'}',
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

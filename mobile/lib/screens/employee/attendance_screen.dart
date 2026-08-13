import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_client.dart';
import '../../services/attendance_service.dart';
import '../../theme/app_theme.dart';
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
      appBar: AppBar(title: const Text('Attendance')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildCheckCard(hasCheckedIn, hasCheckedOut),
                      const SizedBox(height: 24),
                      const Text('Recent History', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.ink)),
                      const SizedBox(height: 10),
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
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.panel),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(DateFormat('EEEE, d MMMM yyyy').format(DateTime.now()),
              style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _timeBlock('Check In', _today?['inTime']?.toString() ?? '--:--'),
              ),
              Container(width: 1, height: 40, color: AppColors.surfaceSubtle),
              Expanded(
                child: _timeBlock('Check Out', _today?['outTime']?.toString() ?? '--:--'),
              ),
            ],
          ),
          const SizedBox(height: 18),
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
        Text(label, style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.ink)),
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
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                Text(formattedDate, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink, fontSize: 13)),
                const SizedBox(height: 3),
                Text(
                  'In: ${record['inTime'] ?? '--:--'}   Out: ${record['outTime'] ?? '--:--'}',
                  style: const TextStyle(color: AppColors.inkMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          StatusPill(label: status),
        ],
      ),
    );
  }
}

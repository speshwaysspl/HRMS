import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_client.dart';
import '../../services/leave_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/hrms_app_bar.dart';

class AdminLeaveDetailScreen extends StatefulWidget {
  final String id;
  const AdminLeaveDetailScreen({super.key, required this.id});

  @override
  State<AdminLeaveDetailScreen> createState() => _AdminLeaveDetailScreenState();
}

class _AdminLeaveDetailScreenState extends State<AdminLeaveDetailScreen> {
  final _service = LeaveService();
  Map<String, dynamic>? _leave;
  bool _loading = true;
  bool _busy = false;
  bool _changed = false;
  Object? _error;

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
      final data = await _service.getLeaveDetail(widget.id);
      if (!mounted) return;
      setState(() {
        _leave = data;
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

  Future<void> _decide(String status) async {
    setState(() => _busy = true);
    try {
      await _service.setStatus(widget.id, status);
      _changed = true;
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _fmt(dynamic v) {
    if (v == null) return '—';
    try {
      return DateFormat('EEE, d MMM yyyy').format(DateTime.parse(v.toString()));
    } catch (_) {
      return v.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = _leave ?? {};
    final emp = l['employeeId'] as Map? ?? {};
    final user = emp['userId'] as Map? ?? {};
    final dept = emp['department'] as Map? ?? {};
    final status = (l['status'] ?? 'Pending').toString();

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_changed);
      },
      child: Scaffold(
        appBar: HrmsAppBar(title: const Text('Leave Request')),
        body: _loading
            ? ListView(
                padding: EdgeInsets.all(context.w(16)),
                children: const [SkeletonCard(height: 70), SkeletonCard(height: 200)],
              )
            : _error != null
                ? buildErrorState(_error!, _load)
                : ListView(
                    padding: EdgeInsets.all(context.w(16)),
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(user['name']?.toString() ?? 'Employee',
                                style: TextStyle(fontSize: context.sp(18), fontWeight: FontWeight.w700, color: AppColors.ink)),
                          ),
                          StatusPill(label: status),
                        ],
                      ),
                      SizedBox(height: context.h(20)),
                      _row('Type', l['leaveType']?.toString() ?? '—'),
                      _row('Department', dept['dep_name']?.toString() ?? '—'),
                      _row('From', _fmt(l['startDate'])),
                      _row('To', _fmt(l['endDate'])),
                      _row('Applied', _fmt(l['appliedAt'] ?? l['createdAt'])),
                      SizedBox(height: context.h(12)),
                      Text('Reason', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
                      SizedBox(height: context.h(4)),
                      Text(l['reason']?.toString() ?? '—',
                          style: TextStyle(color: AppColors.ink, fontSize: context.sp(14), height: 1.4)),
                      if (status == 'Pending') ...[
                        SizedBox(height: context.h(24)),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: _busy ? null : () => _decide('Rejected'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.danger,
                                  side: const BorderSide(color: AppColors.danger),
                                ),
                                child: const Text('Reject'),
                              ),
                            ),
                            SizedBox(width: context.w(10)),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: _busy ? null : () => _decide('Approved'),
                                child: _busy
                                    ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : const Text('Approve'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: EdgeInsets.symmetric(vertical: context.h(7)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: context.w(110),
              child: Text(label, style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
            ),
            Expanded(
              child: Text(value,
                  style: TextStyle(color: AppColors.ink, fontSize: context.sp(13), fontWeight: FontWeight.w500)),
            ),
          ],
        ),
      );
}

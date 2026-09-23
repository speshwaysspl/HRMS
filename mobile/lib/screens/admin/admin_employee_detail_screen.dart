import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_client.dart';
import '../../services/employee_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/status_pill.dart';
import '../employee/payslips_screen.dart';
import 'admin_employee_form_screen.dart';
import '../../widgets/hrms_app_bar.dart';

class AdminEmployeeDetailScreen extends StatefulWidget {
  final String id;
  const AdminEmployeeDetailScreen({super.key, required this.id});

  @override
  State<AdminEmployeeDetailScreen> createState() => _AdminEmployeeDetailScreenState();
}

class _AdminEmployeeDetailScreenState extends State<AdminEmployeeDetailScreen> {
  final _service = EmployeeService();
  Map<String, dynamic>? _emp;
  bool _loading = true;
  bool _busy = false;
  Object? _error;
  bool _changed = false;

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
      final data = await _service.getEmployee(widget.id);
      if (!mounted) return;
      setState(() {
        _emp = data;
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

  Future<void> _toggleStatus() async {
    final current = (_emp?['status'] ?? 'active').toString();
    final next = current == 'active' ? 'inactive' : 'active';
    setState(() => _busy = true);
    try {
      await _service.setStatus(widget.id, next);
      _changed = true;
      await _load();
    } catch (e) {
      _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete employee?'),
        content: const Text('The employee and their login will be removed. This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _service.deleteEmployee(widget.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      _snack(extractErrorMessage(e));
    }
  }

  Future<void> _edit() async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => AdminEmployeeFormScreen(existing: _emp)),
    );
    if (saved == true) {
      _changed = true;
      _load();
    }
  }

  void _snack(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  String _fmt(dynamic v) {
    if (v == null || v.toString().isEmpty) return '—';
    try {
      return DateFormat('d MMM, yyyy').format(DateTime.parse(v.toString()));
    } catch (_) {
      return v.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    final e = _emp ?? {};
    final user = e['userId'] as Map? ?? {};
    final dept = e['department'] as Map? ?? {};
    final status = (e['status'] ?? 'active').toString();
    final roles = (user['role'] as List?)?.map((r) => r.toString().replaceAll('_', ' ')).join(', ') ?? '';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_changed);
      },
      child: Scaffold(
        appBar: HrmsAppBar(
          title: const Text('Employee'),
          actions: [
            if (!_loading && _error == null)
              IconButton(onPressed: _edit, icon: const Icon(Icons.edit_outlined)),
          ],
        ),
        body: _loading
            ? ListView(
                padding: EdgeInsets.all(context.w(16)),
                children: const [SkeletonCard(height: 90), SkeletonCard(height: 220)],
              )
            : _error != null
                ? buildErrorState(_error!, _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.all(context.w(16)),
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: context.r(28),
                            backgroundColor: AppColors.brand100,
                            child: Text(
                              (user['name']?.toString().isNotEmpty == true ? user['name'].toString()[0] : '?').toUpperCase(),
                              style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w700),
                            ),
                          ),
                          SizedBox(width: context.w(12)),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(user['name']?.toString() ?? '',
                                    style: TextStyle(fontSize: context.sp(18), fontWeight: FontWeight.w700, color: AppColors.ink)),
                                SizedBox(height: context.h(2)),
                                Text(e['designation']?.toString() ?? '',
                                    style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
                              ],
                            ),
                          ),
                          StatusPill(label: status == 'active' ? 'Active' : 'Inactive'),
                        ],
                      ),
                      SizedBox(height: context.h(20)),
                      _row('Employee ID', e['employeeId']?.toString() ?? '—'),
                      _row('Email', user['email']?.toString() ?? '—'),
                      _row('Mobile', e['mobilenumber']?.toString() ?? '—'),
                      _row('Department', dept['dep_name']?.toString() ?? '—'),
                      _row('Roles', roles.isEmpty ? '—' : roles),
                      _row('Gender', e['gender']?.toString() ?? '—'),
                      _row('Date of birth', _fmt(e['dob'])),
                      _row('Joining date', _fmt(e['joiningDate'])),
                      _row('Annual CTC', e['salaryPackage'] != null ? '₹${e['salaryPackage']}' : '—'),
                      SizedBox(height: context.h(24)),
                      OutlinedButton.icon(
                        onPressed: () {
                          final code = e['employeeId']?.toString();
                          if (code == null || code.isEmpty) return;
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => PayslipsScreen(employeeCode: code)),
                          );
                        },
                        icon: const Icon(Icons.receipt_long_outlined, size: 18),
                        label: const Text('View payslips'),
                      ),
                      SizedBox(height: context.h(10)),
                      OutlinedButton.icon(
                        onPressed: _busy ? null : _toggleStatus,
                        icon: Icon(status == 'active' ? Icons.person_off_outlined : Icons.person_outline, size: 18),
                        label: Text(status == 'active' ? 'Deactivate' : 'Activate'),
                      ),
                      SizedBox(height: context.h(10)),
                      OutlinedButton.icon(
                        onPressed: _delete,
                        icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                        label: const Text('Delete employee', style: TextStyle(color: AppColors.danger)),
                      ),
                    ],
                  ),
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
              width: context.w(120),
              child: Text(label, style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
            ),
            Expanded(
              child: Text(value, style: TextStyle(color: AppColors.ink, fontSize: context.sp(13), fontWeight: FontWeight.w500)),
            ),
          ],
        ),
      );
}

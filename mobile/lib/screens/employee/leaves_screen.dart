import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../services/api_client.dart';
import '../../services/app_events.dart';
import '../../services/auth_provider.dart';
import '../../services/leave_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/hrms_app_bar.dart';

class LeavesScreen extends StatefulWidget {
  const LeavesScreen({super.key});

  @override
  State<LeavesScreen> createState() => _LeavesScreenState();
}

class _LeavesScreenState extends State<LeavesScreen> {
  final _service = LeaveService();
  List<Map<String, dynamic>> _leaves = [];
  List<Map<String, dynamic>> _leaveTypes = [];
  String? _cancelling;
  bool _loading = true;
  String? _error;
  Object? _lastError;

  @override
  void initState() {
    super.initState();
    final cache = AppCaches.of(context).leavesList;
    if (cache.hasData) {
      _leaves = cache.data!;
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
    final userId = context.read<AuthProvider>().user?.id ?? '';
    try {
      final results = await Future.wait([
        _service.getLeaves(userId),
        _service.getLeaveTypes(),
      ]);
      if (!mounted) return;
      AppCaches.of(context).leavesList.set(results[0]);
      setState(() {
        _leaves = results[0];
        _leaveTypes = results[1];
        _loading = false;
        _error = null;
        _lastError = null;
      });
    } catch (e) {
      if (!mounted) return;
      if (silent && _leaves.isNotEmpty) return;
      setState(() {
        _error = extractErrorMessage(e);
        _lastError = e;
        _loading = false;
      });
    }
  }

  Future<void> _cancel(Map<String, dynamic> l) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel leave request?'),
        content: Text('${l['leaveType']} · ${_dateRange(l)}'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Cancel request'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final id = l['_id'].toString();
    setState(() => _cancelling = id);
    try {
      await _service.cancelLeave(id);
      AppEvents.bumpLeave();
      await _load(silent: true);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Leave request cancelled')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _cancelling = null);
    }
  }

  Future<void> _openApplySheet() async {
    final userId = context.read<AuthProvider>().user?.id ?? '';
    final applied = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ApplyLeaveSheet(userId: userId, leaveTypes: _leaveTypes, service: _service),
    );
    if (applied == true) {
      _load();
      AppEvents.bumpLeave();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: HrmsAppBar(title: const Text('Leaves')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openApplySheet,
        icon: const Icon(Icons.add),
        label: const Text('Apply'),
      ),
      body: _loading
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
              ? buildErrorState(_lastError ?? _error!, _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: EdgeInsets.all(context.w(16)),
                    children: [
                      Text('My Requests', style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w700, color: AppColors.ink)),
                      SizedBox(height: context.h(10)),
                      if (_leaves.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          child: EmptyStateView(
                            icon: Icons.beach_access_outlined,
                            title: 'No leave requests yet',
                            subtitle: 'Apply for a leave and it will show up here.',
                            action: OutlinedButton.icon(
                              onPressed: _openApplySheet,
                              icon: const Icon(Icons.add, size: 16),
                              label: const Text('Apply for Leave'),
                            ),
                          ),
                        )
                      else
                        ..._leaves.map((l) => SimpleCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text('${l['leaveType']}',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: context.sp(15), color: AppColors.ink)),
                                      ),
                                      SizedBox(width: context.w(8)),
                                      StatusPill(label: (l['status'] ?? 'Pending').toString()),
                                    ],
                                  ),
                                  SizedBox(height: context.h(10)),
                                  Row(
                                    children: [
                                      Icon(Icons.calendar_month_outlined, size: context.r(15), color: AppColors.inkMuted),
                                      SizedBox(width: context.w(6)),
                                      Expanded(
                                        child: Text(_dateRange(l), style: TextStyle(color: AppColors.ink, fontSize: context.sp(13))),
                                      ),
                                      if (_days(l) != null)
                                        Text(_days(l)!, style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12), fontWeight: FontWeight.w600)),
                                    ],
                                  ),
                                  if ((l['reason'] ?? '').toString().trim().isNotEmpty) ...[
                                    SizedBox(height: context.h(10)),
                                    Divider(height: 1, color: AppColors.surfaceSubtle),
                                    SizedBox(height: context.h(10)),
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Icon(Icons.notes_rounded, size: context.r(15), color: AppColors.inkMuted),
                                        SizedBox(width: context.w(6)),
                                        Expanded(
                                          child: Text('${l['reason']}',
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
                                        ),
                                      ],
                                    ),
                                  ],
                                  if ((l['status'] ?? 'Pending').toString() == 'Pending') ...[
                                    SizedBox(height: context.h(12)),
                                    SizedBox(
                                      width: double.infinity,
                                      child: OutlinedButton(
                                        onPressed: _cancelling == l['_id'].toString() ? null : () => _cancel(l),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: AppColors.danger,
                                          side: BorderSide(color: AppColors.danger.withValues(alpha: 0.4)),
                                          minimumSize: const Size.fromHeight(44),
                                        ),
                                        child: Text(_cancelling == l['_id'].toString() ? 'Cancelling…' : 'Cancel request'),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            )),
                    ],
                  ),
                ),
    );
  }

  /// "1 day" / "2 days" (inclusive), or null if dates can't be parsed.
  String? _days(Map<String, dynamic> l) {
    try {
      final n = DateTime.parse(l['endDate'].toString())
              .difference(DateTime.parse(l['startDate'].toString()))
              .inDays +
          1;
      if (n < 1) return null;
      return n == 1 ? '1 day' : '$n days';
    } catch (_) {
      return null;
    }
  }

  String _dateRange(Map<String, dynamic> l) {
    try {
      final start = DateFormat('d MMM').format(DateTime.parse(l['startDate'].toString()));
      final end = DateFormat('d MMM, yyyy').format(DateTime.parse(l['endDate'].toString()));
      return '$start – $end';
    } catch (_) {
      return '${l['startDate']} – ${l['endDate']}';
    }
  }
}

class _ApplyLeaveSheet extends StatefulWidget {
  final String userId;
  final List<Map<String, dynamic>> leaveTypes;
  final LeaveService service;
  const _ApplyLeaveSheet({required this.userId, required this.leaveTypes, required this.service});

  @override
  State<_ApplyLeaveSheet> createState() => _ApplyLeaveSheetState();
}

class _ApplyLeaveSheetState extends State<_ApplyLeaveSheet> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  String? _selectedType;
  DateTime? _startDate;
  DateTime? _endDate;
  bool _submitting = false;
  bool _startDateError = false;
  bool _endDateError = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool isStart}) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          _startDateError = false;
        } else {
          _endDate = picked;
          _endDateError = false;
        }
      });
    }
  }

  Future<void> _submit() async {
    setState(() {
      _startDateError = _startDate == null;
      _endDateError = _endDate == null || (_startDate != null && _endDate != null && _endDate!.isBefore(_startDate!));
    });

    final formOk = _formKey.currentState!.validate();
    if (!formOk || _startDateError || _endDateError) {
      String message = 'Please fill in all fields';
      if (_startDateError) {
        message = 'Please select a start date';
      } else if (_endDateError) {
        message = (_endDate != null && _startDate != null && _endDate!.isBefore(_startDate!))
            ? 'End date must be on or after the start date'
            : 'Please select an end date';
      } else if (_selectedType == null) {
        message = 'Please select a leave type';
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: AppColors.danger));
      return;
    }
    setState(() => _submitting = true);
    try {
      await widget.service.applyLeave(
        userId: widget.userId,
        leaveType: _selectedType!,
        startDate: DateFormat('yyyy-MM-dd').format(_startDate!),
        endDate: DateFormat('yyyy-MM-dd').format(_endDate!),
        reason: _reasonController.text.trim(),
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: EdgeInsets.all(context.w(20)),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
        ),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: context.r(34),
                    height: context.r(34),
                    decoration: BoxDecoration(color: AppColors.accent100, shape: BoxShape.circle),
                    child: Icon(Icons.event_note_rounded, size: context.r(18), color: AppColors.accent700),
                  ),
                  SizedBox(width: context.w(10)),
                  Text('Apply for Leave', style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
                ],
              ),
              SizedBox(height: context.h(18)),
              Text('LEAVE DETAILS', style: TextStyle(fontSize: context.sp(11.5), fontWeight: FontWeight.w700, color: AppColors.inkFaint, letterSpacing: 0.6)),
              SizedBox(height: context.h(8)),
              DropdownButtonFormField<String>(
                initialValue: _selectedType,
                decoration: const InputDecoration(labelText: 'Leave Type'),
                items: widget.leaveTypes
                    .map((t) => DropdownMenuItem(value: t['name'].toString(), child: Text(t['name'].toString())))
                    .toList(),
                onChanged: (v) => setState(() => _selectedType = v),
                validator: (v) => v == null ? 'Required' : null,
              ),
              SizedBox(height: context.h(14)),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickDate(isStart: true),
                      icon: Icon(Icons.calendar_today_outlined, size: 15, color: _startDateError ? AppColors.danger : AppColors.inkMuted),
                      label: Text(
                        _startDate == null ? 'Start Date' : DateFormat('d MMM, yyyy').format(_startDate!),
                        style: TextStyle(color: _startDateError ? AppColors.danger : AppColors.ink),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: _startDateError ? AppColors.danger : AppColors.surfaceSubtle, width: _startDateError ? 1.5 : 1),
                      ),
                    ),
                  ),
                  SizedBox(width: context.w(10)),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickDate(isStart: false),
                      icon: Icon(Icons.calendar_today_outlined, size: 15, color: _endDateError ? AppColors.danger : AppColors.inkMuted),
                      label: Text(
                        _endDate == null ? 'End Date' : DateFormat('d MMM, yyyy').format(_endDate!),
                        style: TextStyle(color: _endDateError ? AppColors.danger : AppColors.ink),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: _endDateError ? AppColors.danger : AppColors.surfaceSubtle, width: _endDateError ? 1.5 : 1),
                      ),
                    ),
                  ),
                ],
              ),
              if (_startDateError || _endDateError) ...[
                SizedBox(height: context.h(6)),
                Text(
                  _startDateError ? 'Start date is required.' : 'End date must be on or after the start date.',
                  style: TextStyle(color: AppColors.danger, fontSize: context.sp(11.5)),
                ),
              ],
              SizedBox(height: context.h(14)),
              TextFormField(
                controller: _reasonController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Reason'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Please provide a reason' : null,
              ),
              SizedBox(height: context.h(18)),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Submit Request'),
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

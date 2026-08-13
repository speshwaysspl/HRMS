import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_provider.dart';
import '../../services/leave_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';

class LeavesScreen extends StatefulWidget {
  const LeavesScreen({super.key});

  @override
  State<LeavesScreen> createState() => _LeavesScreenState();
}

class _LeavesScreenState extends State<LeavesScreen> {
  final _service = LeaveService();
  List<Map<String, dynamic>> _leaves = [];
  List<Map<String, dynamic>> _balance = [];
  List<Map<String, dynamic>> _leaveTypes = [];
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
    final userId = context.read<AuthProvider>().user?.id ?? '';
    try {
      final results = await Future.wait([
        _service.getLeaves(userId),
        _service.getBalance(),
        _service.getLeaveTypes(),
      ]);
      if (!mounted) return;
      setState(() {
        _leaves = results[0];
        _balance = results[1];
        _leaveTypes = results[2];
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

  Future<void> _openApplySheet() async {
    final userId = context.read<AuthProvider>().user?.id ?? '';
    final applied = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ApplyLeaveSheet(userId: userId, leaveTypes: _leaveTypes, service: _service),
    );
    if (applied == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leaves')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openApplySheet,
        icon: const Icon(Icons.add),
        label: const Text('Apply'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_balance.isNotEmpty) ...[
                        const Text('Leave Balance', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.ink)),
                        const SizedBox(height: 10),
                        SizedBox(
                          height: 92,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: _balance.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 10),
                            itemBuilder: (_, i) {
                              final b = _balance[i];
                              return Container(
                                width: 130,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppColors.brand50,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${b['remaining']}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.brand700)),
                                    const SizedBox(height: 2),
                                    Text('${b['leaveType']}', maxLines: 2, style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                      const Text('My Requests', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.ink)),
                      const SizedBox(height: 10),
                      if (_leaves.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: CenteredMessage(icon: Icons.beach_access_outlined, message: 'No leave requests yet.'),
                        )
                      else
                        ..._leaves.map((l) => SimpleCard(
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('${l['leaveType']}', style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink)),
                                        const SizedBox(height: 4),
                                        Text(_dateRange(l), style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                                        if ((l['reason'] ?? '').toString().isNotEmpty) ...[
                                          const SizedBox(height: 4),
                                          Text('${l['reason']}', style: const TextStyle(color: AppColors.inkFaint, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                                        ],
                                      ],
                                    ),
                                  ),
                                  StatusPill(label: (l['status'] ?? 'Pending').toString()),
                                ],
                              ),
                            )),
                    ],
                  ),
                ),
    );
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
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _startDate == null || _endDate == null || _selectedType == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill in all fields')));
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
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
        ),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Apply for Leave', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.ink)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _selectedType,
                decoration: const InputDecoration(labelText: 'Leave Type'),
                items: widget.leaveTypes
                    .map((t) => DropdownMenuItem(value: t['name'].toString(), child: Text(t['name'].toString())))
                    .toList(),
                onChanged: (v) => setState(() => _selectedType = v),
                validator: (v) => v == null ? 'Required' : null,
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _pickDate(isStart: true),
                      child: Text(_startDate == null ? 'Start Date' : DateFormat('d MMM, yyyy').format(_startDate!)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _pickDate(isStart: false),
                      child: Text(_endDate == null ? 'End Date' : DateFormat('d MMM, yyyy').format(_endDate!)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _reasonController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Reason'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Please provide a reason' : null,
              ),
              const SizedBox(height: 18),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Submit Request'),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../services/leave_type_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';

class AdminLeaveTypesScreen extends StatefulWidget {
  const AdminLeaveTypesScreen({super.key});

  @override
  State<AdminLeaveTypesScreen> createState() => _AdminLeaveTypesScreenState();
}

class _AdminLeaveTypesScreenState extends State<AdminLeaveTypesScreen> {
  final _service = LeaveTypeService();
  List<Map<String, dynamic>> _items = [];
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
      final data = await _service.getAll();
      if (!mounted) return;
      setState(() {
        _items = data;
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

  Future<void> _edit([Map<String, dynamic>? existing]) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TypeSheet(service: _service, existing: existing),
    );
    if (saved == true) _load();
  }

  Future<void> _delete(Map<String, dynamic> t) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete leave type?'),
        content: Text('“${t['name']}” will no longer be selectable for new requests.'),
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
      await _service.remove(t['_id'].toString());
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leave Types')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _edit(),
        icon: const Icon(Icons.add),
        label: const Text('Add'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          CenteredMessage(icon: Icons.beach_access_outlined, message: 'No leave types configured.'),
                        ])
                      : ListView(
                          padding: EdgeInsets.all(context.w(16)),
                          children: _items.map((t) {
                            final active = t['isActive'] != false;
                            return SimpleCard(
                              onTap: () => _edit(t),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(t['name']?.toString() ?? '',
                                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                        SizedBox(height: context.h(3)),
                                        Text(
                                          '${t['annualQuota'] ?? 0} days/year'
                                          '${t['requiresApproval'] == false ? '  ·  auto-approved' : ''}',
                                          style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  SizedBox(width: context.w(8)),
                                  StatusPill(label: active ? 'Active' : 'Inactive'),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                                    onPressed: () => _delete(t),
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

class _TypeSheet extends StatefulWidget {
  final LeaveTypeService service;
  final Map<String, dynamic>? existing;
  const _TypeSheet({required this.service, this.existing});

  @override
  State<_TypeSheet> createState() => _TypeSheetState();
}

class _TypeSheetState extends State<_TypeSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _quota;
  bool _requiresApproval = true;
  bool _isActive = true;
  bool _saving = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.existing?['name']?.toString() ?? '');
    _quota = TextEditingController(text: (widget.existing?['annualQuota'] ?? '').toString());
    _requiresApproval = widget.existing?['requiresApproval'] != false;
    _isActive = widget.existing?['isActive'] != false;
  }

  @override
  void dispose() {
    _name.dispose();
    _quota.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final quota = int.tryParse(_quota.text.trim()) ?? 0;
    setState(() => _saving = true);
    try {
      if (_isEdit) {
        await widget.service.update(
          widget.existing!['_id'].toString(),
          name: _name.text.trim(),
          annualQuota: quota,
          requiresApproval: _requiresApproval,
          isActive: _isActive,
        );
      } else {
        await widget.service.add(
          name: _name.text.trim(),
          annualQuota: quota,
          requiresApproval: _requiresApproval,
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: EdgeInsets.all(context.w(20)),
        decoration: const BoxDecoration(
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
                Text(_isEdit ? 'Edit Leave Type' : 'New Leave Type',
                    style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
                SizedBox(height: context.h(16)),
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Name'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                SizedBox(height: context.h(14)),
                TextFormField(
                  controller: _quota,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Annual quota (days)'),
                  validator: (v) => (int.tryParse(v?.trim() ?? '') == null) ? 'Enter a number' : null,
                ),
                SwitchListTile(
                  value: _requiresApproval,
                  onChanged: (v) => setState(() => _requiresApproval = v),
                  title: Text('Requires approval', style: TextStyle(fontSize: context.sp(14))),
                  contentPadding: EdgeInsets.zero,
                ),
                if (_isEdit)
                  SwitchListTile(
                    value: _isActive,
                    onChanged: (v) => setState(() => _isActive = v),
                    title: Text('Active', style: TextStyle(fontSize: context.sp(14))),
                    contentPadding: EdgeInsets.zero,
                  ),
                SizedBox(height: context.h(10)),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_isEdit ? 'Save' : 'Create'),
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

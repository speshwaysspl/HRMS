import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_client.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/simple_list_tile.dart';
import 'admin_team_detail_screen.dart';
import '../../widgets/hrms_app_bar.dart';

class AdminTeamsScreen extends StatefulWidget {
  const AdminTeamsScreen({super.key});

  @override
  State<AdminTeamsScreen> createState() => _AdminTeamsScreenState();
}

class _AdminTeamsScreenState extends State<AdminTeamsScreen> {
  final _service = TeamService();
  List<Map<String, dynamic>> _teams = [];
  bool _loading = true;
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
      final data = await _service.getTeams();
      if (!mounted) return;
      setState(() {
        _teams = data;
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

  Future<void> _create() async {
    final made = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateTeamSheet(service: _service),
    );
    if (made == true) _load();
  }

  Future<void> _delete(Map<String, dynamic> t) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete team?'),
        content: Text('“${t['name']}” will be removed. Members are not deleted.'),
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
      await _service.deleteTeam(t['_id'].toString());
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
      appBar: HrmsAppBar(title: const Text('Teams')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        icon: const Icon(Icons.add),
        label: const Text('New team'),
      ),
      body: _loading
          ? ListView(
 padding: EdgeInsets.all(context.w(16)),
 children: const [SkeletonListTile(), SkeletonListTile(), SkeletonListTile(), SkeletonListTile()],
 )
          : _error != null
              ? buildErrorState(_error!, _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _teams.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          EmptyStateView(icon: Icons.groups_outlined, title: 'No teams yet', subtitle: 'Tap New team to create one.'),
                        ])
                      : ListView.builder(
                          padding: EdgeInsets.all(context.w(16)),
                          itemCount: _teams.length,
                          itemBuilder: (_, i) {
                            final t = _teams[i];
                            final lead = (t['leadId'] as Map?) ?? {};
                            final memberCount = (t['members'] as List?)?.length ?? 0;
                            return SimpleCard(
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => AdminTeamDetailScreen(
                                      id: t['_id'].toString(), name: t['name']?.toString() ?? 'Team'),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: context.r(40),
                                    height: context.r(40),
                                    decoration: BoxDecoration(color: AppColors.brand50, borderRadius: BorderRadius.circular(10)),
                                    child: Icon(Icons.groups_outlined, color: AppColors.brand600, size: context.r(22)),
                                  ),
                                  SizedBox(width: context.w(12)),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(t['name']?.toString() ?? '',
                                            style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                        SizedBox(height: context.h(2)),
                                        Text('Lead: ${lead['name'] ?? '—'}  ·  $memberCount members',
                                            style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                                    onPressed: () => _delete(t),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

class _CreateTeamSheet extends StatefulWidget {
  final TeamService service;
  const _CreateTeamSheet({required this.service});

  @override
  State<_CreateTeamSheet> createState() => _CreateTeamSheetState();
}

class _CreateTeamSheetState extends State<_CreateTeamSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _desc = TextEditingController();
  String? _leadId;
  DateTime? _startDate;
  List<Map<String, dynamic>> _leads = [];
  bool _loadingLeads = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadLeads();
  }

  Future<void> _loadLeads() async {
    try {
      final l = await widget.service.getLeads();
      if (!mounted) return;
      setState(() {
        _leads = l;
        _loadingLeads = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingLeads = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_leadId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick a team lead')));
      return;
    }
    setState(() => _saving = true);
    try {
      await widget.service.createTeam(
        name: _name.text.trim(),
        leadId: _leadId!,
        description: _desc.text.trim(),
        startDate: _startDate == null ? null : DateFormat('yyyy-MM-dd').format(_startDate!),
      );
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
                Text('New Team',
                    style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
                SizedBox(height: context.h(16)),
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Team name'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                SizedBox(height: context.h(14)),
                _loadingLeads
                    ? const LinearProgressIndicator()
                    : DropdownButtonFormField<String>(
                        initialValue: _leadId,
                        decoration: const InputDecoration(labelText: 'Team lead'),
                        items: _leads
                            .map((l) => DropdownMenuItem(
                                  value: l['_id'].toString(),
                                  child: Text(l['name']?.toString() ?? l['email']?.toString() ?? ''),
                                ))
                            .toList(),
                        onChanged: (v) => setState(() => _leadId = v),
                      ),
                SizedBox(height: context.h(14)),
                OutlinedButton.icon(
                  onPressed: () async {
                    final now = DateTime.now();
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: now,
                      firstDate: DateTime(now.year - 1),
                      lastDate: DateTime(now.year + 3),
                    );
                    if (picked != null) setState(() => _startDate = picked);
                  },
                  icon: const Icon(Icons.calendar_today_outlined, size: 16),
                  label: Text(_startDate == null
                      ? 'Start date (optional)'
                      : DateFormat('d MMM, yyyy').format(_startDate!)),
                ),
                SizedBox(height: context.h(14)),
                TextFormField(
                  controller: _desc,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Description (optional)'),
                ),
                SizedBox(height: context.h(18)),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Create team'),
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

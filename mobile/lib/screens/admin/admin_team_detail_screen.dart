import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../services/employee_service.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/hrms_app_bar.dart';

class AdminTeamDetailScreen extends StatefulWidget {
  final String id;
  final String name;
  const AdminTeamDetailScreen({super.key, required this.id, required this.name});

  @override
  State<AdminTeamDetailScreen> createState() => _AdminTeamDetailScreenState();
}

class _AdminTeamDetailScreenState extends State<AdminTeamDetailScreen> {
  final _service = TeamService();
  Map<String, dynamic>? _detail;
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
      final data = await _service.getTeamDetail(widget.id);
      if (!mounted) return;
      setState(() {
        _detail = data;
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

  Future<void> _addMembers() async {
    final picked = await showModalBottomSheet<List<String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _MemberPickerSheet(),
    );
    if (picked == null || picked.isEmpty) return;
    try {
      await _service.addMembers(widget.id, picked);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final memberStats = (_detail?['memberStats'] as List?) ??
        (_detail?['team'] as Map?)?['members'] as List? ??
        [];

    return Scaffold(
      appBar: HrmsAppBar(title: Text(widget.name)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addMembers,
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Add members'),
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
                  child: ListView(
                    padding: EdgeInsets.all(context.w(16)),
                    children: [
                      Text('Members',
                          style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w700, color: AppColors.ink)),
                      SizedBox(height: context.h(10)),
                      if (memberStats.isEmpty)
                        const EmptyStateView(icon: Icons.person_outline, title: 'No members yet', subtitle: 'Tap Add members to build this team.')
                      else
                        ...memberStats.map((m) {
                          final member = (m['member'] as Map?) ?? m;
                          final user = (member['userId'] as Map?) ?? {};
                          return SimpleCard(
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: context.r(18),
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
                                          style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink)),
                                      if (m['role'] != null)
                                        Text('${m['role']}',
                                            style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
                                    ],
                                  ),
                                ),
                                if (m['completed'] != null)
                                  Text('${m['completed']}/${m['totalTasks'] ?? 0} tasks',
                                      style: TextStyle(color: AppColors.inkFaint, fontSize: context.sp(12))),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
    );
  }
}

class _MemberPickerSheet extends StatefulWidget {
  const _MemberPickerSheet();

  @override
  State<_MemberPickerSheet> createState() => _MemberPickerSheetState();
}

class _MemberPickerSheetState extends State<_MemberPickerSheet> {
  final _service = EmployeeService();
  List<Map<String, dynamic>> _employees = [];
  final Set<String> _selected = {};
  bool _loading = true;
  Object? _loadError;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final data = await _service.getEmployees();
      if (!mounted) return;
      setState(() {
        _employees = data;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadError = e;
          _loading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get _visible {
    if (_query.isEmpty) return _employees;
    final q = _query.toLowerCase();
    return _employees.where((e) {
      final name = ((e['userId'] as Map?)?['name'] ?? '').toString().toLowerCase();
      return name.contains(q) || (e['employeeId'] ?? '').toString().toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visible;
    return Container(
      height: context.hf(0.8),
      padding: EdgeInsets.all(context.w(16)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
      ),
      child: Column(
        children: [
          Text('Add team members',
              style: TextStyle(fontSize: context.sp(16), fontWeight: FontWeight.w700, color: AppColors.ink)),
          SizedBox(height: context.h(10)),
          TextField(
            onChanged: (v) => setState(() => _query = v.trim()),
            decoration: const InputDecoration(hintText: 'Search', prefixIcon: Icon(Icons.search, size: 20)),
          ),
          SizedBox(height: context.h(8)),
          Expanded(
            child: _loading
                ? ListView(children: const [SkeletonListTile(), SkeletonListTile(), SkeletonListTile()])
                : _loadError != null
                    ? buildErrorState(_loadError!, _load)
                    : visible.isEmpty
                        ? const EmptyStateView(icon: Icons.person_search_outlined, title: 'No employees found')
                        : ListView.builder(
                            itemCount: visible.length,
                            itemBuilder: (_, i) {
                              final e = visible[i];
                              final id = e['_id'].toString();
                              final name = ((e['userId'] as Map?)?['name'] ?? 'Employee').toString();
                              return CheckboxListTile(
                                dense: true,
                                value: _selected.contains(id),
                                onChanged: (v) => setState(() => v == true ? _selected.add(id) : _selected.remove(id)),
                                title: Text(name, style: TextStyle(fontSize: context.sp(14))),
                                subtitle: Text('${e['employeeId'] ?? ''} · ${e['designation'] ?? ''}',
                                    style: TextStyle(fontSize: context.sp(11))),
                              );
                            },
                          ),
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _selected.isEmpty ? null : () => Navigator.pop(context, _selected.toList()),
              child: Text('Add ${_selected.length} member${_selected.length == 1 ? '' : 's'}'),
            ),
          ),
        ],
      ),
    );
  }
}

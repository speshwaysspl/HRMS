import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../services/employee_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';
import 'admin_employee_detail_screen.dart';
import 'admin_employee_form_screen.dart';

class AdminEmployeesScreen extends StatefulWidget {
  const AdminEmployeesScreen({super.key});

  @override
  State<AdminEmployeesScreen> createState() => _AdminEmployeesScreenState();
}

class _AdminEmployeesScreenState extends State<AdminEmployeesScreen> {
  final _service = EmployeeService();
  List<Map<String, dynamic>> _all = [];
  bool _loading = true;
  String? _error;
  String _query = '';

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
      final data = await _service.getEmployees();
      if (!mounted) return;
      setState(() {
        _all = data;
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

  List<Map<String, dynamic>> get _visible {
    if (_query.isEmpty) return _all;
    final q = _query.toLowerCase();
    return _all.where((e) {
      final user = e['userId'] as Map? ?? {};
      final name = (user['name'] ?? '').toString().toLowerCase();
      final code = (e['employeeId'] ?? '').toString().toLowerCase();
      final desig = (e['designation'] ?? '').toString().toLowerCase();
      return name.contains(q) || code.contains(q) || desig.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Employees')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final saved = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const AdminEmployeeFormScreen()),
          );
          if (saved == true) _load();
        },
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Add'),
      ),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(context.w(16), context.h(12), context.w(16), context.h(4)),
            child: TextField(
              onChanged: (v) => setState(() => _query = v.trim()),
              decoration: const InputDecoration(
                hintText: 'Search by name, ID or role',
                prefixIcon: Icon(Icons.search, size: 20),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: _visible.isEmpty
                            ? ListView(children: const [
                                SizedBox(height: 100),
                                CenteredMessage(icon: Icons.groups_outlined, message: 'No employees found.'),
                              ])
                            : ListView(
                                padding: EdgeInsets.all(context.w(16)),
                                children: _visible.map(_row).toList(),
                              ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _row(Map<String, dynamic> e) {
    final user = e['userId'] as Map? ?? {};
    final dept = e['department'] as Map? ?? {};
    final name = user['name']?.toString() ?? 'Employee';
    final status = (e['status'] ?? 'active').toString();

    return SimpleCard(
      onTap: () async {
        final changed = await Navigator.of(context).push<bool>(
          MaterialPageRoute(builder: (_) => AdminEmployeeDetailScreen(id: e['_id'].toString())),
        );
        if (changed == true) _load();
      },
      child: Row(
        children: [
          CircleAvatar(
            radius: context.r(20),
            backgroundColor: AppColors.brand100,
            child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w700)),
          ),
          SizedBox(width: context.w(12)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink)),
                SizedBox(height: context.h(2)),
                Text(
                  [
                    e['designation']?.toString(),
                    dept['dep_name']?.toString(),
                  ].where((x) => x != null && x.isNotEmpty).join(' · '),
                  style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
                ),
              ],
            ),
          ),
          SizedBox(width: context.w(8)),
          StatusPill(label: status == 'active' ? 'Active' : 'Inactive'),
        ],
      ),
    );
  }
}

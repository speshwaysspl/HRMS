import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_client.dart';
import '../../services/leave_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';
import 'admin_leave_detail_screen.dart';

class AdminLeavesScreen extends StatefulWidget {
  const AdminLeavesScreen({super.key});

  @override
  State<AdminLeavesScreen> createState() => _AdminLeavesScreenState();
}

class _AdminLeavesScreenState extends State<AdminLeavesScreen> {
  final _service = LeaveService();
  List<Map<String, dynamic>> _all = [];
  bool _loading = true;
  String? _error;
  final Set<String> _busy = {};
  String _filter = 'Pending';

  static const _filters = ['Pending', 'Approved', 'Rejected', 'All'];

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
      final data = await _service.getAllLeaves();
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

  Future<void> _decide(String id, String status) async {
    setState(() => _busy.add(id));
    try {
      await _service.setStatus(id, status);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy.remove(id));
    }
  }

  List<Map<String, dynamic>> get _visible {
    if (_filter == 'All') return _all;
    return _all.where((l) => (l['status'] ?? 'Pending').toString() == _filter).toList();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Leave Requests')),
      body: Column(
        children: [
          SizedBox(
            height: context.h(52),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: context.w(12), vertical: context.h(8)),
              children: _filters.map((f) {
                final selected = f == _filter;
                return Padding(
                  padding: EdgeInsets.only(right: context.w(8)),
                  child: ChoiceChip(
                    label: Text(f),
                    selected: selected,
                    onSelected: (_) => setState(() => _filter = f),
                  ),
                );
              }).toList(),
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
                            ? ListView(children: [
                                const SizedBox(height: 100),
                                CenteredMessage(icon: Icons.beach_access_outlined, message: 'No $_filter requests.'),
                              ])
                            : ListView(
                                padding: EdgeInsets.all(context.w(16)),
                                children: _visible.map(_card).toList(),
                              ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _card(Map<String, dynamic> l) {
    final id = l['_id'].toString();
    final emp = l['employeeId'] as Map? ?? {};
    final user = emp['userId'] as Map? ?? {};
    final status = (l['status'] ?? 'Pending').toString();
    final busy = _busy.contains(id);
    final isPending = status == 'Pending';

    return SimpleCard(
      onTap: () async {
        final changed = await Navigator.of(context).push<bool>(
          MaterialPageRoute(builder: (_) => AdminLeaveDetailScreen(id: id)),
        );
        if (changed == true) _load();
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(user['name']?.toString() ?? 'Employee',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
              ),
              SizedBox(width: context.w(8)),
              StatusPill(label: status),
            ],
          ),
          SizedBox(height: context.h(4)),
          Text('${l['leaveType'] ?? ''}  ·  ${_dateRange(l)}',
              style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
          if ((l['reason'] ?? '').toString().isNotEmpty) ...[
            SizedBox(height: context.h(4)),
            Text('Reason: ${l['reason']}',
                style: TextStyle(color: AppColors.inkFaint, fontSize: context.sp(12))),
          ],
          if (isPending) ...[
            SizedBox(height: context.h(10)),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: busy ? null : () => _decide(id, 'Rejected'),
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
                    onPressed: busy ? null : () => _decide(id, 'Approved'),
                    child: busy
                        ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

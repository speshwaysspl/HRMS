import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/simple_list_tile.dart';

class ApprovalsScreen extends StatefulWidget {
  const ApprovalsScreen({super.key});

  @override
  State<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends State<ApprovalsScreen> {
  final _service = RegularizationService();
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String? _error;
  final Set<String> _processing = {};

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
      final data = await _service.getPending();
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

  Future<void> _decide(String id, String status) async {
    setState(() => _processing.add(id));
    try {
      await _service.decide(id, status);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _processing.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Attendance Approvals')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          CenteredMessage(icon: Icons.fact_check_outlined, message: 'No pending correction requests.'),
                        ])
                      : ListView(
                          padding: const EdgeInsets.all(16),
                          children: _items.map((r) {
                            final id = r['_id'].toString();
                            final employee = r['employeeId'] as Map? ?? {};
                            final user = employee['userId'] as Map? ?? {};
                            final busy = _processing.contains(id);
                            return SimpleCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(user['name']?.toString() ?? 'Employee', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                  const SizedBox(height: 4),
                                  Text('${r['date']}  ·  In: ${r['requestedInTime']}  Out: ${r['requestedOutTime']}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                                  const SizedBox(height: 4),
                                  Text('Reason: ${r['reason']}', style: const TextStyle(color: AppColors.inkFaint, fontSize: 12)),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton(
                                          onPressed: busy ? null : () => _decide(id, 'Rejected'),
                                          style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger)),
                                          child: const Text('Reject'),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
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
                              ),
                            );
                          }).toList(),
                        ),
                ),
    );
  }
}

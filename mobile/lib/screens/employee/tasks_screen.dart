import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';

const _statuses = ['Assigned', 'In Progress', 'Review', 'Completed'];

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  final _service = TaskService();
  List<Map<String, dynamic>> _tasks = [];
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
      final tasks = await _service.getTasks();
      if (!mounted) return;
      setState(() {
        _tasks = tasks;
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

  Future<void> _changeStatus(Map<String, dynamic> task) async {
    final current = task['status']?.toString() ?? 'Assigned';
    final chosen = await showModalBottomSheet<String>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: _statuses
              .map((s) => ListTile(
                    title: Text(s),
                    trailing: s == current ? const Icon(Icons.check, color: AppColors.accent600) : null,
                    onTap: () => Navigator.pop(context, s),
                  ))
              .toList(),
        ),
      ),
    );
    if (chosen == null || chosen == current) return;
    try {
      await _service.updateStatus(task['_id'].toString(), chosen);
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
      appBar: AppBar(title: const Text('Tasks')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _tasks.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          CenteredMessage(icon: Icons.checklist_outlined, message: 'No tasks assigned yet.'),
                        ])
                      : ListView(
                          padding: const EdgeInsets.all(16),
                          children: _tasks.map((t) => _taskCard(t)).toList(),
                        ),
                ),
    );
  }

  Widget _taskCard(Map<String, dynamic> t) {
    String deadline = '';
    try {
      deadline = DateFormat('d MMM, yyyy').format(DateTime.parse(t['deadline'].toString()));
    } catch (_) {}

    return SimpleCard(
      onTap: () => _changeStatus(t),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  t['title']?.toString() ?? 'Untitled',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink),
                ),
              ),
              StatusPill(label: t['status']?.toString() ?? 'Assigned'),
            ],
          ),
          if ((t['description'] ?? '').toString().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              t['description'].toString(),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.inkMuted, fontSize: 13),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.flag_outlined, size: 14, color: AppColors.inkFaint),
              const SizedBox(width: 4),
              Text(t['priority']?.toString() ?? 'Medium', style: const TextStyle(fontSize: 12, color: AppColors.inkFaint)),
              if (deadline.isNotEmpty) ...[
                const SizedBox(width: 14),
                const Icon(Icons.event_outlined, size: 14, color: AppColors.inkFaint),
                const SizedBox(width: 4),
                Text(deadline, style: const TextStyle(fontSize: 12, color: AppColors.inkFaint)),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../main.dart';
import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
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
  Object? _lastError;

  @override
  void initState() {
    super.initState();
    final cache = AppCaches.of(context).tasksList;
    if (cache.hasData) {
      _tasks = cache.data!;
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
    try {
      final tasks = await _service.getTasks();
      if (!mounted) return;
      AppCaches.of(context).tasksList.set(tasks);
      setState(() {
        _tasks = tasks;
        _loading = false;
        _error = null;
        _lastError = null;
      });
    } catch (e) {
      if (!mounted) return;
      if (silent && _tasks.isNotEmpty) return;
      setState(() {
        _error = extractErrorMessage(e);
        _lastError = e;
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
                  child: _tasks.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          EmptyStateView(icon: Icons.checklist_outlined, title: 'No tasks assigned yet', subtitle: 'New tasks will show up here.'),
                        ])
                      : ListView(
                          padding: EdgeInsets.all(context.w(16)),
                          children: _tasks.map((t) => _taskCard(t)).toList(),
                        ),
                ),
    );
  }

  (Color, Color) _priorityColors(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return (Color(0xFFDC2626), AppColors.tint(AppColors.tint(const Color(0xFFFEE2E2))));
      case 'low':
        return (Color(0xFF16A34A), AppColors.tint(AppColors.tint(const Color(0xFFDCFCE7))));
      default:
        return (Color(0xFFEA580C), AppColors.tint(AppColors.tint(const Color(0xFFFFEDD5))));
    }
  }

  IconData _statusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Icons.check_circle_rounded;
      case 'in progress':
        return Icons.autorenew_rounded;
      case 'review':
        return Icons.rate_review_rounded;
      default:
        return Icons.assignment_outlined;
    }
  }

  Widget _taskCard(Map<String, dynamic> t) {
    String deadline = '';
    try {
      deadline = DateFormat('d MMM, yyyy').format(DateTime.parse(t['deadline'].toString()));
    } catch (_) {}

    final priority = t['priority']?.toString() ?? 'Medium';
    final status = t['status']?.toString() ?? 'Assigned';
    final (priColor, priBg) = _priorityColors(priority);

    return SimpleCard(
      onTap: () => _changeStatus(t),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: context.r(34),
                height: context.r(34),
                decoration: BoxDecoration(color: AppColors.brand50, shape: BoxShape.circle),
                child: Icon(_statusIcon(status), size: context.r(17), color: AppColors.brand600),
              ),
              SizedBox(width: context.w(10)),
              Expanded(
                child: Text(
                  t['title']?.toString() ?? 'Untitled',
                  style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink),
                ),
              ),
              SizedBox(width: context.w(8)),
              StatusPill(label: status),
            ],
          ),
          if ((t['description'] ?? '').toString().isNotEmpty) ...[
            SizedBox(height: context.h(8)),
            Padding(
              padding: EdgeInsets.only(left: context.w(44)),
              child: Text(
                t['description'].toString(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13)),
              ),
            ),
          ],
          SizedBox(height: context.h(10)),
          Padding(
            padding: EdgeInsets.only(left: context.w(44)),
            child: Wrap(
              spacing: context.w(10),
              runSpacing: context.h(6),
              children: [
                Container(
                  padding: EdgeInsets.symmetric(horizontal: context.w(9), vertical: context.h(4)),
                  decoration: BoxDecoration(color: AppColors.tint(priBg), borderRadius: BorderRadius.circular(999)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.flag_rounded, size: context.r(12), color: priColor),
                      SizedBox(width: context.w(4)),
                      Text(priority, style: TextStyle(fontSize: context.sp(11.5), fontWeight: FontWeight.w600, color: priColor)),
                    ],
                  ),
                ),
                if (deadline.isNotEmpty)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.event_outlined, size: context.r(14), color: AppColors.inkFaint),
                      SizedBox(width: context.w(4)),
                      Text(deadline, style: TextStyle(fontSize: context.sp(12), color: AppColors.inkFaint)),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

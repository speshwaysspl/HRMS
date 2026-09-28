import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../main.dart';
import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/star_rating.dart';
import '../../widgets/state_views.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/hrms_app_bar.dart';

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
    final updated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _TaskUpdateSheet(task: task, service: _service),
    );
    if (updated == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: HrmsAppBar(title: const Text('Tasks')),
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
                  ? ListView(
                      children: const [
                        SizedBox(height: 100),
                        EmptyStateView(
                          icon: Icons.checklist_outlined,
                          title: 'No tasks assigned yet',
                          subtitle: 'New tasks will show up here.',
                        ),
                      ],
                    )
                  : ListView(
                      padding: EdgeInsets.all(context.w(16)),
                      children: _tasks.map((t) => _taskCard(t)).toList(),
                    ),
            ),
    );
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
      deadline = DateFormat(
        'd MMM, yyyy',
      ).format(DateTime.parse(t['deadline'].toString()));
    } catch (_) {}
    final status = t['status']?.toString() ?? 'Assigned';

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
                decoration: BoxDecoration(
                  color: AppColors.brand50,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _statusIcon(status),
                  size: context.r(17),
                  color: AppColors.brand600,
                ),
              ),
              SizedBox(width: context.w(10)),
              Expanded(
                child: Text(
                  t['title']?.toString() ?? 'Untitled',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                  ),
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
                style: TextStyle(
                  color: AppColors.inkMuted,
                  fontSize: context.sp(13),
                ),
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
                if (deadline.isNotEmpty)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.event_outlined,
                        size: context.r(14),
                        color: AppColors.inkFaint,
                      ),
                      SizedBox(width: context.w(4)),
                      Text(
                        deadline,
                        style: TextStyle(
                          fontSize: context.sp(12),
                          color: AppColors.inkFaint,
                        ),
                      ),
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

class _TaskUpdateSheet extends StatefulWidget {
  const _TaskUpdateSheet({required this.task, required this.service});
  final Map<String, dynamic> task;
  final TaskService service;

  @override
  State<_TaskUpdateSheet> createState() => _TaskUpdateSheetState();
}

class _TaskUpdateSheetState extends State<_TaskUpdateSheet> {
  late String _status;
  late final TextEditingController _comments;
  String? _filePath;
  String? _fileName;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _status = widget.task['status']?.toString() ?? 'Assigned';
    _comments = TextEditingController(
      text: widget.task['comments']?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _comments.dispose();
    super.dispose();
  }

  String _fmt(dynamic v) {
    try {
      return DateFormat('d MMM, yyyy').format(DateTime.parse(v.toString()));
    } catch (_) {
      return '-';
    }
  }

  Future<void> _pickFile() async {
    final r = await FilePicker.platform.pickFiles();
    final f = r?.files.single;
    if (f?.path == null) return;
    setState(() {
      _filePath = f!.path;
      _fileName = f.name;
    });
  }

  Future<void> _submit() async {
    setState(() => _saving = true);
    try {
      await widget.service.updateStatus(
        widget.task['_id'].toString(),
        _status,
        comments: _comments.text.trim(),
        filePath: _filePath,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
    }
  }

  Widget _detail(String label, String value) => Padding(
    padding: EdgeInsets.only(bottom: context.h(6)),
    child: Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '$label: ',
            style: TextStyle(
              color: AppColors.inkMuted,
              fontSize: context.sp(13),
            ),
          ),
          TextSpan(
            text: value,
            style: TextStyle(color: AppColors.ink, fontSize: context.sp(13)),
          ),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final t = widget.task;
    final assignedBy = t['assignedBy'] is Map
        ? (t['assignedBy']['name']?.toString() ?? '-')
        : '-';
    final existingFile = (t['file'] ?? t['attachment'] ?? '').toString();
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: EdgeInsets.all(context.w(20)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              t['title']?.toString() ?? 'Untitled',
              style: TextStyle(
                fontSize: context.sp(18),
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(12)),
            if ((t['description'] ?? '').toString().isNotEmpty)
              _detail('Description', t['description'].toString()),
            _detail('Start Date', _fmt(t['startDate'])),
            _detail('Deadline', _fmt(t['deadline'])),
            _detail('Assigned By', assignedBy),
            if ((t['remark'] ?? '').toString().isNotEmpty)
              _detail('Remark', t['remark'].toString()),
            if (t['rating'] != null)
              Padding(
                padding: EdgeInsets.only(bottom: context.h(6)),
                child: Row(
                  children: [
                    Text(
                      'Rating: ',
                      style: TextStyle(
                        color: AppColors.inkMuted,
                        fontSize: context.sp(13),
                      ),
                    ),
                    StarRating(
                      value: (t['rating'] as num).toInt(),
                      size: context.r(16),
                    ),
                  ],
                ),
              ),
            if (existingFile.isNotEmpty)
              _detail('Work Proof', existingFile.split('/').last),
            const Divider(height: 28),
            Text(
              'Status',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(8)),
            Wrap(
              spacing: context.w(8),
              runSpacing: context.h(8),
              children: _statuses
                  .map(
                    (s) => ChoiceChip(
                      label: Text(s),
                      selected: _status == s,
                      onSelected: _saving
                          ? null
                          : (_) => setState(() => _status = s),
                    ),
                  )
                  .toList(),
            ),
            SizedBox(height: context.h(16)),
            Text(
              'Attach File (Work Proof)',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(8)),
            OutlinedButton.icon(
              onPressed: _saving ? null : _pickFile,
              icon: const Icon(Icons.attach_file),
              label: Text(
                _fileName ?? 'Choose file',
                overflow: TextOverflow.ellipsis,
              ),
            ),
            SizedBox(height: context.h(16)),
            Text(
              'Comments',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(8)),
            TextField(
              controller: _comments,
              enabled: !_saving,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Add a comment',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: context.h(20)),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _saving ? null : () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ),
                SizedBox(width: context.w(12)),
                Expanded(
                  child: FilledButton(
                    onPressed: _saving ? null : _submit,
                    child: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Update Task'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

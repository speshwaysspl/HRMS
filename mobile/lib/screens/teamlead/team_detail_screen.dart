import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/hrms_app_bar.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';

/// Team detail for team leads — mirrors web TeamDetail.jsx: a "Task List"
/// tab (add / update / view tasks) and a "Team Members" tab (per-member stats).
class TeamDetailScreen extends StatefulWidget {
  final String id;
  final String name;
  const TeamDetailScreen({super.key, required this.id, required this.name});

  @override
  State<TeamDetailScreen> createState() => _TeamDetailScreenState();
}

class _TeamDetailScreenState extends State<TeamDetailScreen>
    with SingleTickerProviderStateMixin {
  static const _statuses = [
    'Assigned',
    'In Progress',
    'Review',
    'Completed',
    'Overdue',
  ];
  final _service = TeamService();
  final _tasks = TaskService();
  late final TabController _tabs = TabController(length: 2, vsync: this);
  Map<String, dynamic>? _detail;
  bool _loading = true;
  Object? _error;
  String _filterType = 'startDate';
  DateTime? _filterFrom;
  DateTime? _filterTo;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final v = await _service.getTeamDetail(widget.id);
      if (!mounted) return;
      setState(() {
        _detail = v;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  void _toast(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  List<Map> get _taskList => ((_detail?['tasks'] as List?) ?? [])
      .whereType<Map>()
      .where((t) => t['isDeleted'] != true)
      .toList();

  String _date(dynamic v) {
    try {
      return DateFormat(
        'd MMM yyyy',
      ).format(DateTime.parse(v.toString()).toLocal());
    } catch (_) {
      return '-';
    }
  }

  Future<void> _openDoc(String path) async {
    final url = path.startsWith('http')
        ? path
        : '${ApiClient.instance.dio.options.baseUrl}/${path.startsWith('/') ? path.substring(1) : path}';
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  String _ymd(dynamic v) {
    try {
      return DateFormat(
        'yyyy-MM-dd',
      ).format(DateTime.parse(v.toString()).toLocal());
    } catch (_) {
      return '';
    }
  }

  Future<void> _pickFilter(bool from) async {
    final d = await showDatePicker(
      context: context,
      initialDate: (from ? _filterFrom : _filterTo) ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
    );
    if (d != null) setState(() => from ? _filterFrom = d : _filterTo = d);
  }

  Future<void> _downloadPdf() async {
    final from = _filterFrom == null
        ? null
        : DateFormat('yyyy-MM-dd').format(_filterFrom!);
    final to = _filterTo == null
        ? null
        : DateFormat('yyyy-MM-dd').format(_filterTo!);
    final rows = _taskList
        .where((t) {
          if (from == null && to == null) return true;
          final v = _ymd(t[_filterType]);
          if (v.isEmpty) return false;
          if (from != null && v.compareTo(from) < 0) return false;
          if (to != null && v.compareTo(to) > 0) return false;
          return true;
        })
        .map(
          (t) => [
            t['title']?.toString() ?? '',
            ((t['assignedTo'] as Map?)?['userId'] as Map?)?['name']
                    ?.toString() ??
                'Unassigned',
            t['status']?.toString() ?? '',
            _date(t['startDate']),
            _date(t['deadline']),
            (t['description']?.toString().isNotEmpty ?? false)
                ? t['description'].toString()
                : '-',
          ],
        )
        .toList();
    try {
      final doc = pw.Document();
      doc.addPage(
        pw.MultiPage(
          build: (_) => [
            pw.Text(
              'Task List - ${widget.name}',
              style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 10),
            pw.TableHelper.fromTextArray(
              headers: const [
                'Task',
                'Assigned To',
                'Status',
                'Start Date',
                'Due Date',
                'Remark',
              ],
              data: rows,
              cellStyle: const pw.TextStyle(fontSize: 9),
            ),
          ],
        ),
      );
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/task_list.pdf');
      await file.writeAsBytes(await doc.save());
      await OpenFilex.open(file.path);
    } catch (e) {
      _toast('Could not create PDF: ${extractErrorMessage(e)}');
    }
  }

  Future<void> _openMember(Map stat) async {
    final member = stat['member'] as Map? ?? {};
    final name = (member['userId'] as Map?)?['name']?.toString() ?? 'Employee';
    final memberTasks = _taskList
        .where((t) => (t['assignedTo'] as Map?)?['_id'] == member['_id'])
        .toList();
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _MemberSheet(
        name: name,
        employeeMongoId: member['_id'].toString(),
        tasks: memberTasks,
        date: _date,
        openDoc: _openDoc,
      ),
    );
  }

  Color _statusColor(String s) => switch (s) {
    'Completed' => AppColors.accent600,
    'In Progress' => AppColors.warning,
    'Overdue' => AppColors.danger,
    _ => AppColors.brand600,
  };

  Future<void> _addTask() async {
    final members = ((_detail?['memberStats'] as List?) ?? [])
        .whereType<Map>()
        .map((m) => m['member'])
        .whereType<Map>()
        .toList();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _AssignTaskSheet(
        teamId: widget.id,
        members: members,
        service: _tasks,
      ),
    );
    if (ok == true) {
      _toast('Task assigned successfully');
      _load();
    }
  }

  Future<void> _updateTask(Map task) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) =>
          _UpdateTaskSheet(task: task, statuses: _statuses, service: _tasks),
    );
    if (ok == true) {
      _toast('Task updated');
      _load();
    }
  }

  void _viewTask(Map task) {
    final assignee =
        ((task['assignedTo'] as Map?)?['userId'] as Map?)?['name']
            ?.toString() ??
        'Unassigned';
    final remark = task['description']?.toString() ?? '';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.all(context.w(20)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Task Details',
              style: TextStyle(
                fontSize: context.sp(16),
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(12)),
            _kv('Title', task['title']?.toString() ?? '-'),
            _kv('Assigned to', assignee),
            _kv('Status', task['status']?.toString() ?? '-'),
            _kv('Priority', task['priority']?.toString() ?? '-'),
            _kv('Start', _date(task['startDate'])),
            _kv('Due', _date(task['deadline'])),
            _kv('Remark', remark.isEmpty ? '-' : remark),
            SizedBox(height: context.h(8)),
          ],
        ),
      ),
    );
  }

  Widget _kv(String k, String v) => Padding(
    padding: EdgeInsets.only(bottom: context.h(8)),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: context.w(96),
          child: Text(
            k,
            style: TextStyle(
              color: AppColors.inkMuted,
              fontSize: context.sp(13),
            ),
          ),
        ),
        Expanded(
          child: Text(
            v,
            style: TextStyle(
              color: AppColors.ink,
              fontSize: context.sp(13),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    ),
  );

  Widget _taskTab() {
    final tasks = _taskList;
    final f = DateFormat('d MMM');
    final bar = Padding(
      padding: EdgeInsets.fromLTRB(
        context.w(16),
        context.h(4),
        context.w(16),
        context.h(4),
      ),
      child: Wrap(
        spacing: context.w(8),
        runSpacing: context.h(4),
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          DropdownButton<String>(
            value: _filterType,
            underline: const SizedBox.shrink(),
            items: const [
              DropdownMenuItem(value: 'startDate', child: Text('Start Date')),
              DropdownMenuItem(value: 'deadline', child: Text('Due Date')),
            ],
            onChanged: (v) => setState(() => _filterType = v ?? _filterType),
          ),
          OutlinedButton(
            onPressed: () => _pickFilter(true),
            child: Text(_filterFrom == null ? 'From' : f.format(_filterFrom!)),
          ),
          OutlinedButton(
            onPressed: () => _pickFilter(false),
            child: Text(_filterTo == null ? 'To' : f.format(_filterTo!)),
          ),
          ElevatedButton.icon(
            onPressed: _downloadPdf,
            icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
            label: const Text('Download PDF'),
          ),
        ],
      ),
    );
    final body = RefreshIndicator(
      onRefresh: _load,
      child: tasks.isEmpty
          ? ListView(
              children: const [
                SizedBox(height: 100),
                EmptyStateView(icon: Icons.task_alt, title: 'No tasks found'),
              ],
            )
          : ListView(
              padding: EdgeInsets.fromLTRB(
                context.w(16),
                context.h(8),
                context.w(16),
                context.h(90),
              ),
              children: tasks.map((t) {
                final status = t['status']?.toString() ?? '';
                final assignee =
                    ((t['assignedTo'] as Map?)?['userId'] as Map?)?['name']
                        ?.toString() ??
                    'Unassigned';
                final color = _statusColor(status);
                final remark = t['description']?.toString() ?? '';
                return SimpleCard(
                  onTap: () => _viewTask(t),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              t['title']?.toString() ?? '',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: AppColors.ink,
                              ),
                            ),
                          ),
                          Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: context.w(10),
                              vertical: context.h(3),
                            ),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              status,
                              style: TextStyle(
                                color: color,
                                fontSize: context.sp(11),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: context.h(6)),
                      Text(
                        'Assigned to: $assignee',
                        style: TextStyle(
                          color: AppColors.inkMuted,
                          fontSize: context.sp(12),
                        ),
                      ),
                      Text(
                        'Start: ${_date(t['startDate'])}   Due: ${_date(t['deadline'])}',
                        style: TextStyle(
                          color: AppColors.inkMuted,
                          fontSize: context.sp(12),
                        ),
                      ),
                      if (remark.isNotEmpty)
                        Padding(
                          padding: EdgeInsets.only(top: context.h(4)),
                          child: Text(
                            remark,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: AppColors.inkMuted,
                              fontSize: context.sp(12),
                            ),
                          ),
                        ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if ((t['workProof']?.toString() ?? '').isNotEmpty)
                            TextButton.icon(
                              onPressed: () =>
                                  _openDoc(t['workProof'].toString()),
                              icon: const Icon(
                                Icons.visibility_outlined,
                                size: 18,
                              ),
                              label: const Text('View Doc'),
                            ),
                          TextButton.icon(
                            onPressed: () => _updateTask(t),
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            label: const Text('Update'),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
    return Column(
      children: [
        bar,
        Expanded(child: body),
      ],
    );
  }

  Widget _membersTab() {
    final stats = ((_detail?['memberStats'] as List?) ?? [])
        .whereType<Map>()
        .toList();
    if (stats.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          children: const [
            SizedBox(height: 100),
            EmptyStateView(icon: Icons.person_outline, title: 'No members in this team yet'),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: EdgeInsets.all(context.w(16)),
        children: stats.map((m) {
          final member = m['member'] as Map? ?? {};
          final user = member['userId'] as Map? ?? {};
          final progress = ((m['progress'] as num?) ?? 0).toDouble();
          final name = user['name']?.toString() ?? 'Unknown';
          return SimpleCard(
            onTap: () => _openMember(m),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: context.r(18),
                      backgroundColor: AppColors.brand100,
                      child: Text(
                        (name.isNotEmpty ? name[0] : '?').toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.brand700,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    SizedBox(width: context.w(12)),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: AppColors.ink,
                            ),
                          ),
                          Text(
                            member['employeeId']?.toString() ?? '',
                            style: TextStyle(
                              color: AppColors.inkMuted,
                              fontSize: context.sp(12),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      'Total: ${m['totalTasks'] ?? 0}',
                      style: TextStyle(
                        color: AppColors.inkMuted,
                        fontSize: context.sp(12),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: context.h(10)),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: (progress / 100).clamp(0.0, 1.0),
                    minHeight: context.h(6),
                    color: AppColors.accent600,
                    backgroundColor: AppColors.surfaceSubtle,
                  ),
                ),
                SizedBox(height: context.h(6)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Completed ${m['completed'] ?? 0}',
                      style: TextStyle(
                        color: AppColors.accent600,
                        fontSize: context.sp(11),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Pending ${m['pending'] ?? 0}',
                      style: TextStyle(
                        color: AppColors.warning,
                        fontSize: context.sp(11),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Overdue ${m['overdue'] ?? 0}',
                      style: TextStyle(
                        color: AppColors.danger,
                        fontSize: context.sp(11),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${progress.round()}%',
                      style: TextStyle(
                        color: AppColors.inkMuted,
                        fontSize: context.sp(11),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final leadName =
        ((_detail?['team'] as Map?)?['leadId'] as Map?)?['name']?.toString() ??
        'N/A';
    return Scaffold(
      appBar: HrmsAppBar(
        title: Text(widget.name),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Task List'),
            Tab(text: 'Team Members'),
          ],
        ),
      ),
      floatingActionButton: _loading || _error != null
          ? null
          : FloatingActionButton.extended(
              onPressed: _addTask,
              icon: const Icon(Icons.add),
              label: const Text('Add Task'),
            ),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: const [SkeletonListTile(), SkeletonListTile(), SkeletonListTile(), SkeletonListTile()],
            )
          : _error != null
          ? buildErrorState(_error!, () {
              setState(() {
                _loading = true;
                _error = null;
              });
              _load();
            })
          : Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.symmetric(
                    horizontal: context.w(16),
                    vertical: context.h(10),
                  ),
                  child: Text(
                    'Lead: $leadName',
                    style: TextStyle(
                      color: AppColors.ink,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    controller: _tabs,
                    children: [_taskTab(), _membersTab()],
                  ),
                ),
              ],
            ),
    );
  }
}

class _AssignTaskSheet extends StatefulWidget {
  final String teamId;
  final List<Map> members;
  final TaskService service;
  const _AssignTaskSheet({
    required this.teamId,
    required this.members,
    required this.service,
  });

  @override
  State<_AssignTaskSheet> createState() => _AssignTaskSheetState();
}

class _AssignTaskSheetState extends State<_AssignTaskSheet> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _selected = <String>{};
  String _priority = 'Medium';
  DateTime? _start;
  DateTime? _due;
  bool _busy = false;
  String? _err;

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _pick(bool start) async {
    final d = await showDatePicker(
      context: context,
      initialDate: (start ? _start : _due) ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
    );
    if (d != null) setState(() => start ? _start = d : _due = d);
  }

  Future<void> _submit() async {
    if (_title.text.trim().isEmpty) {
      setState(() => _err = 'Enter a task title');
      return;
    }
    if (_selected.isEmpty) {
      setState(() => _err = 'Please select at least one member');
      return;
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final f = DateFormat('yyyy-MM-dd');
      await widget.service.assignTask(
        teamId: widget.teamId,
        title: _title.text.trim(),
        description: _desc.text.trim(),
        priority: _priority,
        assignedTo: _selected.toList(),
        startDate: _start == null ? null : f.format(_start!),
        deadline: _due == null ? null : f.format(_due!),
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _err = extractErrorMessage(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final f = DateFormat('d MMM yyyy');
    return Padding(
      padding: EdgeInsets.fromLTRB(
        context.w(20),
        context.h(20),
        context.w(20),
        MediaQuery.of(context).viewInsets.bottom + context.h(20),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Assign Task',
              style: TextStyle(
                fontSize: context.sp(16),
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(12)),
            TextField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Task title'),
            ),
            SizedBox(height: context.h(10)),
            TextField(
              controller: _desc,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            SizedBox(height: context.h(10)),
            DropdownButtonFormField<String>(
              initialValue: _priority,
              decoration: const InputDecoration(labelText: 'Priority'),
              items: const [
                'Low',
                'Medium',
                'High',
              ].map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
              onChanged: (v) => setState(() => _priority = v ?? 'Medium'),
            ),
            SizedBox(height: context.h(10)),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _pick(true),
                    child: Text(
                      _start == null ? 'Start date' : f.format(_start!),
                    ),
                  ),
                ),
                SizedBox(width: context.w(10)),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _pick(false),
                    child: Text(_due == null ? 'Due date' : f.format(_due!)),
                  ),
                ),
              ],
            ),
            SizedBox(height: context.h(12)),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Assign to',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() {
                    final all = widget.members
                        .map((m) => m['_id'].toString())
                        .toSet();
                    if (_selected.length == all.length) {
                      _selected.clear();
                    } else {
                      _selected.addAll(all);
                    }
                  }),
                  child: const Text('Select all'),
                ),
              ],
            ),
            ...widget.members.map((m) {
              final id = m['_id'].toString();
              final name =
                  (m['userId'] as Map?)?['name']?.toString() ?? 'Unknown';
              return CheckboxListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                value: _selected.contains(id),
                title: Text(name),
                onChanged: (v) => setState(
                  () => v == true ? _selected.add(id) : _selected.remove(id),
                ),
              );
            }),
            if (_err != null)
              Padding(
                padding: EdgeInsets.only(top: context.h(6)),
                child: Text(
                  _err!,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ),
            SizedBox(height: context.h(12)),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Assign Task'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UpdateTaskSheet extends StatefulWidget {
  final Map task;
  final List<String> statuses;
  final TaskService service;
  const _UpdateTaskSheet({
    required this.task,
    required this.statuses,
    required this.service,
  });

  @override
  State<_UpdateTaskSheet> createState() => _UpdateTaskSheetState();
}

class _UpdateTaskSheetState extends State<_UpdateTaskSheet> {
  late String _status = widget.statuses.contains(widget.task['status'])
      ? widget.task['status'].toString()
      : widget.statuses.first;
  late final _remark = TextEditingController(
    text: widget.task['description']?.toString() ?? '',
  );
  bool _busy = false;
  String? _err;
  String? _filePath;
  String? _fileName;

  Future<void> _pickFile() async {
    final r = await FilePicker.platform.pickFiles();
    final f = r?.files.single;
    if (f?.path != null) {
      setState(() {
        _filePath = f!.path;
        _fileName = f.name;
      });
    }
  }

  @override
  void dispose() {
    _remark.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      await widget.service.updateStatus(
        widget.task['_id'].toString(),
        _status,
        remark: _remark.text.trim(),
        filePath: _filePath,
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _err = extractErrorMessage(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        context.w(20),
        context.h(20),
        context.w(20),
        MediaQuery.of(context).viewInsets.bottom + context.h(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Update Task',
            style: TextStyle(
              fontSize: context.sp(16),
              fontWeight: FontWeight.w700,
              color: AppColors.ink,
            ),
          ),
          SizedBox(height: context.h(4)),
          Text(
            widget.task['title']?.toString() ?? '',
            style: TextStyle(color: AppColors.inkMuted),
          ),
          SizedBox(height: context.h(12)),
          DropdownButtonFormField<String>(
            initialValue: _status,
            decoration: const InputDecoration(labelText: 'Status'),
            items: widget.statuses
                .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                .toList(),
            onChanged: (v) => setState(() => _status = v ?? _status),
          ),
          SizedBox(height: context.h(10)),
          TextField(
            controller: _remark,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Remark'),
          ),
          SizedBox(height: context.h(10)),
          OutlinedButton.icon(
            onPressed: _pickFile,
            icon: const Icon(Icons.attach_file),
            label: Text(
              _fileName ?? 'Attach file (work proof)',
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (_err != null)
            Padding(
              padding: EdgeInsets.only(top: context.h(6)),
              child: Text(
                _err!,
                style: const TextStyle(color: AppColors.danger),
              ),
            ),
          SizedBox(height: context.h(12)),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save'),
            ),
          ),
        ],
      ),
    );
  }
}

class _MemberSheet extends StatefulWidget {
  final String name;
  final String employeeMongoId;
  final List<Map> tasks;
  final String Function(dynamic) date;
  final Future<void> Function(String) openDoc;
  const _MemberSheet({
    required this.name,
    required this.employeeMongoId,
    required this.tasks,
    required this.date,
    required this.openDoc,
  });

  @override
  State<_MemberSheet> createState() => _MemberSheetState();
}

class _MemberSheetState extends State<_MemberSheet> {
  List<Map>? _docs;
  String? _err;

  @override
  void initState() {
    super.initState();
    _loadDocs();
  }

  Future<void> _loadDocs() async {
    try {
      final res = await ApiClient.instance.dio.get('/api/document');
      final all = ((res.data as Map)['documents'] as List? ?? [])
          .whereType<Map>();
      final mine = all.where((d) {
        final e = d['employeeId'];
        final id = e is Map ? e['_id'] : e;
        return id.toString() == widget.employeeMongoId;
      }).toList();
      if (mounted) setState(() => _docs = mine);
    } catch (e) {
      if (mounted) {
        setState(() {
          _docs = [];
          _err = extractErrorMessage(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      maxChildSize: 0.95,
      builder: (_, controller) => ListView(
        controller: controller,
        padding: EdgeInsets.all(context.w(20)),
        children: [
          Text(
            '${widget.name} - Details',
            style: TextStyle(
              fontSize: context.sp(16),
              fontWeight: FontWeight.w700,
              color: AppColors.ink,
            ),
          ),
          SizedBox(height: context.h(14)),
          Text(
            'Tasks',
            style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink),
          ),
          SizedBox(height: context.h(6)),
          if (widget.tasks.isEmpty)
            Text(
              'No tasks assigned.',
              style: TextStyle(color: AppColors.inkMuted),
            )
          else
            ...widget.tasks.map(
              (t) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                title: Text(t['title']?.toString() ?? ''),
                subtitle: Text('Due ${widget.date(t['deadline'])}'),
                trailing: Text(
                  t['status']?.toString() ?? '',
                  style: TextStyle(color: AppColors.inkMuted),
                ),
              ),
            ),
          SizedBox(height: context.h(14)),
          Text(
            'Documents',
            style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink),
          ),
          SizedBox(height: context.h(6)),
          if (_docs == null)
            const Column(children: [SkeletonListTile(), SkeletonListTile()])
          else if (_docs!.isEmpty)
            Text(
              _err ?? 'No documents found.',
              style: TextStyle(color: AppColors.inkMuted),
            )
          else
            ..._docs!.map(
              (d) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                title: Text(d['originalName']?.toString() ?? 'Document'),
                subtitle: Text(
                  '${widget.date(d['createdAt'])}  -  ${d['status'] ?? 'Pending'}',
                ),
                trailing: const Icon(Icons.open_in_new, size: 18),
                onTap: () => widget.openDoc(d['fileUrl']?.toString() ?? ''),
              ),
            ),
        ],
      ),
    );
  }
}

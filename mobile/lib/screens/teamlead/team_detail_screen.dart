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
import 'team_attendance_tab.dart';

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
  late final TabController _tabs = TabController(length: 3, vsync: this);
  Map<String, dynamic>? _detail;
  bool _loading = true;
  Object? _error;
  String _filterType = 'startDate';
  DateTime? _filterFrom;
  DateTime? _filterTo;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    // Rebuild on tab change so Add Task only shows on the task list.
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging) setState(() {});
    });
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

  String _assignee(Map t) =>
      ((t['assignedTo'] as Map?)?['userId'] as Map?)?['name']?.toString() ??
      'Unassigned';

  bool _hasProof(Map t) => (t['workProof']?.toString() ?? '').isNotEmpty;

  Future<void> _openMember(Map stat) async {
    final member = stat['member'] as Map? ?? {};
    // Like the web modal, the member view also lists deleted tasks (flagged).
    final memberTasks = ((_detail?['tasks'] as List?) ?? [])
        .whereType<Map>()
        .where((t) => (t['assignedTo'] as Map?)?['_id'] == member['_id'])
        .toList();
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _MemberSheet(
        stat: stat,
        tasks: memberTasks,
        date: _date,
        openDoc: _openDoc,
        onUpdate: (t) {
          Navigator.of(context).pop();
          _updateTask(t);
        },
      ),
    );
  }

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

  Future<void> _editTask(Map task) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _EditTaskSheet(task: task, service: _tasks),
    );
    if (ok == true) {
      _toast('Task saved');
      _load();
    }
  }

  Future<void> _deleteTask(Map task) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete task?'),
        content: Text(
          '"${task['title'] ?? ''}" assigned to ${_assignee(task)} will be removed.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _tasks.deleteTask(task['_id'].toString());
      _toast('Task deleted');
      _load();
    } catch (e) {
      _toast(extractErrorMessage(e));
    }
  }

  void _onTaskAction(String action, Map task) {
    switch (action) {
      case 'update':
        _updateTask(task);
      case 'edit':
        _editTask(task);
      case 'delete':
        _deleteTask(task);
    }
  }

  void _viewTask(Map task) {
    final remark = task['description']?.toString() ?? '';
    final comment = task['comments']?.toString() ?? '';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: EdgeInsets.all(context.w(20)),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    task['title']?.toString() ?? '',
                    style: TextStyle(
                      fontSize: context.sp(18),
                      fontWeight: FontWeight.w700,
                      color: AppColors.ink,
                    ),
                  ),
                ),
                _StatusPill(task['status']?.toString() ?? ''),
              ],
            ),
            SizedBox(height: context.h(16)),
            _kv('Assigned to', _assignee(task)),
            _kv('Priority', task['priority']?.toString() ?? 'Medium'),
            _kv('Start date', _date(task['startDate'])),
            _kv('Due date', _date(task['deadline'])),
            _kv('Remark', remark.isEmpty ? '-' : remark),
            SizedBox(height: context.h(8)),
            Text(
              'Employee submission',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(8)),
            _SubmissionCard(
              comment: comment,
              proof: task['workProof']?.toString() ?? '',
              onOpen: _openDoc,
            ),
            SizedBox(height: context.h(20)),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _updateTask(task);
                    },
                    icon: const Icon(Icons.sync_alt, size: 18),
                    label: const Text('Status'),
                  ),
                ),
                SizedBox(width: context.w(8)),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _editTask(task);
                    },
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    label: const Text('Edit'),
                  ),
                ),
                SizedBox(width: context.w(8)),
                IconButton.outlined(
                  tooltip: 'Delete task',
                  onPressed: () {
                    Navigator.pop(ctx);
                    _deleteTask(task);
                  },
                  icon: const Icon(
                    Icons.delete_outline,
                    color: AppColors.danger,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _kv(String k, String v) => Padding(
    padding: EdgeInsets.only(bottom: context.h(10)),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: context.w(100),
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

  Future<void> _openPdfSheet() async {
    final f = DateFormat('d MMM yyyy');
    await showModalBottomSheet(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          Future<void> pick(bool from) async {
            await _pickFilter(from);
            setSheet(() {});
          }

          return SafeArea(
            child: Padding(
              padding: EdgeInsets.all(context.w(20)),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Download task list (PDF)',
                    style: TextStyle(
                      fontSize: context.sp(16),
                      fontWeight: FontWeight.w700,
                      color: AppColors.ink,
                    ),
                  ),
                  SizedBox(height: context.h(12)),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(
                        value: 'startDate',
                        label: Text('Start date'),
                      ),
                      ButtonSegment(value: 'deadline', label: Text('Due date')),
                    ],
                    selected: {_filterType},
                    onSelectionChanged: (v) {
                      setState(() => _filterType = v.first);
                      setSheet(() {});
                    },
                  ),
                  SizedBox(height: context.h(12)),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => pick(true),
                          child: Text(
                            _filterFrom == null
                                ? 'From'
                                : f.format(_filterFrom!),
                          ),
                        ),
                      ),
                      SizedBox(width: context.w(10)),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => pick(false),
                          child: Text(
                            _filterTo == null ? 'To' : f.format(_filterTo!),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_filterFrom != null || _filterTo != null)
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _filterFrom = null;
                          _filterTo = null;
                        });
                        setSheet(() {});
                      },
                      child: const Text('Clear dates (all tasks)'),
                    ),
                  SizedBox(height: context.h(8)),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _downloadPdf();
                      },
                      icon: const Icon(Icons.picture_as_pdf_outlined),
                      label: const Text('Download PDF'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _taskTab() {
    final all = _taskList;
    final tasks = _statusFilter == null
        ? all
        : all.where((t) => t['status'] == _statusFilter).toList();
    int count(String s) => all.where((t) => t['status'] == s).length;

    final chips = SizedBox(
      height: context.h(52),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(
          horizontal: context.w(16),
          vertical: context.h(8),
        ),
        children: [
          ChoiceChip(
            label: Text('All ${all.length}'),
            selected: _statusFilter == null,
            onSelected: (_) => setState(() => _statusFilter = null),
          ),
          for (final s in _statuses)
            Padding(
              padding: EdgeInsets.only(left: context.w(8)),
              child: ChoiceChip(
                label: Text('$s ${count(s)}'),
                selected: _statusFilter == s,
                onSelected: (_) => setState(
                  () => _statusFilter = _statusFilter == s ? null : s,
                ),
              ),
            ),
        ],
      ),
    );

    return Column(
      children: [
        chips,
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: tasks.isEmpty
                ? ListView(
                    children: [
                      const SizedBox(height: 80),
                      EmptyStateView(
                        icon: Icons.task_alt,
                        title: all.isEmpty
                            ? 'No tasks yet'
                            : 'No $_statusFilter tasks',
                        subtitle: all.isEmpty
                            ? 'Tap Add Task to assign work to your team.'
                            : null,
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: EdgeInsets.fromLTRB(
                      context.w(16),
                      context.h(4),
                      context.w(16),
                      context.h(96),
                    ),
                    itemCount: tasks.length,
                    itemBuilder: (_, i) => _taskCard(tasks[i]),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _taskCard(Map t) {
    final name = _assignee(t);
    final comment = t['comments']?.toString() ?? '';
    final muted = TextStyle(
      color: AppColors.inkMuted,
      fontSize: context.sp(12),
    );
    return SimpleCard(
      onTap: () => _viewTask(t),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(top: context.h(4)),
                  child: Text(
                    t['title']?.toString() ?? '',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: context.sp(15),
                      color: AppColors.ink,
                    ),
                  ),
                ),
              ),
              _StatusPill(t['status']?.toString() ?? ''),
              PopupMenuButton<String>(
                tooltip: 'Task actions',
                onSelected: (a) => _onTaskAction(a, t),
                itemBuilder: (_) => const [
                  PopupMenuItem(
                    value: 'update',
                    child: ListTile(
                      leading: Icon(Icons.sync_alt),
                      title: Text('Update status'),
                    ),
                  ),
                  PopupMenuItem(
                    value: 'edit',
                    child: ListTile(
                      leading: Icon(Icons.edit_outlined),
                      title: Text('Edit task'),
                    ),
                  ),
                  PopupMenuItem(
                    value: 'delete',
                    child: ListTile(
                      leading: Icon(
                        Icons.delete_outline,
                        color: AppColors.danger,
                      ),
                      title: Text(
                        'Delete',
                        style: TextStyle(color: AppColors.danger),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          Row(
            children: [
              CircleAvatar(
                radius: context.r(11),
                backgroundColor: AppColors.brand100,
                child: Text(
                  (name.isNotEmpty ? name[0] : '?').toUpperCase(),
                  style: TextStyle(
                    color: AppColors.brand700,
                    fontSize: context.sp(11),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              SizedBox(width: context.w(8)),
              Expanded(
                child: Text(
                  name,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.ink,
                    fontSize: context.sp(13),
                  ),
                ),
              ),
              _PriorityTag(t['priority']?.toString() ?? 'Medium'),
            ],
          ),
          SizedBox(height: context.h(8)),
          Row(
            children: [
              Icon(
                Icons.event_outlined,
                size: context.r(14),
                color: AppColors.inkFaint,
              ),
              SizedBox(width: context.w(4)),
              Text(
                '${_date(t['startDate'])}  →  ${_date(t['deadline'])}',
                style: muted,
              ),
            ],
          ),
          if (comment.isNotEmpty) ...[
            SizedBox(height: context.h(8)),
            Text(
              '“$comment”',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: muted.copyWith(fontStyle: FontStyle.italic),
            ),
          ],
          if (_hasProof(t)) ...[
            SizedBox(height: context.h(10)),
            _ProofButton(onTap: () => _openDoc(t['workProof'].toString())),
          ],
        ],
      ),
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
            EmptyStateView(
              icon: Icons.person_outline,
              title: 'No members in this team yet',
            ),
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
        actions: [
          if (!_loading && _error == null && _tabs.index == 0)
            IconButton(
              tooltip: 'Download task list PDF',
              onPressed: _openPdfSheet,
              icon: const Icon(Icons.picture_as_pdf_outlined),
            ),
        ],
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Tasks'),
            Tab(text: 'Members'),
            Tab(text: 'Attendance'),
          ],
        ),
      ),
      floatingActionButton: _loading || _error != null || _tabs.index != 0
          ? null
          : FloatingActionButton.extended(
              onPressed: _addTask,
              icon: const Icon(Icons.add),
              label: const Text('Add Task'),
            ),
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
                    children: [
                      _taskTab(),
                      _membersTab(),
                      TeamAttendanceTab(
                        teamId: widget.id,
                        teamName: widget.name,
                        members: ((_detail?['memberStats'] as List?) ?? [])
                            .map((m) => (m as Map)['member'])
                            .whereType<Map>()
                            .toList(),
                      ),
                    ],
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

class _StatusPill extends StatelessWidget {
  final String status;
  const _StatusPill(this.status);

  static Color colorFor(String s) => switch (s) {
    'Completed' => AppColors.accent600,
    'In Progress' => AppColors.warning,
    'Review' => const Color(0xFF7C3AED),
    'Overdue' => AppColors.danger,
    _ => AppColors.brand600,
  };

  @override
  Widget build(BuildContext context) {
    final c = colorFor(status);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: context.w(10),
        vertical: context.h(4),
      ),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: c,
          fontSize: context.sp(11),
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _PriorityTag extends StatelessWidget {
  final String priority;
  const _PriorityTag(this.priority);

  @override
  Widget build(BuildContext context) {
    final c = switch (priority) {
      'High' => AppColors.danger,
      'Low' => AppColors.accent600,
      _ => const Color(0xFFEA580C),
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.flag_rounded, size: context.r(14), color: c),
        SizedBox(width: context.w(3)),
        Text(
          priority,
          style: TextStyle(
            color: c,
            fontSize: context.sp(12),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

/// Prominent "employee sent a file" row so leads don't miss submissions.
class _ProofButton extends StatelessWidget {
  final VoidCallback onTap;
  const _ProofButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.accent50,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.w(12),
            vertical: context.h(10),
          ),
          child: Row(
            children: [
              Icon(
                Icons.description_outlined,
                size: context.r(18),
                color: AppColors.accent600,
              ),
              SizedBox(width: context.w(8)),
              Expanded(
                child: Text(
                  'Work proof submitted',
                  style: TextStyle(
                    color: AppColors.accent600,
                    fontWeight: FontWeight.w600,
                    fontSize: context.sp(13),
                  ),
                ),
              ),
              Text(
                'View',
                style: TextStyle(
                  color: AppColors.accent600,
                  fontWeight: FontWeight.w700,
                  fontSize: context.sp(13),
                ),
              ),
              Icon(
                Icons.chevron_right,
                size: context.r(18),
                color: AppColors.accent600,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SubmissionCard extends StatelessWidget {
  final String comment;
  final String proof;
  final Future<void> Function(String) onOpen;
  const _SubmissionCard({
    required this.comment,
    required this.proof,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    if (comment.isEmpty && proof.isEmpty) {
      return Container(
        width: double.infinity,
        padding: EdgeInsets.all(context.w(14)),
        decoration: BoxDecoration(
          color: AppColors.surfaceSubtle,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          'Nothing submitted yet.',
          style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13)),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (comment.isNotEmpty)
          Container(
            width: double.infinity,
            margin: EdgeInsets.only(bottom: context.h(8)),
            padding: EdgeInsets.all(context.w(14)),
            decoration: BoxDecoration(
              color: AppColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              comment,
              style: TextStyle(color: AppColors.ink, fontSize: context.sp(13)),
            ),
          ),
        if (proof.isNotEmpty) _ProofButton(onTap: () => onOpen(proof)),
      ],
    );
  }
}

class _EditTaskSheet extends StatefulWidget {
  final Map task;
  final TaskService service;
  const _EditTaskSheet({required this.task, required this.service});

  @override
  State<_EditTaskSheet> createState() => _EditTaskSheetState();
}

class _EditTaskSheetState extends State<_EditTaskSheet> {
  late final _title = TextEditingController(
    text: widget.task['title']?.toString() ?? '',
  );
  late final _desc = TextEditingController(
    text: widget.task['description']?.toString() ?? '',
  );
  late String _priority =
      const ['Low', 'Medium', 'High'].contains(widget.task['priority'])
      ? widget.task['priority'].toString()
      : 'Medium';
  late DateTime? _start = DateTime.tryParse(
    widget.task['startDate']?.toString() ?? '',
  )?.toLocal();
  late DateTime? _due = DateTime.tryParse(
    widget.task['deadline']?.toString() ?? '',
  )?.toLocal();
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
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
    );
    if (d != null) setState(() => start ? _start = d : _due = d);
  }

  Future<void> _submit() async {
    if (_title.text.trim().isEmpty) {
      setState(() => _err = 'Enter a task title');
      return;
    }
    if (_start != null && _due != null && _due!.isBefore(_start!)) {
      setState(() => _err = 'Due date must be on or after the start date');
      return;
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final f = DateFormat('yyyy-MM-dd');
      await widget.service.editTask(
        widget.task['_id'].toString(),
        title: _title.text.trim(),
        description: _desc.text.trim(),
        priority: _priority,
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
              'Edit Task',
              style: TextStyle(
                fontSize: context.sp(16),
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(12)),
            TextField(
              controller: _title,
              enabled: !_busy,
              decoration: const InputDecoration(labelText: 'Task title'),
            ),
            SizedBox(height: context.h(10)),
            TextField(
              controller: _desc,
              enabled: !_busy,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description / remark',
              ),
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
              onChanged: _busy
                  ? null
                  : (v) => setState(() => _priority = v ?? 'Medium'),
            ),
            SizedBox(height: context.h(10)),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _busy ? null : () => _pick(true),
                    child: Text(
                      _start == null ? 'Start date' : f.format(_start!),
                    ),
                  ),
                ),
                SizedBox(width: context.w(10)),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _busy ? null : () => _pick(false),
                    child: Text(_due == null ? 'Due date' : f.format(_due!)),
                  ),
                ),
              ],
            ),
            if (_err != null)
              Padding(
                padding: EdgeInsets.only(top: context.h(8)),
                child: Text(
                  _err!,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ),
            SizedBox(height: context.h(14)),
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
                    : const Text('Save Changes'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Mirrors the web "Name - Details" modal: employee info, task statistics,
/// and the employee's tasks (with work proof).
class _MemberSheet extends StatelessWidget {
  final Map stat;
  final List<Map> tasks;
  final String Function(dynamic) date;
  final Future<void> Function(String) openDoc;
  final void Function(Map task) onUpdate;
  const _MemberSheet({
    required this.stat,
    required this.tasks,
    required this.date,
    required this.openDoc,
    required this.onUpdate,
  });

  Widget _section(BuildContext context, String title) => Padding(
    padding: EdgeInsets.only(top: context.h(18), bottom: context.h(10)),
    child: Text(
      title,
      style: TextStyle(
        fontSize: context.sp(15),
        fontWeight: FontWeight.w700,
        color: AppColors.ink,
      ),
    ),
  );

  Widget _statTile(
    BuildContext context,
    String label,
    Object? value,
    Color color,
  ) => Container(
    padding: EdgeInsets.symmetric(vertical: context.h(12)),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.surfaceSubtle),
    ),
    child: Column(
      children: [
        Text(
          label,
          style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
        ),
        SizedBox(height: context.h(4)),
        Text(
          '${value ?? 0}',
          style: TextStyle(
            color: color,
            fontSize: context.sp(22),
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final member = stat['member'] as Map? ?? {};
    final user = member['userId'] as Map? ?? {};
    final name = user['name']?.toString() ?? 'Employee';
    final muted = TextStyle(
      color: AppColors.inkMuted,
      fontSize: context.sp(13),
    );
    final strong = TextStyle(
      color: AppColors.ink,
      fontSize: context.sp(13),
      fontWeight: FontWeight.w600,
    );

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (_, controller) => ListView(
        controller: controller,
        padding: EdgeInsets.fromLTRB(
          context.w(20),
          context.h(8),
          context.w(20),
          context.h(24),
        ),
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: context.r(22),
                backgroundColor: AppColors.brand100,
                child: Text(
                  (name.isNotEmpty ? name[0] : '?').toUpperCase(),
                  style: TextStyle(
                    color: AppColors.brand700,
                    fontWeight: FontWeight.w700,
                    fontSize: context.sp(16),
                  ),
                ),
              ),
              SizedBox(width: context.w(12)),
              Expanded(
                child: Text(
                  '$name - Details',
                  style: TextStyle(
                    fontSize: context.sp(17),
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Close',
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          _section(context, 'Employee Info'),
          Container(
            padding: EdgeInsets.all(context.w(14)),
            decoration: BoxDecoration(
              color: AppColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('ID', style: muted),
                    Text(
                      member['employeeId']?.toString() ?? '-',
                      style: strong,
                    ),
                  ],
                ),
                Divider(height: context.h(20)),
                Row(
                  children: [
                    Text('Email', style: muted),
                    SizedBox(width: context.w(12)),
                    Expanded(
                      child: Text(
                        user['email']?.toString() ?? '-',
                        style: strong,
                        textAlign: TextAlign.end,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          _section(context, 'Task Statistics'),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: context.h(10),
            crossAxisSpacing: context.w(10),
            childAspectRatio: 2.1,
            children: [
              _statTile(context, 'Total', stat['totalTasks'], AppColors.ink),
              _statTile(
                context,
                'Completed',
                stat['completed'],
                AppColors.accent600,
              ),
              _statTile(context, 'Pending', stat['pending'], AppColors.warning),
              _statTile(context, 'Overdue', stat['overdue'], AppColors.danger),
            ],
          ),
          _section(context, 'Employee Tasks'),
          if (tasks.isEmpty)
            Container(
              padding: EdgeInsets.all(context.w(16)),
              decoration: BoxDecoration(
                color: AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'No tasks assigned to this employee.',
                style: muted,
                textAlign: TextAlign.center,
              ),
            )
          else
            ...tasks.map((t) {
              final deleted = t['isDeleted'] == true;
              final proof = t['workProof']?.toString() ?? '';
              return Container(
                margin: EdgeInsets.only(bottom: context.h(10)),
                padding: EdgeInsets.all(context.w(14)),
                decoration: BoxDecoration(
                  color: deleted ? AppColors.dangerBg : AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.surfaceSubtle),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              children: [
                                TextSpan(text: t['title']?.toString() ?? ''),
                                if (deleted)
                                  const TextSpan(
                                    text: '  (Deleted)',
                                    style: TextStyle(
                                      color: AppColors.danger,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                              ],
                            ),
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: AppColors.ink,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: deleted ? null : () => onUpdate(t),
                          child: _StatusPill(t['status']?.toString() ?? ''),
                        ),
                      ],
                    ),
                    if ((t['description']?.toString() ?? '').isNotEmpty) ...[
                      SizedBox(height: context.h(4)),
                      Text(
                        t['description'].toString(),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: AppColors.inkMuted,
                          fontSize: context.sp(12),
                        ),
                      ),
                    ],
                    SizedBox(height: context.h(8)),
                    Row(
                      children: [
                        _PriorityTag(t['priority']?.toString() ?? 'Medium'),
                        const Spacer(),
                        Text(
                          '${date(t['startDate'])}  →  ${date(t['deadline'])}',
                          style: TextStyle(
                            color: AppColors.inkMuted,
                            fontSize: context.sp(12),
                          ),
                        ),
                      ],
                    ),
                    if (proof.isNotEmpty) ...[
                      SizedBox(height: context.h(10)),
                      _ProofButton(onTap: () => openDoc(proof)),
                    ],
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

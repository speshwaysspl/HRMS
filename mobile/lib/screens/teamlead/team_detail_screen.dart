import '../../services/app_events.dart';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_client.dart';
import '../../services/milestone_service.dart';
import '../../services/task_service.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/hrms_app_bar.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/star_rating.dart';
import '../../widgets/work_proof_field.dart' show ProofFile, proofsOf;
import '../../widgets/state_views.dart';
import 'milestones_tab.dart';
import 'team_attendance_tab.dart';

/// Team detail for team leads — mirrors web TeamDetail.jsx: a "Task List"
/// tab (add / update / view tasks) and a "Team Members" tab (per-member stats).
class TeamDetailScreen extends StatefulWidget {
  final String id;
  final String name;
  /// Opens this task's update sheet once loaded (from a notification).
  final String? openTaskId;
  const TeamDetailScreen({super.key, required this.id, required this.name, this.openTaskId});

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
  final _milestoneService = MilestoneService();
  late final TabController _tabs = TabController(length: 3, vsync: this);
  List<Map<String, dynamic>> _milestones = [];
  // Tasks live inside milestones: null shows the milestone list, 'none' the
  // unplanned tasks, otherwise that milestone's tasks.
  String? _milestoneFilter;
  bool get _inMilestone => _milestoneFilter != null && _tabs.index == 0;
  Map<String, dynamic>? _detail;
  bool _loading = true;
  Object? _error;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    AppEvents.teamChanged.addListener(_onTeamChanged);
    // Rebuild on tab change so Add Task only shows on the task list.
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging) setState(() {});
    });
    _load();
    _loadMilestones();
  }

  @override
  void dispose() {
    AppEvents.teamChanged.removeListener(_onTeamChanged);
    _tabs.dispose();
    super.dispose();
  }

  /// Server push: someone changed a team this screen shows.
  void _onTeamChanged() {
    final e = AppEvents.teamChanged.value;
    if (e == null || !mounted) return;
    if (e['kind'] == 'resync') {
      _load();
      _loadMilestones();
      return;
    }
    if (e['teamId'] != widget.id) return;
    if (e['kind'] != 'milestones') _load();
    if (e['kind'] == 'milestones' || e['kind'] == 'tasks') _loadMilestones();
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
      _openPendingTask();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  bool _pendingOpened = false;
  void _openPendingTask() {
    final id = widget.openTaskId;
    if (id == null || _pendingOpened) return;
    _pendingOpened = true;
    final task = _taskList.where((t) => t['_id'].toString() == id).firstOrNull;
    if (task == null) {
      _toast('That task is no longer available');
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _updateTask(task);
    });
  }

  Future<void> _loadMilestones() async {
    try {
      final list = await _milestoneService.list(widget.id);
      if (mounted) setState(() => _milestones = list);
    } catch (_) {
      // Milestones are optional; the task list still works without them.
    }
  }

  List<Map<String, dynamic>> get _openMilestones =>
      _milestones.where((m) => m['state'] != 'closed').toList();

  Map<String, dynamic>? _milestoneOf(dynamic id) {
    if (id == null) return null;
    for (final m in _milestones) {
      if (m['_id'].toString() == id.toString()) return m;
    }
    return null;
  }

  Future<void> _newMilestone() async {
    if (await showNewMilestoneSheet(context, widget.id)) {
      _toast('Milestone created');
      _loadMilestones();
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

  Future<void> _downloadPdf() async {
    final ms = _milestoneFilter;
    String ddmmyyyy(dynamic v) {
      final d = DateTime.tryParse(v?.toString() ?? '')?.toLocal();
      return d == null ? '-' : DateFormat('dd-MM-yyyy').format(d);
    }

    // This milestone's tasks, lowest rating first (unrated last).
    final tasks =
        _taskList.where((t) {
          final mid = t['milestoneId']?.toString();
          if (ms == null) return true;
          return ms == 'none' ? mid == null : mid == ms;
        }).toList()..sort(
          (a, b) => ((a['rating'] as num?) ?? 11).compareTo(
            (b['rating'] as num?) ?? 11,
          ),
        );
    final rows = tasks
        .map(
          (t) => [
            ((t['assignedTo'] as Map?)?['userId'] as Map?)?['name']
                    ?.toString() ??
                'Unassigned',
            t['status']?.toString() ?? '',
            ddmmyyyy(t['startDate']),
            ddmmyyyy(t['deadline']),
            (t['remark']?.toString().isNotEmpty ?? false)
                ? t['remark'].toString()
                : '-',
            t['rating'] == null ? '-' : '${t['rating']}/10',
          ],
        )
        .toList();
    // Heading "<Milestone> (28 Sep - 4 Oct 2026)"; file
    // "<Milestone>_28Sep-04Oct2026_<TeamLead>.pdf".
    final m = _milestoneOf(ms);
    final heading = m?['title']?.toString().trim() ?? 'Unplanned tasks';
    final lead =
        ((_detail?['team'] as Map?)?['leadId'] as Map?)?['name']?.toString() ??
        'N/A';
    final start = DateTime.tryParse(
      m?['startDate']?.toString() ?? '',
    )?.toLocal();
    final due = DateTime.tryParse(m?['dueDate']?.toString() ?? '')?.toLocal();
    final hasRange = start != null && due != null;
    final range = hasRange
        ? '${DateFormat('d MMM').format(start)} - ${DateFormat('d MMM yyyy').format(due)}'
        : '';
    String safe(String v) => v
        .trim()
        .replaceAll(RegExp(r'[^A-Za-z0-9]+'), '_')
        .replaceAll(RegExp(r'^_+|_+$'), '');
    final fileName = [
      safe(heading),
      if (hasRange)
        '${DateFormat('ddMMM').format(start)}-${DateFormat('ddMMMyyyy').format(due)}',
      safe(lead),
    ].where((p) => p.isNotEmpty).join('_');
    try {
      final doc = pw.Document();
      doc.addPage(
        pw.MultiPage(
          build: (_) => [
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  hasRange ? '$heading ($range)' : heading,
                  style: pw.TextStyle(
                    fontSize: 16,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.Text(
                  'Team Lead: $lead',
                  style: const pw.TextStyle(fontSize: 12),
                ),
              ],
            ),
            pw.SizedBox(height: 4),
            pw.Text(
              'Team: ${(_detail?['team'] as Map?)?['name']?.toString() ?? '-'}',
              style: const pw.TextStyle(fontSize: 12),
            ),
            pw.SizedBox(height: 10),
            pw.TableHelper.fromTextArray(
              headers: const [
                'Employee Name',
                'Status',
                'Start Date',
                'Due Date',
                'Remark',
                'Rating',
              ],
              data: rows,
              cellStyle: const pw.TextStyle(fontSize: 9),
            ),
          ],
        ),
      );
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/$fileName.pdf');
      await file.writeAsBytes(await doc.save());
      // Admin dashboard lists which teams generated their report.
      _service
          .logReport(
            widget.id,
            milestoneId: m?['_id']?.toString(),
            title: heading,
            taskCount: rows.length,
          )
          .catchError((_) {});
      await OpenFilex.open(file.path);
    } catch (e) {
      _toast('Could not create PDF: ${extractErrorMessage(e)}');
    }
  }

  String _assignee(Map t) =>
      ((t['assignedTo'] as Map?)?['userId'] as Map?)?['name']?.toString() ??
      'Unassigned';

  bool _hasProof(Map t) => proofsOf(t).isNotEmpty;

  Future<void> _openMember(Map stat) async {
    final member = stat['member'] as Map? ?? {};
    final memberTasks = _taskList
        .where((t) => (t['assignedTo'] as Map?)?['_id'] == member['_id'])
        .toList();
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _MemberSheet(
        stat: stat,
        tasks: memberTasks,
        milestones: _milestones,
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
        milestones: _openMilestones,
        teamName: widget.name,
        initialMilestoneId: _milestoneOf(_milestoneFilter)?['state'] == 'open'
            ? _milestoneFilter
            : null,
      ),
    );
    if (ok == true) {
      _toast('Task assigned');
      _load();
      _loadMilestones();
    }
  }

  Future<void> _updateTask(Map task) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _UpdateTaskSheet(
        task: task,
        statuses: _statuses,
        service: _tasks,
        onOpenProof: _openDoc,
      ),
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
      builder: (_) =>
          _EditTaskSheet(task: task, service: _tasks, milestones: _milestones),
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
    final description = task['description']?.toString() ?? '';
    final remark = task['remark']?.toString() ?? '';
    final rating = (task['rating'] as num?)?.toInt() ?? 0;
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
            _kv('Start date', _date(task['startDate'])),
            _kv('Due date', _date(task['deadline'])),
            _kv('Description', description.isEmpty ? '-' : description),
            _kv('Remark', remark.isEmpty ? '-' : remark),
            Padding(
              padding: EdgeInsets.only(bottom: context.h(10)),
              child: Row(
                children: [
                  SizedBox(
                    width: context.w(100),
                    child: Text(
                      'Rating',
                      style: TextStyle(
                        color: AppColors.inkMuted,
                        fontSize: context.sp(13),
                      ),
                    ),
                  ),
                  rating > 0
                      ? StarRating(value: rating, size: context.r(18))
                      : Text(
                          'Not rated yet',
                          style: TextStyle(
                            color: AppColors.ink,
                            fontSize: context.sp(13),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ],
              ),
            ),
            if ((task['reference'] ?? '').toString().isNotEmpty) ...[
              SizedBox(height: context.h(4)),
              Text(
                'Your reference',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppColors.ink,
                ),
              ),
              SizedBox(height: context.h(6)),
              OutlinedButton.icon(
                onPressed: () => _openDoc(task['reference'].toString()),
                icon: const Icon(Icons.attach_file),
                label: Text(
                  task['referenceName']?.toString() ?? 'Open reference',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              SizedBox(height: context.h(12)),
            ],
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
              proofs: proofsOf(task),
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

  Widget _taskTab() {
    final msFilter = _milestoneFilter;
    final all = _taskList.where((t) {
      if (msFilter == null) return true;
      final mid = t['milestoneId']?.toString();
      return msFilter == 'none' ? mid == null : mid == msFilter;
    }).toList();
    final tasks = _statusFilter == null
        ? all
        : all.where((t) => t['status'] == _statusFilter).toList();
    final msName = msFilter == null
        ? null
        : msFilter == 'none'
        ? 'No milestone'
        : (_milestoneOf(msFilter)?['title']?.toString() ?? 'Milestone');
    int count(String s) => all.where((t) => t['status'] == s).length;

    // Single status filter (menu) instead of a row of chips.
    final chips = Padding(
      padding: EdgeInsets.fromLTRB(
        context.w(16),
        context.h(4),
        context.w(8),
        context.h(4),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '${_statusFilter ?? 'All tasks'} · ${tasks.length}',
              style: TextStyle(
                color: AppColors.inkMuted,
                fontSize: context.sp(13),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          PopupMenuButton<String>(
            tooltip: 'Filter by status',
            initialValue: _statusFilter ?? '',
            onSelected: (v) =>
                setState(() => _statusFilter = v.isEmpty ? null : v),
            itemBuilder: (_) => [
              CheckedPopupMenuItem(
                value: '',
                checked: _statusFilter == null,
                child: Text('All (${all.length})'),
              ),
              for (final s in _statuses)
                CheckedPopupMenuItem(
                  value: s,
                  checked: _statusFilter == s,
                  child: Text('$s (${count(s)})'),
                ),
            ],
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: context.w(8),
                vertical: context.h(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _statusFilter == null
                        ? Icons.filter_list
                        : Icons.filter_list_alt,
                    size: context.r(20),
                    color: AppColors.brand600,
                  ),
                  SizedBox(width: context.w(4)),
                  Text(
                    'Filter',
                    style: TextStyle(
                      color: AppColors.brand600,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          TextButton.icon(
            onPressed: _downloadPdf,
            icon: Icon(Icons.picture_as_pdf_outlined, size: context.r(20)),
            label: const Text('PDF'),
          ),
        ],
      ),
    );

    return Column(
      children: [
        _milestoneHeader(msName),
        chips,
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              await Future.wait([_load(), _loadMilestones()]);
            },
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
                            ? 'Tap Add Task to plan this milestone\'s work.'
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

  Widget _milestoneHeader(String? name) {
    final m = _milestoneOf(_milestoneFilter);
    final muted = TextStyle(
      color: AppColors.inkMuted,
      fontSize: context.sp(12),
    );
    if (m == null) {
      return Padding(
        padding: EdgeInsets.fromLTRB(
          context.w(16),
          context.h(12),
          context.w(16),
          0,
        ),
        child: Text(
          'Tasks not in any milestone. Edit a task to move it into one.',
          style: muted,
        ),
      );
    }
    final progress = ((m['progress'] as num?) ?? 0).clamp(0, 100).toDouble();
    final due = DateTime.tryParse(m['dueDate']?.toString() ?? '');
    final closed = m['state'] == 'closed';
    Widget stat(String value, String label) => Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: context.sp(16),
              fontWeight: FontWeight.w700,
              color: AppColors.ink,
            ),
          ),
          Text(label, style: muted),
        ],
      ),
    );
    return Padding(
      padding: EdgeInsets.fromLTRB(
        context.w(16),
        context.h(12),
        context.w(16),
        0,
      ),
      child: SimpleCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.event_outlined,
                  size: context.r(16),
                  color: AppColors.inkMuted,
                ),
                SizedBox(width: context.w(6)),
                Expanded(
                  child: Text(
                    due != null
                        ? 'Due ${DateFormat('d MMM yyyy').format(due.toLocal())}'
                        : 'No due date',
                    style: muted,
                  ),
                ),
                if (closed)
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: context.w(8),
                      vertical: context.h(2),
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('Closed', style: muted),
                  ),
              ],
            ),
            SizedBox(height: context.h(12)),
            Row(
              children: [
                stat('${progress.round()}%', 'complete'),
                stat('${m['openTasks'] ?? 0}', 'open'),
                stat('${m['completedTasks'] ?? 0}', 'done'),
              ],
            ),
            SizedBox(height: context.h(10)),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: progress / 100,
                minHeight: context.h(6),
                color: AppColors.accent600,
                backgroundColor: AppColors.surfaceSubtle,
              ),
            ),
            if ((m['description'] ?? '').toString().isNotEmpty) ...[
              SizedBox(height: context.h(10)),
              Text(
                m['description'].toString(),
                style: muted.copyWith(fontSize: context.sp(13)),
              ),
            ],
          ],
        ),
      ),
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
          if (t['rating'] != null) ...[
            SizedBox(height: context.h(6)),
            StarRating(
              value: (t['rating'] as num).toInt(),
              size: context.r(16),
            ),
          ],
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
            _ProofButton(proofs: proofsOf(t), onOpen: _openDoc),
          ],
          if ((t['reference'] ?? '').toString().isNotEmpty) ...[
            SizedBox(height: context.h(4)),
            TextButton.icon(
              onPressed: () => _openDoc(t['reference'].toString()),
              icon: const Icon(Icons.attach_file, size: 18),
              label: const Text('Your reference'),
            ),
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
    return PopScope(
      canPop: _milestoneFilter == null || _tabs.index != 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _milestoneFilter = null);
      },
      child: Scaffold(
        // Inside a milestone the screen becomes a focused sub-page: its own title,
        // one back arrow (to the milestone list) and no team tabs.
        appBar: _inMilestone
            ? HrmsAppBar(
                leading: IconButton(
                  tooltip: 'All milestones',
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => setState(() => _milestoneFilter = null),
                ),
                title: Text(
                  _milestoneFilter == 'none'
                      ? 'No milestone'
                      : (_milestoneOf(_milestoneFilter)?['title']?.toString() ??
                            'Milestone'),
                  overflow: TextOverflow.ellipsis,
                ),
              )
            : HrmsAppBar(
                title: Text(widget.name),
                bottom: TabBar(
                  controller: _tabs,
                  indicatorColor: Colors.white,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white70,
                  tabs: const [
                    Tab(text: 'Milestones'),
                    Tab(text: 'Attendance'),
                    Tab(text: 'Members'),
                  ],
                ),
              ),
        floatingActionButton: _loading || _error != null || _tabs.index != 0
            ? null
            : _milestoneFilter == 'none'
            ? null
            : _milestoneFilter != null
            ? FloatingActionButton.extended(
                onPressed: _addTask,
                icon: const Icon(Icons.add),
                label: const Text('Add Task'),
              )
            : FloatingActionButton.extended(
                onPressed: _newMilestone,
                icon: const Icon(Icons.flag_outlined),
                label: const Text('New milestone'),
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
            : _inMilestone
            ? _taskTab()
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
                        MilestonesTab(
                          teamId: widget.id,
                          milestones: _milestones,
                          canManage: true,
                          unplannedCount: _taskList
                              .where((t) => t['milestoneId'] == null)
                              .length,
                          onChanged: _loadMilestones,
                          onViewTasks: (id) => setState(() {
                            _milestoneFilter = id;
                            _statusFilter = null;
                          }),
                        ),
                        TeamAttendanceTab(
                          teamId: widget.id,
                          teamName: widget.name,
                          members: ((_detail?['memberStats'] as List?) ?? [])
                              .map((m) => (m as Map)['member'])
                              .whereType<Map>()
                              .toList(),
                        ),
                        _membersTab(),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _AssignTaskSheet extends StatefulWidget {
  final String teamId;
  final List<Map> members;
  final TaskService service;
  final List<Map<String, dynamic>> milestones;
  final String? initialMilestoneId;
  const _AssignTaskSheet({
    required this.teamId,
    required this.members,
    required this.service,
    this.milestones = const [],
    this.initialMilestoneId,
    this.teamName,
  });
  final String? teamName;

  @override
  State<_AssignTaskSheet> createState() => _AssignTaskSheetState();
}

class _AssignTaskSheetState extends State<_AssignTaskSheet> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _selected = <String>{};
  DateTime? _start;
  DateTime? _due;
  late final String? _milestoneId = widget.initialMilestoneId;
  // The milestone this task joins; the server gives the task its week.
  late final Map<String, dynamic>? _milestone = widget.milestones
      .where((m) => m['_id'].toString() == _milestoneId)
      .firstOrNull;
  bool _busy = false;
  String? _err;
  String? _refPath;
  String? _refName;

  Future<void> _pickReference() async {
    final r = await FilePicker.platform.pickFiles();
    final f = r?.files.single;
    if (f?.path == null) return;
    setState(() {
      _refPath = f!.path;
      _refName = f.name;
    });
  }

  @override
  void initState() {
    super.initState();
    _start = DateTime.tryParse(
      _milestone?['startDate']?.toString() ?? '',
    )?.toLocal();
    _due = DateTime.tryParse(
      _milestone?['dueDate']?.toString() ?? '',
    )?.toLocal();
  }

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_title.text.trim().isEmpty) {
      setState(() => _err = 'Enter a task title');
      return;
    }
    if (_selected.isEmpty) {
      setState(() => _err = 'Pick at least one member to assign this task to.');
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
        assignedTo: _selected.toList(),
        startDate: _start == null ? null : f.format(_start!),
        deadline: _due == null ? null : f.format(_due!),
        milestoneId: _milestoneId,
        referencePath: _refPath,
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
              'Assign task',
              style: TextStyle(
                fontSize: context.sp(17),
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            if (widget.teamName != null)
              Text(
                widget.teamName!,
                style: TextStyle(
                  color: AppColors.inkMuted,
                  fontSize: context.sp(13),
                ),
              ),
            SizedBox(height: context.h(14)),
            TextField(
              controller: _title,
              autofocus: true,
              enabled: !_busy,
              decoration: const InputDecoration(
                labelText: 'Title',
                hintText: 'e.g. Build the login screen',
              ),
            ),
            SizedBox(height: context.h(10)),
            TextField(
              controller: _desc,
              enabled: !_busy,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                hintText:
                    'What needs to be done, and what does done look like?',
              ),
            ),
            SizedBox(height: context.h(16)),
            Row(
              children: [
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: 'Assign to',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppColors.ink,
                          ),
                        ),
                        TextSpan(
                          text:
                              ' · ${_selected.length} of ${widget.members.length}',
                          style: TextStyle(color: AppColors.inkMuted),
                        ),
                      ],
                    ),
                  ),
                ),
                if (widget.members.length > 1)
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => setState(() {
                            final all = widget.members
                                .map((m) => m['_id'].toString())
                                .toSet();
                            _err = null;
                            if (_selected.length == all.length) {
                              _selected.clear();
                            } else {
                              _selected.addAll(all);
                            }
                          }),
                    child: Text(
                      _selected.length == widget.members.length
                          ? 'Clear all'
                          : 'Select all',
                    ),
                  ),
              ],
            ),
            Wrap(
              spacing: context.w(8),
              runSpacing: context.h(8),
              children: widget.members.map((m) {
                final id = m['_id'].toString();
                final name =
                    (m['userId'] as Map?)?['name']?.toString() ?? 'Unknown';
                final on = _selected.contains(id);
                final parts = name
                    .trim()
                    .split(RegExp(r'\s+'))
                    .where((p) => p.isNotEmpty)
                    .toList();
                final initials = parts.isEmpty
                    ? '?'
                    : (parts.first[0] + (parts.length > 1 ? parts.last[0] : ''))
                          .toUpperCase();
                return FilterChip(
                  selected: on,
                  showCheckmark: false,
                  avatar: CircleAvatar(
                    backgroundColor: on
                        ? AppColors.accent600
                        : AppColors.surfaceSubtle,
                    child: on
                        ? const Icon(Icons.check, size: 14, color: Colors.white)
                        : Text(
                            initials,
                            style: TextStyle(
                              fontSize: context.sp(10),
                              fontWeight: FontWeight.w700,
                              color: AppColors.inkMuted,
                            ),
                          ),
                  ),
                  label: Text(
                    '$name  ${m['employeeId'] ?? ''}'.trim(),
                    overflow: TextOverflow.ellipsis,
                  ),
                  onSelected: _busy
                      ? null
                      : (v) => setState(() {
                          _err = null;
                          v ? _selected.add(id) : _selected.remove(id);
                        }),
                );
              }).toList(),
            ),
            // The task joins the open milestone and takes its week.
            if (_milestone != null) ...[
              SizedBox(height: context.h(12)),
              Row(
                children: [
                  Icon(
                    Icons.event_outlined,
                    size: context.r(16),
                    color: AppColors.inkMuted,
                  ),
                  SizedBox(width: context.w(6)),
                  Expanded(
                    child: Text(
                      'Adds to ${_milestone['title']}'
                      '${_start != null && _due != null ? ' · ${f.format(_start!)} – ${f.format(_due!)}' : ''}',
                      style: TextStyle(
                        color: AppColors.inkMuted,
                        fontSize: context.sp(13),
                      ),
                    ),
                  ),
                ],
              ),
            ],
            SizedBox(height: context.h(12)),
            Text(
              'Reference (optional)',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(6)),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _busy ? null : _pickReference,
                    icon: const Icon(Icons.attach_file),
                    label: Text(
                      _refName ?? 'Attach image or file showing what to do',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                if (_refPath != null)
                  IconButton(
                    tooltip: 'Remove reference',
                    onPressed: _busy
                        ? null
                        : () => setState(() {
                            _refPath = null;
                            _refName = null;
                          }),
                    icon: const Icon(Icons.close),
                  ),
              ],
            ),
            if (_err != null)
              Padding(
                padding: EdgeInsets.only(top: context.h(6)),
                child: Text(
                  _err!,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ),
            SizedBox(height: context.h(16)),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _busy ? null : () => Navigator.of(context).pop(),
                    child: const Text('Cancel'),
                  ),
                ),
                SizedBox(width: context.w(12)),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            _selected.length > 1
                                ? 'Assign to ${_selected.length} members'
                                : 'Assign task',
                          ),
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

class _UpdateTaskSheet extends StatefulWidget {
  final Map task;
  final List<String> statuses;
  final TaskService service;
  final void Function(String path)? onOpenProof;
  const _UpdateTaskSheet({
    required this.task,
    required this.statuses,
    required this.service,
    this.onOpenProof,
  });

  @override
  State<_UpdateTaskSheet> createState() => _UpdateTaskSheetState();
}

class _UpdateTaskSheetState extends State<_UpdateTaskSheet> {
  late String _status = widget.statuses.contains(widget.task['status'])
      ? widget.task['status'].toString()
      : widget.statuses.first;
  late final _remark = TextEditingController(
    text: widget.task['remark']?.toString() ?? '',
  );
  late int _rating = (widget.task['rating'] as num?)?.toInt() ?? 0;
  bool _busy = false;
  String? _err;

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
        rating: _rating,
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
          if (proofsOf(widget.task).isNotEmpty && widget.onOpenProof != null) ...[
            SizedBox(height: context.h(8)),
            _ProofButton(proofs: proofsOf(widget.task), onOpen: widget.onOpenProof!),
          ],
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
          Text(
            'Rating',
            style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink),
          ),
          StarRating(
            value: _rating,
            size: context.r(28),
            onChanged: _busy ? null : (v) => setState(() => _rating = v),
          ),
          SizedBox(height: context.h(6)),
          TextField(
            controller: _remark,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Remark'),
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
    final base = colorFor(status);
    // Lighten the text on dark backgrounds; the raw status colours are too dim there.
    final c = AppColors.isDark ? Color.lerp(base, Colors.white, 0.45)! : base;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: context.w(10),
        vertical: context.h(4),
      ),
      decoration: BoxDecoration(
        color: base.withValues(alpha: AppColors.isDark ? 0.28 : 0.12),
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

/// Prominent "employee sent a file" row so leads don't miss submissions.
class _ProofButton extends StatelessWidget {
  final List<ProofFile> proofs;
  final void Function(String path) onOpen;
  const _ProofButton({required this.proofs, required this.onOpen});

  // One file opens directly; several open a picker sheet.
  void _onTap(BuildContext context) {
    if (proofs.length == 1) return onOpen(proofs.first.url);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(context.w(16), 0, context.w(16), context.h(8)),
              child: Text('Work proof (${proofs.length} files)',
                  style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
            ),
            for (final p in proofs)
              ListTile(
                leading: Icon(
                  RegExp(r'\.pdf(\?|$)', caseSensitive: false).hasMatch(p.url)
                      ? Icons.picture_as_pdf_outlined
                      : RegExp(r'\.(png|jpe?g|gif|webp|heic)(\?|$)', caseSensitive: false).hasMatch(p.url)
                          ? Icons.image_outlined
                          : Icons.insert_drive_file_outlined,
                ),
                title: Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: const Icon(Icons.open_in_new, size: 18),
                onTap: () {
                  Navigator.pop(ctx);
                  onOpen(p.url);
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fg = AppColors.isDark ? AppColors.accent300 : AppColors.accent600;
    return Material(
      color: AppColors.accent50,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => _onTap(context),
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.w(12),
            vertical: context.h(10),
          ),
          child: Row(
            children: [
              Icon(Icons.description_outlined, size: context.r(18), color: fg),
              SizedBox(width: context.w(8)),
              Expanded(
                child: Text(
                  proofs.length > 1
                      ? 'Work proof submitted (${proofs.length} files)'
                      : 'Work proof submitted',
                  style: TextStyle(
                    color: fg,
                    fontWeight: FontWeight.w600,
                    fontSize: context.sp(13),
                  ),
                ),
              ),
              Text(
                'View',
                style: TextStyle(
                  color: fg,
                  fontWeight: FontWeight.w700,
                  fontSize: context.sp(13),
                ),
              ),
              Icon(Icons.chevron_right, size: context.r(18), color: fg),
            ],
          ),
        ),
      ),
    );
  }
}

class _SubmissionCard extends StatelessWidget {
  final String comment;
  final List<ProofFile> proofs;
  final Future<void> Function(String) onOpen;
  const _SubmissionCard({
    required this.comment,
    required this.proofs,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    if (comment.isEmpty && proofs.isEmpty) {
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
        if (proofs.isNotEmpty) _ProofButton(proofs: proofs, onOpen: onOpen),
      ],
    );
  }
}

class _EditTaskSheet extends StatefulWidget {
  final Map task;
  final TaskService service;
  final List<Map<String, dynamic>> milestones;
  const _EditTaskSheet({
    required this.task,
    required this.service,
    this.milestones = const [],
  });

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
  late DateTime? _start = DateTime.tryParse(
    widget.task['startDate']?.toString() ?? '',
  )?.toLocal();
  late DateTime? _due = DateTime.tryParse(
    widget.task['deadline']?.toString() ?? '',
  )?.toLocal();
  late String _milestoneId = widget.task['milestoneId']?.toString() ?? '';
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
        startDate: _start == null ? null : f.format(_start!),
        deadline: _due == null ? null : f.format(_due!),
        milestoneId: widget.milestones.isEmpty ? null : _milestoneId,
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
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            if (widget.milestones.isNotEmpty) ...[
              SizedBox(height: context.h(10)),
              DropdownButtonFormField<String>(
                initialValue: _milestoneId,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Milestone'),
                items: [
                  const DropdownMenuItem(
                    value: '',
                    child: Text('No milestone'),
                  ),
                  for (final m in widget.milestones.where(
                    (m) =>
                        m['state'] != 'closed' ||
                        m['_id'].toString() == _milestoneId,
                  ))
                    DropdownMenuItem(
                      value: m['_id'].toString(),
                      child: Text(
                        '${m['title']}${m['state'] == 'closed' ? ' (closed)' : ''}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: _busy
                    ? null
                    : (v) => setState(() => _milestoneId = v ?? ''),
              ),
            ],
            // Tasks in a milestone use its week, so dates only apply outside one.
            if (_milestoneId.isEmpty) ...[
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
            ],
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
  final List<Map<String, dynamic>> milestones;
  final String Function(dynamic) date;
  final Future<void> Function(String) openDoc;
  final void Function(Map task) onUpdate;
  const _MemberSheet({
    required this.stat,
    required this.tasks,
    this.milestones = const [],
    required this.date,
    required this.openDoc,
    required this.onUpdate,
  });

  /// The member's tasks grouped by milestone (milestone order, then tasks
  /// with no milestone). Empty groups are skipped.
  List<({String title, String? meta, List<Map> tasks})> _groups() {
    final out = <({String title, String? meta, List<Map> tasks})>[];
    final known = <String>{};
    for (final m in milestones) {
      final id = m['_id']?.toString();
      if (id == null) continue;
      known.add(id);
      final list = tasks
          .where((t) => t['milestoneId']?.toString() == id)
          .toList();
      if (list.isEmpty) continue;
      final done = list.where((t) => t['status'] == 'Completed').length;
      out.add((
        title: m['title']?.toString() ?? 'Milestone',
        meta:
            '$done of ${list.length} done${m['state'] == 'closed' ? ' · Closed' : ''}',
        tasks: list,
      ));
    }
    final rest = tasks
        .where((t) => !known.contains(t['milestoneId']?.toString()))
        .toList();
    if (rest.isNotEmpty) {
      out.add((title: 'No milestone', meta: null, tasks: rest));
    }
    return out;
  }

  Widget _groupHeader(BuildContext context, String title, String? meta) =>
      Padding(
        padding: EdgeInsets.only(top: context.h(6), bottom: context.h(8)),
        child: Row(
          children: [
            Icon(
              Icons.flag_outlined,
              size: context.r(18),
              color: AppColors.brand500,
            ),
            SizedBox(width: context.w(8)),
            Expanded(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppColors.ink,
                  fontSize: context.sp(14),
                ),
              ),
            ),
            if (meta != null)
              Text(
                meta,
                style: TextStyle(
                  color: AppColors.inkMuted,
                  fontSize: context.sp(12),
                ),
              ),
          ],
        ),
      );

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
            // Status colours are too dim on the dark surface; lighten them there.
            color: AppColors.isDark
                ? Color.lerp(color, Colors.white, 0.4)
                : color,
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
            for (final g in _groups())
              _CollapsibleGroup(
                header: _groupHeader(context, g.title, g.meta),
                children: g.tasks.map((t) {
                  final deleted = t['isDeleted'] == true;
                  final proofs = proofsOf(t);
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
                                    TextSpan(
                                      text: t['title']?.toString() ?? '',
                                    ),
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
                        if ((t['description']?.toString() ?? '')
                            .isNotEmpty) ...[
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
                            Text(
                              '${date(t['startDate'])}  →  ${date(t['deadline'])}',
                              style: TextStyle(
                                color: AppColors.inkMuted,
                                fontSize: context.sp(12),
                              ),
                            ),
                          ],
                        ),
                        if (proofs.isNotEmpty) ...[
                          SizedBox(height: context.h(10)),
                          _ProofButton(proofs: proofs, onOpen: openDoc),
                        ],
                      ],
                    ),
                  );
                }).toList(),
              ),
        ],
      ),
    );
  }
}

/// A milestone group that starts collapsed; tapping the header shows its tasks.
class _CollapsibleGroup extends StatefulWidget {
  const _CollapsibleGroup({required this.header, required this.children});
  final Widget header;
  final List<Widget> children;

  @override
  State<_CollapsibleGroup> createState() => _CollapsibleGroupState();
}

class _CollapsibleGroupState extends State<_CollapsibleGroup> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          button: true,
          expanded: _open,
          child: InkWell(
            onTap: () => setState(() => _open = !_open),
            borderRadius: BorderRadius.circular(10),
            child: Row(
              children: [
                AnimatedRotation(
                  turns: _open ? 0.25 : 0,
                  duration: MediaQuery.of(context).disableAnimations
                      ? Duration.zero
                      : const Duration(milliseconds: 200),
                  child: Icon(Icons.chevron_right, color: AppColors.inkMuted),
                ),
                SizedBox(width: context.w(4)),
                Expanded(child: widget.header),
              ],
            ),
          ),
        ),
        if (_open) ...widget.children,
        SizedBox(height: context.h(8)),
      ],
    );
  }
}

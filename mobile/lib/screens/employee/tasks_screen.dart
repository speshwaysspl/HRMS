import '../../services/app_events.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../main.dart';
import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/hrms_app_bar.dart';
import '../../widgets/work_proof_field.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  /// Milestones start collapsed; tapping one shows its tasks.
  final Set<String> _openGroups = {};
  String _groupKey(Map? m) => m?['_id']?.toString() ?? 'none';

  final _service = TaskService();
  List<Map<String, dynamic>> _tasks = [];
  bool _loading = true;
  String? _error;
  Object? _lastError;

  @override
  void initState() {
    super.initState();
    AppEvents.teamChanged.addListener(_onTeamChanged);
    final cache = AppCaches.of(context).tasksList;
    if (cache.hasData) {
      _tasks = cache.data!;
      _loading = false;
      _load(silent: true);
    } else {
      _load();
    }
  }

  /// Server push: someone changed a team this screen shows.
  void _onTeamChanged() {
    final e = AppEvents.teamChanged.value;
    if (e == null || !mounted) return;
    if (e['kind'] == 'tasks') _load(silent: true);
  }

  @override
  void dispose() {
    AppEvents.teamChanged.removeListener(_onTeamChanged);
    super.dispose();
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
                      children: [
                        for (final g in _groups()) ...[
                          _groupHeader(g),
                          if (_openGroups.contains(_groupKey(g.milestone)))
                            ...g.tasks.map(_taskCard),
                          SizedBox(height: context.h(12)),
                        ],
                      ],
                    ),
            ),
    );
  }

  /// Tasks grouped under their milestone: open milestones by due date, then
  /// closed ones, then tasks outside any milestone.
  List<({Map? milestone, List<Map<String, dynamic>> tasks})> _groups() {
    final byKey =
        <String, ({Map? milestone, List<Map<String, dynamic>> tasks})>{};
    for (final t in _tasks) {
      final m = t['milestoneId'] is Map ? t['milestoneId'] as Map : null;
      final key = m?['_id']?.toString() ?? 'none';
      byKey.putIfAbsent(
        key,
        () => (milestone: m, tasks: <Map<String, dynamic>>[]),
      );
      byKey[key]!.tasks.add(t);
    }
    int rank(Map? m) => m == null ? 2 : (m['state'] == 'closed' ? 1 : 0);
    DateTime due(Map? m) =>
        DateTime.tryParse(m?['dueDate']?.toString() ?? '') ?? DateTime(9999);
    return byKey.values.toList()..sort((a, b) {
      final r = rank(a.milestone).compareTo(rank(b.milestone));
      return r != 0 ? r : due(a.milestone).compareTo(due(b.milestone));
    });
  }

  Widget _groupHeader(({Map? milestone, List<Map<String, dynamic>> tasks}) g) {
    final m = g.milestone;
    final done = g.tasks.where((t) => t['status'] == 'Completed').length;
    String dueText = '';
    final d = DateTime.tryParse(m?['dueDate']?.toString() ?? '');
    if (d != null) {
      dueText = 'Due ${DateFormat('d MMM').format(d.toLocal())} · ';
    }
    final key = _groupKey(m);
    final open = _openGroups.contains(key);
    return Semantics(
      button: true,
      expanded: open,
      child: InkWell(
        onTap: () => setState(
          () => open ? _openGroups.remove(key) : _openGroups.add(key),
        ),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            context.w(4),
            context.h(8),
            context.w(4),
            context.h(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  AnimatedRotation(
                    turns: open ? 0.25 : 0,
                    duration: MediaQuery.of(context).disableAnimations
                        ? Duration.zero
                        : const Duration(milliseconds: 200),
                    child: Icon(
                      Icons.chevron_right,
                      color: AppColors.inkMuted,
                      size: context.r(22),
                    ),
                  ),
                  SizedBox(width: context.w(4)),
                  if (m != null) ...[
                    Icon(
                      Icons.flag_outlined,
                      size: context.r(18),
                      color: AppColors.accent700,
                    ),
                    SizedBox(width: context.w(6)),
                  ],
                  Expanded(
                    child: Text(
                      m?['title']?.toString() ?? 'Other tasks',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: context.sp(15),
                        color: AppColors.ink,
                      ),
                    ),
                  ),
                  if (m?['state'] == 'closed')
                    Text(
                      'Closed',
                      style: TextStyle(
                        color: AppColors.inkMuted,
                        fontSize: context.sp(12),
                      ),
                    ),
                ],
              ),
              SizedBox(height: context.h(2)),
              Text(
                '$dueText$done of ${g.tasks.length} done',
                style: TextStyle(
                  color: AppColors.inkMuted,
                  fontSize: context.sp(12),
                ),
              ),
              if ((m?['description'] ?? '').toString().isNotEmpty)
                Padding(
                  padding: EdgeInsets.only(top: context.h(2)),
                  child: Text(
                    m!['description'].toString(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColors.inkMuted,
                      fontSize: context.sp(12),
                    ),
                  ),
                ),
              if (m != null && g.tasks.isNotEmpty) ...[
                SizedBox(height: context.h(6)),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: done / g.tasks.length,
                    minHeight: 5,
                    backgroundColor: AppColors.surfaceSubtle,
                    color: AppColors.accent600,
                  ),
                ),
              ],
            ],
          ),
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
  bool _saving = false;
  String? _filePath;
  bool _removeSaved = false; // saved proof marked for removal on submit

  String _fmt(dynamic v) {
    try {
      return DateFormat('d MMM, yyyy').format(DateTime.parse(v.toString()));
    } catch (_) {
      return '-';
    }
  }

  // Employees can't edit tasks; they tell the team lead the work is done (moves
  // it to Review), optionally with work proof, and can resubmit until Completed.
  Future<void> _markDone() async {
    setState(() => _saving = true);
    try {
      await widget.service.updateStatus(
        widget.task['_id'].toString(),
        'Review',
        filePath: _filePath,
        removeWorkProof: _removeSaved,
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

  Widget _note(IconData icon, String text, Color color) => Row(
    children: [
      Icon(icon, color: color, size: context.r(20)),
      SizedBox(width: context.w(10)),
      Expanded(
        child: Text(
          text,
          style: TextStyle(color: AppColors.ink, fontSize: context.sp(14)),
        ),
      ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final t = widget.task;
    final status = t['status']?.toString() ?? 'Assigned';
    final assignedBy = t['assignedBy'] is Map
        ? (t['assignedBy']['name']?.toString() ?? '-')
        : '-';
    final savedUrl = (t['workProof'] ?? '').toString();
    final savedName = (t['workProofName'] ?? '').toString().isNotEmpty
        ? t['workProofName'].toString()
        : savedUrl.split('/').last;

    final Widget action;
    if (status == 'Completed') {
      action = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _note(
            Icons.check_circle_rounded,
            'Your team lead marked this task completed.',
            AppColors.accent700,
          ),
          if (savedUrl.isNotEmpty) ...[
            SizedBox(height: context.h(14)),
            Text(
              'Your work proof',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: context.h(8)),
            WorkProofField(
              existingUrl: savedUrl,
              existingName: savedName,
              pickedPath: null,
              removed: false,
              editable: false,
              onPicked: (_) {},
              onRemovedChanged: (_) {},
            ),
          ],
        ],
      );
    } else {
      final inReview = status == 'Review';
      action = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (inReview) ...[
            _note(
              Icons.hourglass_top_rounded,
              'Sent to your team lead for review. You can resubmit with new proof.',
              AppColors.brand500,
            ),
            SizedBox(height: context.h(14)),
          ],
          Text(
            'Work proof (optional)',
            style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink),
          ),
          SizedBox(height: context.h(8)),
          WorkProofField(
            existingUrl: savedUrl.isEmpty ? null : savedUrl,
            existingName: savedName,
            pickedPath: _filePath,
            removed: _removeSaved,
            enabled: !_saving,
            onPicked: (path) => setState(() => _filePath = path),
            onRemovedChanged: (v) => setState(() => _removeSaved = v),
          ),
          SizedBox(height: context.h(16)),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _saving ? null : _markDone,
              icon: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.task_alt_rounded),
              label: Text(
                inReview ? 'Resubmit for review' : "I've completed this task",
              ),
            ),
          ),
        ],
      );
    }

    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.all(context.w(20)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    t['title']?.toString() ?? 'Untitled',
                    style: TextStyle(
                      fontSize: context.sp(18),
                      fontWeight: FontWeight.w700,
                      color: AppColors.ink,
                    ),
                  ),
                ),
                SizedBox(width: context.w(8)),
                StatusPill(label: status),
              ],
            ),
            SizedBox(height: context.h(12)),
            if ((t['description'] ?? '').toString().isNotEmpty)
              _detail('Description', t['description'].toString()),
            _detail('Start Date', _fmt(t['startDate'])),
            _detail('Deadline', _fmt(t['deadline'])),
            _detail('Assigned By', assignedBy),
            if ((t['reference'] ?? '').toString().isNotEmpty) ...[
              SizedBox(height: context.h(10)),
              _ReferenceView(
                url: t['reference'].toString(),
                name: t['referenceName']?.toString(),
              ),
            ],
            const Divider(height: 28),
            action,
            if (status != 'Completed' && status != 'Review') ...[
              SizedBox(height: context.h(8)),
              Text(
                'Your team lead will review it and mark it completed.',
                style: TextStyle(
                  color: AppColors.inkMuted,
                  fontSize: context.sp(12),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// The team lead's optional "what to do" attachment: an image preview or a
/// file button; tapping opens it full size.
class _ReferenceView extends StatelessWidget {
  const _ReferenceView({required this.url, this.name});
  final String url;
  final String? name;

  static final _image = RegExp(
    r'\.(png|jpe?g|gif|webp|bmp)(\?|$)',
    caseSensitive: false,
  );

  String get _abs {
    if (url.startsWith('http')) return url;
    final base = ApiClient.instance.dio.options.baseUrl.replaceAll(
      RegExp(r'/$'),
      '',
    );
    return '$base/${url.startsWith('/') ? url.substring(1) : url}';
  }

  Future<void> _open() =>
      launchUrl(Uri.parse(_abs), mode: LaunchMode.externalApplication);

  @override
  Widget build(BuildContext context) {
    final isImage = _image.hasMatch(url) || _image.hasMatch(name ?? '');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Reference from your team lead',
          style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink),
        ),
        SizedBox(height: context.h(6)),
        if (isImage)
          Semantics(
            button: true,
            label: 'Open reference image',
            child: InkWell(
              onTap: _open,
              borderRadius: BorderRadius.circular(10),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  _abs,
                  height: context.h(180),
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    height: context.h(60),
                    alignment: Alignment.center,
                    color: AppColors.surfaceSubtle,
                    child: Text(
                      'Tap to open',
                      style: TextStyle(color: AppColors.inkMuted),
                    ),
                  ),
                ),
              ),
            ),
          )
        else
          OutlinedButton.icon(
            onPressed: _open,
            icon: const Icon(Icons.description_outlined),
            label: Text(
              name ?? 'Open attachment',
              overflow: TextOverflow.ellipsis,
            ),
          ),
      ],
    );
  }
}

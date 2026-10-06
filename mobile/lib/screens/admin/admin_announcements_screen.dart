import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/announcement_service.dart';
import '../../services/api_client.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/hrms_app_bar.dart';

import '../../services/live_refresh.dart';
class AdminAnnouncementsScreen extends StatefulWidget {
  const AdminAnnouncementsScreen({super.key});

  @override
  State<AdminAnnouncementsScreen> createState() =>
      _AdminAnnouncementsScreenState();
}

class _AdminAnnouncementsScreenState extends State<AdminAnnouncementsScreen> with LiveRefresh<AdminAnnouncementsScreen> {
  @override
  List<String> get liveResources => const ['announcement'];

  @override
  void onLiveRefresh() => _load();

  final _service = AnnouncementService();
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  Object? _error;

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
      final data = await _service.getAnnouncements();
      if (!mounted) return;
      setState(() {
        _items = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  Future<void> _openComposer([Map<String, dynamic>? existing]) async {
    final posted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ComposeSheet(service: _service, existing: existing),
    );
    if (posted == true) _load();
  }

  Future<void> _delete(Map<String, dynamic> a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete announcement?'),
        content: Text('“${a['title']}” will be removed for everyone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Delete',
              style: TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _service.deleteAnnouncement(a['_id'].toString());
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    }
  }

  Future<void> _deleteAll() async {
    final n = _items.length;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Delete all $n announcements?'),
        content: const Text(
          "They will be removed for everyone. This can't be undone.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Delete all',
              style: TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final skipped = await _service.deleteAnnouncements(
        _items.map((a) => a['_id'].toString()).toList(),
      );
      if (mounted && skipped > 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '$skipped posted by someone else ${skipped == 1 ? 'was' : 'were'} kept.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    }
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: HrmsAppBar(
        title: const Text('Announcements'),
        actions: [
          if (!_loading && _items.isNotEmpty)
            IconButton(
              tooltip: 'Delete all',
              icon: const Icon(Icons.delete_sweep_outlined),
              onPressed: _deleteAll,
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openComposer,
        icon: const Icon(Icons.add),
        label: const Text('Post'),
      ),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: const [
                SkeletonListTile(),
                SkeletonListTile(),
                SkeletonListTile(),
              ],
            )
          : _error != null
          ? buildErrorState(_error!, _load)
          : RefreshIndicator(
              onRefresh: _load,
              child: _items.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 100),
                        EmptyStateView(
                          icon: Icons.campaign_outlined,
                          title: 'No announcements yet',
                          subtitle: 'Posted announcements will show up here.',
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: EdgeInsets.all(context.w(16)),
                      itemCount: _items.length,
                      itemBuilder: (context, i) {
                        final a = _items[i];
                        final scheduled = a['published'] == false;
                        String date = '';
                        try {
                          date = scheduled
                              ? 'Scheduled · ${DateFormat('d MMM yyyy, h:mm a').format(DateTime.parse(a['scheduledAt'].toString()).toLocal())}'
                              : DateFormat('d MMM, yyyy').format(
                                  DateTime.parse(
                                    (a['publishedAt'] ?? a['createdAt'])
                                        .toString(),
                                  ).toLocal(),
                                );
                        } catch (_) {}
                        return SimpleCard(
                          onTap: () => _openComposer(a),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      a['title']?.toString() ?? '',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.ink,
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.delete_outline,
                                      color: AppColors.danger,
                                    ),
                                    onPressed: () => _delete(a),
                                  ),
                                ],
                              ),
                              SizedBox(height: context.h(4)),
                              Text(
                                a['description']?.toString() ?? '',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: AppColors.inkMuted,
                                  fontSize: context.sp(13),
                                ),
                              ),
                              SizedBox(height: context.h(6)),
                              Text(
                                date,
                                style: TextStyle(
                                  color: scheduled
                                      ? AppColors.warning
                                      : AppColors.inkFaint,
                                  fontSize: context.sp(11),
                                  fontWeight: scheduled
                                      ? FontWeight.w600
                                      : FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

class _ComposeSheet extends StatefulWidget {
  final AnnouncementService service;
  final Map<String, dynamic>? existing;
  const _ComposeSheet({required this.service, this.existing});

  @override
  State<_ComposeSheet> createState() => _ComposeSheetState();
}

class _ComposeSheetState extends State<_ComposeSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _bodyController;
  bool _submitting = false;
  DateTime? _scheduledAt; // null = send now

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(
      text: widget.existing?['title']?.toString() ?? '',
    );
    _bodyController = TextEditingController(
      text: widget.existing?['description']?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      if (_isEdit) {
        await widget.service.updateAnnouncement(
          widget.existing!['_id'].toString(),
          title: _titleController.text.trim(),
          description: _bodyController.text.trim(),
        );
      } else {
        if (_scheduledAt != null && !_scheduledAt!.isAfter(DateTime.now())) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Scheduled time must be in the future'),
            ),
          );
          return;
        }
        await widget.service.createAnnouncement(
          title: _titleController.text.trim(),
          description: _bodyController.text.trim(),
          scheduledAt: _scheduledAt,
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _pickSchedule() async {
    final now = DateTime.now();
    final base = _scheduledAt ?? now.add(const Duration(hours: 1));
    final date = await showDatePicker(
      context: context,
      initialDate: base,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 365)),
      helpText: 'Send on',
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(base),
      helpText: 'Send at',
    );
    if (time == null) return;
    setState(
      () => _scheduledAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: EdgeInsets.all(context.w(20)),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppRadius.panel),
          ),
        ),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _isEdit ? 'Edit Announcement' : 'New Announcement',
                  style: TextStyle(
                    fontSize: context.sp(17),
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                  ),
                ),
                SizedBox(height: context.h(16)),
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(labelText: 'Title'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                SizedBox(height: context.h(14)),
                TextFormField(
                  controller: _bodyController,
                  maxLines: 5,
                  decoration: const InputDecoration(labelText: 'Message'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                if (!_isEdit) ...[
                  SizedBox(height: context.h(14)),
                  Text(
                    'When to send',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                  ),
                  SizedBox(height: context.h(8)),
                  SegmentedButton<bool>(
                    segments: const [
                      ButtonSegment(
                        value: false,
                        label: Text('Send now'),
                        icon: Icon(Icons.send_outlined),
                      ),
                      ButtonSegment(
                        value: true,
                        label: Text('Schedule'),
                        icon: Icon(Icons.schedule),
                      ),
                    ],
                    selected: {_scheduledAt != null},
                    onSelectionChanged: _submitting
                        ? null
                        : (v) {
                            if (v.first) {
                              _pickSchedule();
                            } else {
                              setState(() => _scheduledAt = null);
                            }
                          },
                  ),
                  if (_scheduledAt != null) ...[
                    SizedBox(height: context.h(8)),
                    OutlinedButton.icon(
                      onPressed: _submitting ? null : _pickSchedule,
                      icon: const Icon(Icons.event),
                      label: Text(
                        DateFormat(
                          'EEE, d MMM yyyy · h:mm a',
                        ).format(_scheduledAt!),
                      ),
                    ),
                    SizedBox(height: context.h(4)),
                    Text(
                      'Employees see it and get notified at this time.',
                      style: TextStyle(
                        color: AppColors.inkMuted,
                        fontSize: context.sp(12),
                      ),
                    ),
                  ],
                ],
                SizedBox(height: context.h(18)),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          _isEdit
                              ? 'Save changes'
                              : _scheduledAt != null
                              ? 'Schedule for everyone'
                              : 'Post to everyone',
                        ),
                ),
                SizedBox(height: context.h(8)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

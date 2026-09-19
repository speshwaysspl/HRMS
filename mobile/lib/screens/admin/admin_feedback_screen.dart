import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../services/feedback_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';

const _statuses = ['Pending', 'In Review', 'Resolved', 'Closed'];

class AdminFeedbackScreen extends StatefulWidget {
  const AdminFeedbackScreen({super.key});

  @override
  State<AdminFeedbackScreen> createState() => _AdminFeedbackScreenState();
}

class _AdminFeedbackScreenState extends State<AdminFeedbackScreen> {
  final _service = FeedbackService();
  List<Map<String, dynamic>> _all = [];
  bool _loading = true;
  String? _error;
  String _filter = 'All';

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
      final data = await _service.getAllFeedback();
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

  List<Map<String, dynamic>> get _visible {
    if (_filter == 'All') return _all;
    return _all.where((f) => (f['status'] ?? 'Pending').toString() == _filter).toList();
  }

  Future<void> _respond(Map<String, dynamic> f) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RespondSheet(service: _service, feedback: f),
    );
    if (done == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Feedback')),
      body: Column(
        children: [
          SizedBox(
            height: context.h(52),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: context.w(12), vertical: context.h(8)),
              children: ['All', ..._statuses].map((s) {
                return Padding(
                  padding: EdgeInsets.only(right: context.w(8)),
                  child: ChoiceChip(
                    label: Text(s),
                    selected: s == _filter,
                    onSelected: (_) => setState(() => _filter = s),
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
                                CenteredMessage(icon: Icons.chat_bubble_outline, message: 'No $_filter feedback.'),
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

  Widget _card(Map<String, dynamic> f) {
    final response = f['adminResponse'] as Map?;
    final anon = f['isAnonymous'] == true;
    final submitter = anon ? 'Anonymous' : ((f['userId'] as Map?)?['name']?.toString() ?? 'Employee');
    return SimpleCard(
      onTap: () => _respond(f),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(f['title']?.toString() ?? '',
                    style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
              ),
              SizedBox(width: context.w(8)),
              StatusPill(label: f['status']?.toString() ?? 'Pending'),
            ],
          ),
          SizedBox(height: context.h(4)),
          Text('$submitter · ${f['category'] ?? ''}',
              style: TextStyle(color: AppColors.inkFaint, fontSize: context.sp(11))),
          SizedBox(height: context.h(6)),
          Text(f['description']?.toString() ?? '',
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
          if (response != null && response['message'] != null) ...[
            SizedBox(height: context.h(8)),
            Container(
              padding: EdgeInsets.all(context.w(10)),
              decoration: BoxDecoration(color: AppColors.surfaceMuted, borderRadius: BorderRadius.circular(8)),
              child: Text('Response: ${response['message']}',
                  style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted)),
            ),
          ],
        ],
      ),
    );
  }
}

class _RespondSheet extends StatefulWidget {
  final FeedbackService service;
  final Map<String, dynamic> feedback;
  const _RespondSheet({required this.service, required this.feedback});

  @override
  State<_RespondSheet> createState() => _RespondSheetState();
}

class _RespondSheetState extends State<_RespondSheet> {
  late String _status;
  final _response = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _status = widget.feedback['status']?.toString() ?? 'Pending';
    final existing = (widget.feedback['adminResponse'] as Map?)?['message']?.toString();
    if (existing != null) _response.text = existing;
  }

  @override
  void dispose() {
    _response.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await widget.service.respond(
        widget.feedback['_id'].toString(),
        status: _status,
        adminResponse: _response.text.trim(),
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final f = widget.feedback;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: EdgeInsets.all(context.w(20)),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(f['title']?.toString() ?? 'Feedback',
                  style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
              SizedBox(height: context.h(6)),
              Text(f['description']?.toString() ?? '',
                  style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13), height: 1.4)),
              SizedBox(height: context.h(16)),
              DropdownButtonFormField<String>(
                initialValue: _statuses.contains(_status) ? _status : 'Pending',
                decoration: const InputDecoration(labelText: 'Status'),
                items: _statuses.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                onChanged: (v) => setState(() => _status = v ?? _status),
              ),
              SizedBox(height: context.h(14)),
              TextField(
                controller: _response,
                maxLines: 4,
                decoration: const InputDecoration(labelText: 'Response to employee'),
              ),
              SizedBox(height: context.h(18)),
              ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Save'),
              ),
              SizedBox(height: context.h(8)),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../services/feedback_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/status_pill.dart';

const _categories = [
  'General', 'Work Environment', 'Management', 'Benefits', 'Training', 'Technology', 'Suggestion', 'Complaint', 'Other'
];

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  final _service = FeedbackService();
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String? _error;
  Object? _lastError;

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
      final data = await _service.getMyFeedback();
      if (!mounted) return;
      setState(() {
        _items = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = extractErrorMessage(e);
        _lastError = e;
        _loading = false;
      });
    }
  }

  Future<void> _openSubmitSheet() async {
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SubmitFeedbackSheet(service: _service),
    );
    if (submitted == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Feedback')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openSubmitSheet,
        icon: const Icon(Icons.add),
        label: const Text('Submit'),
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
              ? buildErrorState(_lastError ?? _error!, _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          EmptyStateView(icon: Icons.chat_bubble_outline, title: 'No feedback submitted yet', subtitle: 'Share your thoughts with HR using the Submit button.'),
                        ])
                      : ListView(
                          padding: EdgeInsets.all(context.w(16)),
                          children: _items.map((f) {
                            final response = f['adminResponse'] as Map?;
                            return SimpleCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(child: Text(f['title']?.toString() ?? '', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink))),
                                      SizedBox(width: context.w(8)),
                                      StatusPill(label: f['status']?.toString() ?? 'Pending'),
                                    ],
                                  ),
                                  SizedBox(height: context.h(4)),
                                  Text(f['category']?.toString() ?? '', style: TextStyle(color: AppColors.inkFaint, fontSize: context.sp(11))),
                                  SizedBox(height: context.h(6)),
                                  Text(f['description']?.toString() ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
                                  if (response != null && response['message'] != null) ...[
                                    SizedBox(height: context.h(8)),
                                    Container(
                                      padding: EdgeInsets.all(context.w(10)),
                                      decoration: BoxDecoration(color: AppColors.surfaceMuted, borderRadius: BorderRadius.circular(8)),
                                      child: Text('HR: ${response['message']}', style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted)),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                ),
    );
  }
}

class _SubmitFeedbackSheet extends StatefulWidget {
  final FeedbackService service;
  const _SubmitFeedbackSheet({required this.service});

  @override
  State<_SubmitFeedbackSheet> createState() => _SubmitFeedbackSheetState();
}

class _SubmitFeedbackSheetState extends State<_SubmitFeedbackSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  String _category = _categories.first;
  bool _anonymous = false;
  bool _submitting = false;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await widget.service.submit(
        title: _titleController.text.trim(),
        category: _category,
        description: _descController.text.trim(),
        isAnonymous: _anonymous,
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: EdgeInsets.all(context.w(20)),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
        ),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Submit Feedback', style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
                SizedBox(height: context.h(16)),
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(labelText: 'Title'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                SizedBox(height: context.h(14)),
                DropdownButtonFormField<String>(
                  initialValue: _category,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                  onChanged: (v) => setState(() => _category = v ?? _category),
                ),
                SizedBox(height: context.h(14)),
                TextFormField(
                  controller: _descController,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'Description'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                CheckboxListTile(
                  value: _anonymous,
                  onChanged: (v) => setState(() => _anonymous = v ?? false),
                  title: Text('Submit anonymously', style: TextStyle(fontSize: context.sp(13))),
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                ),
                SizedBox(height: context.h(10)),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Submit'),
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

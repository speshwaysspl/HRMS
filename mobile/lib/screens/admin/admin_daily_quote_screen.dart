import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_client.dart';
import '../../services/daily_quote_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/hrms_app_bar.dart';

class AdminDailyQuoteScreen extends StatefulWidget {
  const AdminDailyQuoteScreen({super.key});

  @override
  State<AdminDailyQuoteScreen> createState() => _AdminDailyQuoteScreenState();
}

class _AdminDailyQuoteScreenState extends State<AdminDailyQuoteScreen> {
  final _service = DailyQuoteService();
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  bool _uploading = false;
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
      final data = await _service.getHistory();
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

  Future<void> _add() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.image);
    final path = result?.files.single.path;
    if (path == null) return;
    setState(() => _uploading = true);
    try {
      await _service.add(filePath: path, fileName: result!.files.single.name);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Quote published')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _activate(Map<String, dynamic> q) async {
    try {
      await _service.activate(q['_id'].toString());
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    }
  }

  Future<void> _delete(Map<String, dynamic> q) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete quote?'),
        content: const Text('This quote image will be removed permanently.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _service.remove(q['_id'].toString());
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
      appBar: HrmsAppBar(title: const Text('Daily Quote')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _uploading ? null : _add,
        icon: _uploading
            ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Icon(Icons.add_photo_alternate_outlined),
        label: const Text('Publish'),
      ),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: const [SkeletonListTile(), SkeletonListTile(), SkeletonListTile()],
            )
          : _error != null
              ? buildErrorState(_error!, _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          EmptyStateView(icon: Icons.format_quote_outlined, title: 'No quotes yet', subtitle: 'Published daily quotes will show up here.'),
                        ])
                      : ListView.builder(
                          padding: EdgeInsets.all(context.w(16)),
                          itemCount: _items.length,
                          itemBuilder: (context, i) {
                            final q = _items[i];
                            final isCurrent = i == 0;
                            String date = '';
                            try {
                              date = DateFormat('d MMM yyyy, h:mm a').format(DateTime.parse(q['createdAt'].toString()));
                            } catch (_) {}
                            final img = (q['imageUrl'] ?? q['image'])?.toString();
                            return Container(
                              margin: EdgeInsets.only(bottom: context.h(12)),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(AppRadius.card),
                                border: Border.all(color: isCurrent ? AppColors.accent400 : AppColors.surfaceSubtle),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  if (img != null)
                                    ClipRRect(
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.card)),
                                      child: Image.network(img, fit: BoxFit.cover,
                                          errorBuilder: (_, _, _) => const SizedBox(height: 4)),
                                    ),
                                  Padding(
                                    padding: EdgeInsets.all(context.w(12)),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Text(isCurrent ? 'Currently live · $date' : date,
                                              style: TextStyle(
                                                  fontSize: context.sp(12),
                                                  color: isCurrent ? AppColors.accent700 : AppColors.inkMuted,
                                                  fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400)),
                                        ),
                                        if (!isCurrent)
                                          TextButton(onPressed: () => _activate(q), child: const Text('Make live')),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                                          onPressed: () => _delete(q),
                                        ),
                                      ],
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

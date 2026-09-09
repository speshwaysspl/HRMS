import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/api_client.dart';
import '../../services/document_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';

class AdminDocumentsScreen extends StatefulWidget {
  const AdminDocumentsScreen({super.key});

  @override
  State<AdminDocumentsScreen> createState() => _AdminDocumentsScreenState();
}

class _AdminDocumentsScreenState extends State<AdminDocumentsScreen> {
  final _service = DocumentService();
  List<Map<String, dynamic>> _all = [];
  bool _loading = true;
  String? _error;
  String _filter = 'Pending';
  final Set<String> _busy = {};

  static const _filters = ['Pending', 'Approved', 'Rejected', 'All'];

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
      final data = await _service.getDocuments();
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
    return _all.where((d) => (d['status'] ?? 'Pending').toString() == _filter).toList();
  }

  Future<void> _decide(Map<String, dynamic> d, String status) async {
    final id = d['_id'].toString();
    setState(() => _busy.add(id));
    try {
      await _service.setStatus(id, status);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy.remove(id));
    }
  }

  Future<void> _open(Map<String, dynamic> d) async {
    final url = (d['fileUrl'] ?? d['url'] ?? d['documentUrl'])?.toString();
    if (url == null || url.isEmpty) return;
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: Column(
        children: [
          SizedBox(
            height: context.h(52),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: context.w(12), vertical: context.h(8)),
              children: _filters.map((f) {
                return Padding(
                  padding: EdgeInsets.only(right: context.w(8)),
                  child: ChoiceChip(
                    label: Text(f),
                    selected: f == _filter,
                    onSelected: (_) => setState(() => _filter = f),
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
                                CenteredMessage(icon: Icons.description_outlined, message: 'No $_filter documents.'),
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

  Widget _card(Map<String, dynamic> d) {
    final id = d['_id'].toString();
    final emp = d['employeeId'] as Map? ?? {};
    final user = emp['userId'] as Map? ?? {};
    final status = (d['status'] ?? 'Pending').toString();
    final busy = _busy.contains(id);

    return SimpleCard(
      onTap: () => _open(d),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(user['name']?.toString() ?? 'Employee',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
              ),
              SizedBox(width: context.w(8)),
              StatusPill(label: status),
            ],
          ),
          SizedBox(height: context.h(4)),
          Text(
            '${d['documentType'] ?? 'Document'}  ·  ${d['originalName'] ?? ''}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
          ),
          if (status == 'Pending') ...[
            SizedBox(height: context.h(10)),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: busy ? null : () => _decide(d, 'Rejected'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: const BorderSide(color: AppColors.danger),
                    ),
                    child: const Text('Reject'),
                  ),
                ),
                SizedBox(width: context.w(10)),
                Expanded(
                  child: ElevatedButton(
                    onPressed: busy ? null : () => _decide(d, 'Approved'),
                    child: busy
                        ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

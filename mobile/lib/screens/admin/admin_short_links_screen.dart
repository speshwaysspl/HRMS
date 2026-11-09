import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import '../../services/api_client.dart';
import '../../services/live_refresh.dart';
import '../../services/short_link_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/balloon_refresh.dart';
import '../../widgets/hrms_app_bar.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/status_pill.dart';

/// Admin/HR short links — mirrors web `components/shortLinks/ShortLinks.jsx`.
class AdminShortLinksScreen extends StatefulWidget {
  const AdminShortLinksScreen({super.key});

  @override
  State<AdminShortLinksScreen> createState() => _AdminShortLinksScreenState();
}

class _AdminShortLinksScreenState extends State<AdminShortLinksScreen>
    with LiveRefresh<AdminShortLinksScreen> {
  @override
  List<String> get liveResources => const ['links'];

  @override
  void onLiveRefresh() => _load(silent: true);

  final _service = ShortLinkService();
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  Object? _error;
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final data = await _service.list();
      if (!mounted) return;
      setState(() {
        _items = data;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (!silent) _error = e;
        _loading = false;
      });
    }
  }

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _copy(Map<String, dynamic> link) async {
    await Clipboard.setData(ClipboardData(text: link['shortUrl'].toString()));
    _toast('Link copied');
  }

  Future<void> _share(Map<String, dynamic> link) async {
    final title = (link['title'] ?? '').toString();
    await SharePlus.instance.share(
      ShareParams(text: title.isEmpty ? link['shortUrl'].toString() : '$title\n${link['shortUrl']}'),
    );
  }

  Future<void> _create() async {
    final created = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateSheet(service: _service),
    );
    if (created == null) return;
    setState(() => _items = [created, ..._items.where((l) => l['_id'] != created['_id'])]);
    await _copy(created);
  }

  Future<void> _toggle(Map<String, dynamic> link) async {
    final id = link['_id'].toString();
    setState(() => _busyId = id);
    try {
      final updated = await _service.setActive(id, link['active'] != true);
      if (!mounted) return;
      setState(() => _items = _items.map((l) => l['_id'] == id ? updated : l).toList());
    } catch (e) {
      _toast(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _delete(Map<String, dynamic> link) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete short link?'),
        content: Text('Anyone who opens ${link['shortUrl']} will see "link expired".'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final id = link['_id'].toString();
    setState(() => _busyId = id);
    try {
      await _service.remove(id);
      if (!mounted) return;
      setState(() => _items = _items.where((l) => l['_id'] != id).toList());
    } catch (e) {
      _toast(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  String _statusLabel(Map<String, dynamic> l) => switch (l['status']) {
        'active' => 'Active',
        'expired' => 'Expired',
        _ => 'Inactive',
      };

  String _expiry(Map<String, dynamic> l) {
    final raw = l['expiresAt'];
    if (raw == null) return 'Never expires';
    final d = DateTime.tryParse(raw.toString())?.toLocal();
    if (d == null) return '';
    return 'Expires ${MaterialLocalizations.of(context).formatMediumDate(d)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: HrmsAppBar(title: const Text('Short Links')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        icon: const Icon(Icons.add_link),
        label: const Text('Shorten'),
      ),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: const [SkeletonListTile(), SkeletonListTile(), SkeletonListTile()],
            )
          : _error != null
              ? buildErrorState(_error!, _load)
              : BalloonRefresh(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 100),
                            EmptyStateView(
                              icon: Icons.link,
                              title: 'No short links yet',
                              subtitle: 'Tap Shorten to create a link to a Speshway page.',
                            ),
                          ],
                        )
                      : ListView.builder(
                          padding: EdgeInsets.fromLTRB(context.w(16), context.h(16), context.w(16), context.h(96)),
                          itemCount: _items.length,
                          itemBuilder: (_, i) {
                            final l = _items[i];
                            final busy = _busyId == l['_id'];
                            final title = (l['title'] ?? '').toString();
                            final short = l['shortUrl'].toString().replaceFirst(RegExp(r'^https?://'), '');
                            return SimpleCard(
                              onTap: () => _copy(l),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          short,
                                          style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink, fontSize: context.sp(14)),
                                        ),
                                      ),
                                      SizedBox(width: context.w(8)),
                                      StatusPill(label: _statusLabel(l)),
                                    ],
                                  ),
                                  if (title.isNotEmpty) ...[
                                    SizedBox(height: context.h(3)),
                                    Text(title, style: TextStyle(color: AppColors.ink, fontSize: context.sp(13))),
                                  ],
                                  SizedBox(height: context.h(3)),
                                  Text(
                                    '→ ${l['targetUrl']}',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
                                  ),
                                  SizedBox(height: context.h(6)),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '${l['clicks'] ?? 0} clicks  ·  ${_expiry(l)}',
                                          style: TextStyle(
                                            color: AppColors.inkMuted,
                                            fontSize: context.sp(12),
                                            fontFeatures: const [FontFeature.tabularFigures()],
                                          ),
                                        ),
                                      ),
                                      IconButton(
                                        tooltip: 'Share',
                                        icon: const Icon(Icons.share_outlined),
                                        onPressed: () => _share(l),
                                      ),
                                      IconButton(
                                        tooltip: l['active'] == true ? 'Disable' : 'Enable',
                                        icon: Icon(Icons.power_settings_new,
                                            color: l['active'] == true ? AppColors.inkMuted : AppColors.warning),
                                        onPressed: busy ? null : () => _toggle(l),
                                      ),
                                      IconButton(
                                        tooltip: 'Delete',
                                        icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                                        onPressed: busy ? null : () => _delete(l),
                                      ),
                                    ],
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

class _CreateSheet extends StatefulWidget {
  final ShortLinkService service;
  const _CreateSheet({required this.service});

  @override
  State<_CreateSheet> createState() => _CreateSheetState();
}

class _CreateSheetState extends State<_CreateSheet> {
  final _formKey = GlobalKey<FormState>();
  final _url = TextEditingController();
  final _title = TextEditingController();
  final _alias = TextEditingController();
  int _days = 90;
  bool _saving = false;
  String? _error;

  static const _expiry = {7: '7 days', 30: '30 days', 90: '90 days', 365: '1 year', 0: 'Never'};

  @override
  void dispose() {
    _url.dispose();
    _title.dispose();
    _alias.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final link = await widget.service.create(
        url: _url.text.trim(),
        title: _title.text.trim(),
        alias: _alias.text.trim(),
        expiresInDays: _days,
      );
      if (mounted) Navigator.of(context).pop(link);
    } catch (e) {
      if (mounted) setState(() => _error = extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
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
                Text('New Short Link',
                    style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
                SizedBox(height: context.h(16)),
                TextFormField(
                  controller: _url,
                  enabled: !_saving,
                  keyboardType: TextInputType.url,
                  autocorrect: false,
                  decoration: const InputDecoration(
                    labelText: 'Link to shorten',
                    hintText: 'https://speshwayhrms.com/…',
                    helperText: 'Only speshwayhrms.com and speshway.com links',
                  ),
                  validator: (v) {
                    final t = v?.trim() ?? '';
                    if (t.isEmpty) return 'Paste the link you want to shorten';
                    if (!t.startsWith('https://')) return 'Link must start with https://';
                    return null;
                  },
                ),
                SizedBox(height: context.h(14)),
                TextFormField(
                  controller: _title,
                  enabled: !_saving,
                  maxLength: 120,
                  decoration: const InputDecoration(labelText: 'Label (optional)'),
                ),
                TextFormField(
                  controller: _alias,
                  enabled: !_saving,
                  maxLength: 32,
                  autocorrect: false,
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9-]'))],
                  decoration: const InputDecoration(labelText: 'Custom ending (optional)', prefixText: '/s/'),
                  validator: (v) {
                    final t = v?.trim() ?? '';
                    if (t.isNotEmpty && t.length < 3) return 'At least 3 characters';
                    return null;
                  },
                ),
                DropdownButtonFormField<int>(
                  initialValue: _days,
                  decoration: const InputDecoration(labelText: 'Expires'),
                  items: _expiry.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                  onChanged: _saving ? null : (v) => setState(() => _days = v ?? 90),
                ),
                if (_error != null) ...[
                  SizedBox(height: context.h(12)),
                  Text(_error!, style: TextStyle(color: AppColors.danger, fontSize: context.sp(13))),
                ],
                SizedBox(height: context.h(18)),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(minimumSize: Size.fromHeight(context.h(48))),
                  child: Text(_saving ? 'Creating…' : 'Shorten & copy'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

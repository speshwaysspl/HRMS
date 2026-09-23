import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/announcement_service.dart';
import '../../services/api_client.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/hrms_app_bar.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  final _service = AnnouncementService();
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
      final data = await _service.getAnnouncements();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: HrmsAppBar(title: const Text('Announcements')),
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
                          EmptyStateView(icon: Icons.campaign_outlined, title: 'No announcements yet', subtitle: 'Company announcements will show up here.'),
                        ])
                      : ListView(
                          padding: EdgeInsets.fromLTRB(context.w(16), context.h(12), context.w(16), context.h(16)),
                          children: [
                            Padding(
                              padding: EdgeInsets.only(bottom: context.h(14), left: context.w(2)),
                              child: Text(
                                'Stay updated with the latest company news',
                                style: TextStyle(fontSize: context.sp(13), color: AppColors.inkMuted),
                              ),
                            ),
                            Container(
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(context.r(16)),
                                border: Border.all(color: AppColors.surfaceSubtle),
                              ),
                              clipBehavior: Clip.antiAlias,
                              child: Column(
                                children: [
                                  for (var i = 0; i < _items.length; i++) ...[
                                    if (i > 0)
                                      Divider(height: 1, thickness: 1, color: AppColors.surfaceSubtle, indent: context.w(16), endIndent: context.w(16)),
                                    _AnnouncementRow(
                                      item: _items[i],
                                      onTap: () => Navigator.of(context).push(
                                        MaterialPageRoute(builder: (_) => AnnouncementDetailScreen(id: _items[i]['_id'].toString())),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                ),
    );
  }
}

/// (label, color) shown for an announcement's category — purposeful, stable
/// meaning instead of a generic decorative icon badge.
(String, Color) categoryStyle(String? category) {
  switch (category) {
    case 'important':
      return ('IMPORTANT', AppColors.brand500);
    case 'festival':
      return ('FESTIVAL', AppColors.accent700);
    case 'event':
      return ('EVENT', AppColors.accent700);
    case 'achievement':
      return ('ACHIEVEMENT', AppColors.accent700);
    case 'quote':
      return ('DAILY QUOTE', AppColors.inkFaint);
    default:
      return ('ANNOUNCEMENT', AppColors.inkFaint);
  }
}

/// A single row in the announcements list — no icon badge; a real image
/// thumbnail when the announcement has one, plain text otherwise. Rows sit
/// inside one shared surface (divided by hairlines) rather than each being
/// its own bordered card.
class _AnnouncementRow extends StatelessWidget {
  final Map<String, dynamic> item;
  final VoidCallback onTap;

  const _AnnouncementRow({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final title = item['title']?.toString() ?? '';
    final description = item['description']?.toString() ?? '';
    final imageUrl = item['imageUrl']?.toString();
    final (categoryLabel, categoryColor) = categoryStyle(item["category"]?.toString());

    String date = '';
    try {
      final created = DateTime.parse(item['createdAt'].toString());
      date = DateFormat('d MMM, yyyy').format(created);
    } catch (_) {}

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: context.w(16), vertical: context.h(14)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (imageUrl != null && imageUrl.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(context.r(10)),
                child: Image.network(
                  imageUrl,
                  width: context.r(56),
                  height: context.r(56),
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
              ),
              SizedBox(width: context.w(12)),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          categoryLabel,
                          style: TextStyle(
                            fontSize: context.sp(10.5),
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.4,
                            color: categoryColor,
                          ),
                        ),
                      ),
                      Text(
                        date,
                        style: TextStyle(fontSize: context.sp(11.5), color: AppColors.inkFaint, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                  SizedBox(height: context.h(4)),
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: context.sp(15),
                      fontWeight: FontWeight.w700,
                      color: AppColors.ink,
                      height: 1.3,
                    ),
                  ),
                  if (description.isNotEmpty) ...[
                    SizedBox(height: context.h(4)),
                    Text(
                      description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: context.sp(13), color: AppColors.inkMuted, height: 1.4),
                    ),
                  ],
                ],
              ),
            ),
            SizedBox(width: context.w(4)),
            Padding(
              padding: EdgeInsets.only(top: context.h(2)),
              child: Icon(Icons.chevron_right_rounded, size: context.r(20), color: AppColors.inkFaint),
            ),
          ],
        ),
      ),
    );
  }
}

class AnnouncementDetailScreen extends StatefulWidget {
  final String id;
  const AnnouncementDetailScreen({super.key, required this.id});

  @override
  State<AnnouncementDetailScreen> createState() => _AnnouncementDetailScreenState();
}

class _AnnouncementDetailScreenState extends State<AnnouncementDetailScreen> {
  final _service = AnnouncementService();
  Map<String, dynamic>? _item;
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
      final v = await _service.getAnnouncement(widget.id);
      if (!mounted) return;
      setState(() {
        _item = v;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: HrmsAppBar(title: const Text('Announcement')),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(20)),
              children: [
                SkeletonBox(height: context.h(180), borderRadius: BorderRadius.circular(context.r(16))),
                SizedBox(height: context.h(16)),
                const SkeletonBox(height: 22, width: 220),
                SizedBox(height: context.h(10)),
                const SkeletonListTile(),
              ],
            )
          : _error != null
              ? buildErrorState(_error!, _load)
              : _buildContent(context),
    );
  }

  Widget _buildContent(BuildContext context) {
    final imageUrl = _item?['imageUrl']?.toString();
    final title = _item?['title']?.toString() ?? '';
    final description = _item?['description']?.toString() ?? '';
    final authorName = (_item?['createdBy'] is Map) ? (_item?['createdBy']?['name']?.toString() ?? '') : '';
    final (categoryLabel, categoryColor) = categoryStyle(_item?["category"]?.toString());

    String date = '';
    try {
      final created = DateTime.parse(_item?['createdAt'].toString() ?? '');
      date = DateFormat('d MMMM yyyy').format(created);
    } catch (_) {}

    return ListView(
      padding: EdgeInsets.all(context.w(20)),
      children: [
        if (imageUrl != null && imageUrl.isNotEmpty) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(context.r(16)),
            child: Image.network(
              imageUrl,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => const SizedBox.shrink(),
            ),
          ),
          SizedBox(height: context.h(18)),
        ],
        Text(
          categoryLabel,
          style: TextStyle(fontSize: context.sp(11.5), fontWeight: FontWeight.w700, letterSpacing: 0.5, color: categoryColor),
        ),
        SizedBox(height: context.h(6)),
        Text(
          title,
          style: TextStyle(fontSize: context.sp(21), fontWeight: FontWeight.w800, color: AppColors.ink, height: 1.25),
        ),
        SizedBox(height: context.h(8)),
        Text(
          [if (authorName.isNotEmpty) authorName, date].where((s) => s.isNotEmpty).join(' • '),
          style: TextStyle(fontSize: context.sp(12.5), color: AppColors.inkFaint, fontWeight: FontWeight.w500),
        ),
        SizedBox(height: context.h(16)),
        Divider(color: AppColors.surfaceSubtle, height: 1),
        SizedBox(height: context.h(16)),
        Text(
          description,
          style: TextStyle(color: AppColors.ink, fontSize: context.sp(14.5), height: 1.7),
        ),
      ],
    );
  }
}

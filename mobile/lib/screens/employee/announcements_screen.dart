import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/announcement_service.dart';
import '../../services/api_client.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';

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
      appBar: AppBar(title: const Text('Announcements')),
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
                          padding: EdgeInsets.all(context.w(16)),
                          children: _items.map((a) {
                            String date = '';
                            var isNew = false;
                            try {
                              final created = DateTime.parse(a['createdAt'].toString());
                              date = DateFormat('d MMM, yyyy').format(created);
                              isNew = DateTime.now().difference(created) < const Duration(hours: 24);
                            } catch (_) {}
                            return Padding(
                              padding: EdgeInsets.only(bottom: context.h(12)),
                              child: _AnnouncementCard(
                                title: a['title']?.toString() ?? '',
                                description: a['description']?.toString() ?? '',
                                date: date,
                                isNew: isNew,
                                onTap: () => Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => AnnouncementDetailScreen(id: a['_id'].toString())),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                ),
    );
  }
}

/// High-visibility announcement tile — same design language as the Home
/// screen's Recent Announcements card and the web equivalent.
class _AnnouncementCard extends StatelessWidget {
  final String title;
  final String description;
  final String date;
  final bool isNew;
  final VoidCallback onTap;

  const _AnnouncementCard({
    required this.title,
    required this.description,
    required this.date,
    required this.isNew,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(context.r(16)),
        child: Container(
          padding: EdgeInsets.all(context.w(14)),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [AppColors.tint(const Color(0xFFF0FDF4)), Colors.white],
            ),
            borderRadius: BorderRadius.circular(context.r(16)),
            border: Border.all(color: AppColors.tint(const Color(0xFFBBF7D0)), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF16A34A).withValues(alpha: 0.08),
                blurRadius: 12,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: context.r(44),
                    height: context.r(44),
                    decoration: BoxDecoration(
                      color: AppColors.tint(AppColors.tint(const Color(0xFFDCFCE7))),
                      borderRadius: BorderRadius.circular(context.r(12)),
                    ),
                    child: Icon(Icons.campaign_rounded, color: const Color(0xFF16A34A), size: context.r(22)),
                  ),
                  SizedBox(width: context.w(12)),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: context.sp(14.5),
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF0F172A),
                                  height: 1.3,
                                ),
                              ),
                            ),
                            if (isNew) ...[
                              SizedBox(width: context.w(8)),
                              Container(
                                padding: EdgeInsets.symmetric(horizontal: context.w(8), vertical: context.h(2)),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF16A34A),
                                  borderRadius: BorderRadius.circular(context.r(20)),
                                ),
                                child: Text(
                                  'NEW',
                                  style: TextStyle(
                                    fontSize: context.sp(10),
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        SizedBox(height: context.h(5)),
                        Text(
                          description,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: context.sp(12.5),
                            color: const Color(0xFF475569),
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              SizedBox(height: context.h(12)),
              Divider(height: 1, color: AppColors.tint(const Color(0xFFDCFCE7))),
              SizedBox(height: context.h(10)),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.calendar_today_rounded, size: context.r(12), color: const Color(0xFF94A3B8)),
                      SizedBox(width: context.w(5)),
                      Text(
                        date,
                        style: TextStyle(fontSize: context.sp(11.5), fontWeight: FontWeight.w500, color: const Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Text(
                        'Read more',
                        style: TextStyle(fontSize: context.sp(12), fontWeight: FontWeight.w700, color: const Color(0xFF16A34A)),
                      ),
                      Icon(Icons.chevron_right_rounded, size: context.r(16), color: const Color(0xFF16A34A)),
                    ],
                  ),
                ],
              ),
            ],
          ),
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

  @override
  void initState() {
    super.initState();
    _service.getAnnouncement(widget.id).then((v) {
      if (mounted) {
        setState(() {
          _item = v;
          _loading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Announcement')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: EdgeInsets.all(context.w(20)),
              children: [
                if (_item?['imageUrl'] != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(_item!['imageUrl'].toString(), fit: BoxFit.cover),
                  ),
                SizedBox(height: context.h(14)),
                Text(_item?['title']?.toString() ?? '', style: TextStyle(fontSize: context.sp(19), fontWeight: FontWeight.w700, color: AppColors.ink)),
                SizedBox(height: context.h(10)),
                Text(_item?['description']?.toString() ?? '', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(14), height: 1.5)),
              ],
            ),
    );
  }
}

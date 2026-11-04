import 'package:flutter/material.dart';
import '../../services/announcement_service.dart';
import '../../services/api_client.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/announcement_card.dart';
import '../../widgets/hrms_app_bar.dart';

import '../../services/live_refresh.dart';
import '../../widgets/balloon_refresh.dart';
class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> with LiveRefresh<AnnouncementsScreen> {
  @override
  List<String> get liveResources => const ['announcement'];

  @override
  void onLiveRefresh() => _load();

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
          : BalloonRefresh(
              onRefresh: _load,
              child: _items.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 100),
                        EmptyStateView(
                          icon: Icons.campaign_outlined,
                          title: 'No announcements yet',
                          subtitle: 'Company announcements will show up here.',
                        ),
                      ],
                    )
                  : ListView(
                      padding: EdgeInsets.fromLTRB(
                        context.w(16),
                        context.h(12),
                        context.w(16),
                        context.h(16),
                      ),
                      children: [
                        Padding(
                          padding: EdgeInsets.only(
                            bottom: context.h(14),
                            left: context.w(2),
                          ),
                          child: Text(
                            'Stay updated with the latest company news',
                            style: TextStyle(
                              fontSize: context.sp(13),
                              color: AppColors.inkMuted,
                            ),
                          ),
                        ),
                        for (var i = 0; i < _items.length; i++) ...[
                          if (i > 0) SizedBox(height: context.h(14)),
                          AnnouncementCard(
                            item: _items[i],
                            isNew: _items[i]['seen'] == false,
                            onTap: () async {
                              await Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => AnnouncementDetailScreen(
                                    id: _items[i]['_id'].toString(),
                                  ),
                                ),
                              );
                              // Opened → no longer "New".
                              if (mounted) setState(() => _items[i] = {..._items[i], 'seen': true});
                            },
                          ),
                        ],
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
  State<AnnouncementDetailScreen> createState() =>
      _AnnouncementDetailScreenState();
}

class _AnnouncementDetailScreenState extends State<AnnouncementDetailScreen> with LiveRefresh<AnnouncementDetailScreen> {
  @override
  List<String> get liveResources => const ['announcement'];

  @override
  void onLiveRefresh() => _load();

  final _service = AnnouncementService();
  Map<String, dynamic>? _item;
  bool _markedSeen = false;
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
      // Counts toward the admin's "seen by N" — once per open, not on every
      // live refresh (that looped: ping → broadcast → reload → ping).
      if (!_markedSeen) {
        _markedSeen = true;
        _service.markSeen(widget.id);
      }
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
                SkeletonBox(
                  height: context.h(180),
                  borderRadius: BorderRadius.circular(context.r(16)),
                ),
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
    return ListView(
      padding: EdgeInsets.all(context.w(16)),
      children: [AnnouncementCard(item: _item ?? const {}, variant: AnnouncementVariant.full)],
    );
  }
}

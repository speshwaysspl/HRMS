import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/announcement_service.dart';
import '../../services/api_client.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';

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
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Announcements')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          CenteredMessage(icon: Icons.campaign_outlined, message: 'No announcements yet.'),
                        ])
                      : ListView(
                          padding: EdgeInsets.all(context.w(16)),
                          children: _items.map((a) {
                            String date = '';
                            try {
                              date = DateFormat('d MMM, yyyy').format(DateTime.parse(a['createdAt'].toString()));
                            } catch (_) {}
                            return SimpleCard(
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => AnnouncementDetailScreen(id: a['_id'].toString())),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(a['title']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                  SizedBox(height: context.h(4)),
                                  Text(
                                    a['description']?.toString() ?? '',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13)),
                                  ),
                                  SizedBox(height: context.h(6)),
                                  Text(date, style: TextStyle(color: AppColors.inkFaint, fontSize: context.sp(11))),
                                ],
                              ),
                            );
                          }).toList(),
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
      if (mounted) setState(() {
        _item = v;
        _loading = false;
      });
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

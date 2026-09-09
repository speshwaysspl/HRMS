import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_provider.dart';
import '../../services/notification_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _service = NotificationService();
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
    final userId = context.read<AuthProvider>().user?.id ?? '';
    try {
      final data = await _service.getNotifications(userId, limit: 50);
      if (!mounted) return;
      setState(() {
        _items = List<Map<String, dynamic>>.from((data['notifications'] as List?) ?? []);
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

  Future<void> _markAllRead() async {
    final userId = context.read<AuthProvider>().user?.id ?? '';
    await _service.markAllRead(userId);
    _load();
  }

  Future<void> _onTapItem(Map<String, dynamic> n) async {
    if (n['isRead'] != true) {
      await _service.markRead(n['_id'].toString());
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: _markAllRead,
            child: const Text('Mark all read', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          CenteredMessage(icon: Icons.notifications_none, message: 'No notifications yet.'),
                        ])
                      : ListView(
                          padding: EdgeInsets.all(context.w(16)),
                          children: _items.map((n) {
                            final isRead = n['isRead'] == true;
                            String date = '';
                            try {
                              date = DateFormat('d MMM, h:mm a').format(DateTime.parse(n['createdAt'].toString()));
                            } catch (_) {}
                            return SimpleCard(
                              onTap: () => _onTapItem(n),
                              child: Row(
                                children: [
                                  if (!isRead)
                                    Container(
                                      width: context.r(8),
                                      height: context.r(8),
                                      margin: EdgeInsets.only(right: context.w(10)),
                                      decoration: const BoxDecoration(color: AppColors.accent500, shape: BoxShape.circle),
                                    ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          n['title']?.toString() ?? '',
                                          style: TextStyle(
                                            fontWeight: isRead ? FontWeight.w500 : FontWeight.w700,
                                            color: AppColors.ink,
                                          ),
                                        ),
                                        SizedBox(height: context.h(3)),
                                        Text(n['message']?.toString() ?? '', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
                                        SizedBox(height: context.h(4)),
                                        Text(date, style: TextStyle(color: AppColors.inkFaint, fontSize: context.sp(11))),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                ),
    );
  }
}

import 'package:flutter/material.dart';
import '../../services/app_events.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_provider.dart';
import '../../services/notification_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../admin/admin_feedback_screen.dart';
import '../admin/admin_leaves_screen.dart';
import 'announcements_screen.dart';
import 'feedback_screen.dart';
import 'leaves_screen.dart';
import 'payslips_screen.dart';
import 'tasks_screen.dart';

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
  Object? _lastError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _syncBadge() => AppEvents.unreadNotifications.value =
      _items.where((n) => n['isRead'] != true).length;

  @override
  void setState(VoidCallback fn) {
    super.setState(fn);
    if (!_loading) _syncBadge();
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
        _lastError = e;
        _loading = false;
      });
    }
  }

  Future<void> _markAllRead() async {
    final userId = context.read<AuthProvider>().user?.id ?? '';
    setState(() {
      for (final n in _items) {
        n['isRead'] = true;
      }
    });
    await _service.markAllRead(userId);
  }

  Future<void> _confirmDeleteAll() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete all notifications?'),
        content: const Text('Are you sure you want to clear all notifications? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete All'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final userId = context.read<AuthProvider>().user?.id ?? '';
      final backup = List<Map<String, dynamic>>.from(_items);
      setState(() => _items.clear());
      try {
        await _service.clearAll(userId);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('All notifications deleted')),
        );
      } catch (e) {
        if (!mounted) return;
        setState(() => _items = backup);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to clear notifications: ${extractErrorMessage(e)}')),
        );
      }
    }
  }

  Future<void> _deleteSingleNotification(Map<String, dynamic> n, int index) async {
    setState(() {
      _items.remove(n);
    });

    final id = n['_id']?.toString();
    if (id != null) {
      try {
        await _service.deleteNotification(id);
      } catch (_) {}
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Notification deleted'),
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () {
            setState(() {
              _items.insert(index.clamp(0, _items.length), n);
            });
          },
        ),
      ),
    );
  }

  Future<void> _onTapItem(Map<String, dynamic> n) async {
    final notificationId = n['_id']?.toString();
    if (notificationId != null && n['isRead'] != true) {
      setState(() => n['isRead'] = true);
      _service.markRead(notificationId).catchError((_) {});
    }

    final user = context.read<AuthProvider>().user;
    final isAdmin = user?.isAdmin == true;
    final type = (n['type'] ?? '').toString().toLowerCase();
    final title = (n['title'] ?? '').toString().toLowerCase();
    final message = (n['message'] ?? '').toString().toLowerCase();

    // 1. Leave notifications
    if (type.contains('leave') || title.contains('leave') || message.contains('leave')) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => isAdmin ? const AdminLeavesScreen() : const LeavesScreen(),
        ),
      );
      return;
    }

    // 2. Announcements / Greetings / Festivals / Events / Holidays
    if (type.contains('announcement') ||
        type.contains('holiday') ||
        type.contains('event') ||
        type.contains('meeting') ||
        title.contains('announcement') ||
        title.contains('greeting') ||
        title.contains('festival') ||
        message.contains('announcement')) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => const AnnouncementsScreen(),
        ),
      );
      return;
    }

    // 3. Tasks
    if (type.contains('task') || title.contains('task') || message.contains('task')) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const TasksScreen()),
      );
      return;
    }

    // 4. Feedback
    if (type.contains('feedback') || title.contains('feedback') || message.contains('feedback')) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => isAdmin ? const AdminFeedbackScreen() : const FeedbackScreen(),
        ),
      );
      return;
    }

    // 5. Payslips / Salary
    if (type.contains('payslip') || title.contains('payslip') || title.contains('salary')) {
      final code = user?.id ?? '';
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => PayslipsScreen(employeeCode: code)),
      );
      return;
    }

    // Default: Show details popup dialog
    _showNotificationDetails(n);
  }

  void _showNotificationDetails(Map<String, dynamic> n) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(n['title']?.toString() ?? 'Notification'),
        content: Text(n['message']?.toString() ?? ''),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildSwipeBackground({required bool isLeft}) {
    return Container(
      margin: EdgeInsets.only(bottom: context.h(10)),
      decoration: BoxDecoration(
        color: AppColors.danger,
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      alignment: isLeft ? Alignment.centerLeft : Alignment.centerRight,
      padding: EdgeInsets.symmetric(horizontal: context.w(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isLeft) ...[
            const Icon(Icons.delete_outline, color: Colors.white),
            SizedBox(width: context.w(8)),
            Text(
              'Delete',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: context.sp(14),
              ),
            ),
          ] else ...[
            Text(
              'Delete',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: context.sp(14),
              ),
            ),
            SizedBox(width: context.w(8)),
            const Icon(Icons.delete_outline, color: Colors.white),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        flexibleSpace: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              'assets/appbar_bg.png',
              fit: BoxFit.cover,
            ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.25),
                    AppColors.brand900.withValues(alpha: 0.45),
                  ],
                ),
              ),
            ),
          ],
        ),
        title: const Text('Notifications'),
        actions: [
          if (_items.isNotEmpty) ...[
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Mark read', style: TextStyle(color: Colors.white70)),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.white),
              tooltip: 'Delete all',
              onPressed: _confirmDeleteAll,
            ),
            SizedBox(width: context.w(4)),
          ],
        ],
      ),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: const [
                SkeletonListTile(),
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
                          EmptyStateView(icon: Icons.notifications_none, title: 'No notifications yet', subtitle: 'You are all caught up.'),
                        ])
                      : ListView.builder(
                          padding: EdgeInsets.all(context.w(16)),
                          itemCount: _items.length,
                          itemBuilder: (context, index) {
                            final n = _items[index];
                            final isRead = n['isRead'] == true;
                            final id = n['_id']?.toString() ?? index.toString();
                            String date = '';
                            try {
                              date = DateFormat('d MMM, h:mm a').format(DateTime.parse(n['createdAt'].toString()));
                            } catch (_) {}

                            return Dismissible(
                              key: Key(id),
                              direction: DismissDirection.horizontal,
                              background: _buildSwipeBackground(isLeft: true),
                              secondaryBackground: _buildSwipeBackground(isLeft: false),
                              onDismissed: (_) => _deleteSingleNotification(n, index),
                              child: SimpleCard(
                                onTap: () => _onTapItem(n),
                                child: Row(
                                  children: [
                                    if (!isRead)
                                      Container(
                                        width: context.r(8),
                                        height: context.r(8),
                                        margin: EdgeInsets.only(right: context.w(10)),
                                        decoration: const BoxDecoration(
                                          color: AppColors.accent500,
                                          shape: BoxShape.circle,
                                        ),
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
                                          Text(
                                            n['message']?.toString() ?? '',
                                            style: TextStyle(
                                              color: AppColors.inkMuted,
                                              fontSize: context.sp(13),
                                            ),
                                          ),
                                          SizedBox(height: context.h(4)),
                                          Text(
                                            date,
                                            style: TextStyle(
                                              color: AppColors.inkFaint,
                                              fontSize: context.sp(11),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Icon(
                                      Icons.chevron_right,
                                      size: context.r(18),
                                      color: AppColors.inkFaint,
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

import 'package:dio/dio.dart';
import 'app_events.dart';
import 'api_client.dart';
import 'push_service.dart';

class NotificationService {
  final Dio _dio = ApiClient.instance.dio;

  Future<Map<String, dynamic>> getNotifications(String userId, {int page = 1, int limit = 20}) async {
    final res = await _dio.get('/api/notifications/user/$userId', queryParameters: {
      'page': page,
      'limit': limit,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Refreshes [AppEvents.unreadNotifications]; failures leave it unchanged.
  Future<void> refreshUnread(String userId) async {
    if (userId.isEmpty) return;
    try {
      final data = await getNotifications(userId, limit: 50);
      final list = (data['notifications'] as List?) ?? [];
      final unread = list.whereType<Map>().where((n) => n['isRead'] != true).toList();
      AppEvents.unreadNotifications.value = unread.length;
      _toastNewUnread(userId, unread);
    } catch (_) {}
  }

  // Unread ids already known on this device, per user. The first refresh after
  // launch / login only records them (no toast for old items).
  static String? _seenFor;
  static final Set<String> _seenUnread = {};

  /// Gooey-drop toast for notifications that arrived since the last refresh —
  /// same trigger as the bell's red dot, so it works even when the live socket
  /// or FCM doesn't deliver in the foreground. Deduped with those paths by id.
  void _toastNewUnread(String userId, List<Map> unread) {
    final ids = unread.map((n) => n['_id']?.toString() ?? '').where((id) => id.isNotEmpty).toList();
    if (_seenFor != userId) {
      _seenFor = userId;
      _seenUnread
        ..clear()
        ..addAll(ids);
      return;
    }
    final fresh = unread.where((n) => !_seenUnread.contains(n['_id']?.toString())).toList();
    _seenUnread.addAll(ids);
    if (fresh.isEmpty) return;
    // Newest first from the API — show the latest one.
    final n = fresh.first;
    PushService.instance.showInApp(
      id: n['_id']?.toString() ?? '',
      title: n['title']?.toString() ?? '',
      body: n['message']?.toString() ?? '',
      data: {
        'type': n['type']?.toString() ?? '',
        'relatedId': n['relatedId']?.toString() ?? '',
        'notificationId': n['_id']?.toString() ?? '',
      },
    );
  }

  Future<void> markRead(String notificationId) async {
    await _dio.put('/api/notifications/read/$notificationId');
  }

  Future<void> markAllRead(String userId) async {
    await _dio.put('/api/notifications/read-all/$userId');
  }

  Future<void> deleteNotification(String notificationId) async {
    await _dio.delete('/api/notifications/$notificationId');
  }

  Future<void> clearAll(String userId) async {
    await _dio.delete('/api/notifications/clear-all/$userId');
  }

  /// Registers the device's FCM token with the backend so the logged-in
  /// user receives push notifications. Mirrors the web app's saveFcmToken.
  Future<void> registerFcmToken(String token) async {
    await _dio.post('/api/notifications/fcm-token', data: {'token': token});
  }

  /// Removes this device's FCM token on logout so a shared device stops
  /// receiving the previous user's notifications.
  Future<void> unregisterFcmToken(String token) async {
    await _dio.delete('/api/notifications/fcm-token', data: {'token': token});
  }
}

import 'package:dio/dio.dart';
import 'api_client.dart';

class NotificationService {
  final Dio _dio = ApiClient.instance.dio;

  Future<Map<String, dynamic>> getNotifications(String userId, {int page = 1, int limit = 20}) async {
    final res = await _dio.get('/api/notifications/user/$userId', queryParameters: {
      'page': page,
      'limit': limit,
    });
    return Map<String, dynamic>.from(res.data as Map);
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

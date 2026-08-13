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
}

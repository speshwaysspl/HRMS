import 'package:dio/dio.dart';
import 'api_client.dart';

class FeedbackService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getMyFeedback() async {
    final res = await _dio.get('/api/feedback/my-feedback');
    final data = (res.data as Map)['data'] as Map;
    final list = data['feedbacks'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Admin: all feedback across the org, newest first.
  Future<List<Map<String, dynamic>>> getAllFeedback() async {
    final res = await _dio.get('/api/feedback/', queryParameters: {'limit': 200});
    final data = (res.data as Map)['data'] as Map? ?? {};
    final list = data['feedbacks'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Admin: respond to / update the status of a feedback item.
  Future<void> respond(String id, {String? status, String? adminResponse}) async {
    await _dio.put('/api/feedback/$id/status', data: {
      'status': ?status,
      if (adminResponse != null && adminResponse.isNotEmpty) 'adminResponse': adminResponse,
    });
  }

  Future<void> submit({
    required String title,
    required String category,
    required String description,
    String priority = 'Medium',
    bool isAnonymous = false,
    int? rating,
  }) async {
    await _dio.post('/api/feedback/', data: {
      'title': title,
      'category': category,
      'description': description,
      'priority': priority,
      'isAnonymous': isAnonymous,
      'rating': ?rating,
    });
  }
}

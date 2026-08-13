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
      if (rating != null) 'rating': rating,
    });
  }
}

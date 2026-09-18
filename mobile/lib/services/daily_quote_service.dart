import 'package:dio/dio.dart';
import 'api_client.dart';

class DailyQuoteService {
  final Dio _dio = ApiClient.instance.dio;

  Future<Map<String, dynamic>?> getCurrentQuote() async {
    try {
      final res = await _dio.get('/api/daily-quote');
      final data = res.data;
      if (data is Map && data['success'] == true && data['quote'] != null) {
        return Map<String, dynamic>.from(data['quote'] as Map);
      }
    } catch (_) {}
    return null;
  }

  Future<List<Map<String, dynamic>>> getHistory() async {
    final res = await _dio.get('/api/daily-quote/history');
    final list = (res.data as Map)['quotes'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Creates a quote from an image. [scheduledDate] optional (yyyy-MM-dd).
  Future<void> add({
    required String filePath,
    required String fileName,
    String? scheduledDate,
  }) async {
    final form = FormData.fromMap({
      'scheduledDate': ?scheduledDate,
      'image': await MultipartFile.fromFile(filePath, filename: fileName),
    });
    await _dio.post('/api/daily-quote/', data: form);
  }

  /// Re-publishes an existing quote as the current one.
  Future<void> activate(String id) async {
    await _dio.patch('/api/daily-quote/$id/activate');
  }

  Future<void> remove(String id) async {
    await _dio.delete('/api/daily-quote/$id');
  }
}

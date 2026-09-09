import 'package:dio/dio.dart';
import 'api_client.dart';

class EventService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getEvents() async {
    final res = await _dio.get('/api/events/');
    final list = (res.data as Map)['events'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Admin: [type] is 'holiday' | 'meeting' | 'event'. [date] is yyyy-MM-dd.
  Future<void> add({
    required String title,
    required String date,
    required String type,
    String description = '',
  }) async {
    await _dio.post('/api/events/add', data: {
      'title': title,
      'date': date,
      'type': type,
      'description': description,
    });
  }

  Future<void> update(
    String id, {
    required String title,
    required String date,
    required String type,
    String description = '',
  }) async {
    await _dio.put('/api/events/$id', data: {
      'title': title,
      'date': date,
      'type': type,
      'description': description,
    });
  }

  Future<void> remove(String id) async {
    await _dio.delete('/api/events/$id');
  }
}

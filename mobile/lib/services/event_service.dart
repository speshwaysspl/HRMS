import 'package:dio/dio.dart';
import 'api_client.dart';

class EventService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getEvents() async {
    final res = await _dio.get('/api/events/');
    final list = (res.data as Map)['events'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
}

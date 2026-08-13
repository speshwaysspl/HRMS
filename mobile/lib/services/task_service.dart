import 'package:dio/dio.dart';
import 'api_client.dart';

class TaskService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getTasks() async {
    final res = await _dio.get('/api/task/');
    final list = (res.data as Map)['tasks'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> updateStatus(String taskId, String status, {String? comments}) async {
    final form = FormData.fromMap({
      'status': status,
      if (comments != null) 'comments': comments,
    });
    await _dio.put('/api/task/$taskId', data: form);
  }
}

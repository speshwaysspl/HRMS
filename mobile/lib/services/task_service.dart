import 'package:dio/dio.dart';
import 'api_client.dart';

class TaskService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getTasks() async {
    final res = await _dio.get('/api/task/');
    final list = (res.data as Map)['tasks'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Team lead/admin: assign a task to one or more team members.
  Future<void> assignTask({
    required String teamId,
    required String title,
    required List<String> assignedTo,
    String description = '',
    String priority = 'Medium',
    String? startDate,
    String? deadline,
  }) async {
    await _dio.post('/api/task/assign', data: {
      'teamId': teamId,
      'title': title,
      'description': description,
      'priority': priority,
      'assignedTo': assignedTo,
      'startDate': ?startDate,
      'deadline': ?deadline,
    });
  }

  Future<void> updateStatus(String taskId, String status, {String? comments, String? remark, String? filePath}) async {
    final form = FormData.fromMap({
      'status': status,
      'comments': ?comments,
      'description': ?remark,
      if (filePath != null) 'file': await MultipartFile.fromFile(filePath),
    });
    await _dio.put('/api/task/$taskId', data: form);
  }
}

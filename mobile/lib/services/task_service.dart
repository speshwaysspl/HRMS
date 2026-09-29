import 'dart:convert';
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
    String? startDate,
    String? deadline,
    String? milestoneId,
    String? referencePath, // optional image/file showing what to do
  }) async {
    await _dio.post(
      '/api/task/assign',
      data: FormData.fromMap({
        'teamId': teamId,
        'title': title,
        'description': description,
        'assignedTo': jsonEncode(assignedTo),
        'startDate': ?startDate,
        'deadline': ?deadline,
        'milestoneId': ?milestoneId,
        if (referencePath != null)
          'file': await MultipartFile.fromFile(referencePath),
      }),
    );
  }

  Future<void> updateStatus(
    String taskId,
    String status, {
    String? comments,
    String? remark,
    int? rating,
    String? filePath,
    bool removeWorkProof = false,
  }) async {
    final form = FormData.fromMap({
      'status': status,
      if (removeWorkProof && filePath == null) 'removeWorkProof': 'true',
      'comments': ?comments,
      'remark': ?remark,
      'rating': ?rating,
      if (filePath != null) 'file': await MultipartFile.fromFile(filePath),
    });
    await _dio.put('/api/task/$taskId', data: form);
  }

  /// Team lead/admin: edit title, description and dates (YYYY-MM-DD).
  Future<void> editTask(
    String taskId, {
    required String title,
    required String description,
    String? startDate,
    String? deadline,
    String? milestoneId, // '' clears it; null leaves it unchanged
  }) async {
    await _dio.put(
      '/api/task/$taskId/details',
      data: {
        'title': title,
        'description': description,
        'startDate': startDate ?? '',
        'deadline': deadline ?? '',
        'milestoneId': ?milestoneId,
      },
    );
  }

  /// Team lead/admin: soft-deletes the task.
  Future<void> deleteTask(String taskId) async {
    await _dio.delete('/api/task/$taskId');
  }
}

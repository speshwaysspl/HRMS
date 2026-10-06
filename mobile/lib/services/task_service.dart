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

  /// Which team a task belongs to and how the caller relates to it
  /// (for notification deep links): {teamId, teamName, isLead, isAdmin, isAssignee}.
  Future<Map<String, dynamic>> locate(String taskId) async {
    final res = await _dio.get('/api/task/$taskId/locate');
    return Map<String, dynamic>.from(res.data as Map);
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
    List<String> filePaths = const [], // work proofs to add
    List<String> removeWorkProofs = const [], // saved proof URLs to delete
  }) async {
    final form = FormData.fromMap({
      'status': status,
      if (removeWorkProofs.isNotEmpty) 'removeWorkProofs': jsonEncode(removeWorkProofs),
      'comments': ?comments,
      'remark': ?remark,
      'rating': ?rating,
    });
    for (final p in filePaths) {
      form.files.add(MapEntry('files', await MultipartFile.fromFile(p)));
    }
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

import 'package:dio/dio.dart';
import 'api_client.dart';

/// Team milestones (weekly goals that group tasks, like GitHub milestones).
class MilestoneService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> list(String teamId) async {
    final res = await _dio.get(
      '/api/milestone',
      queryParameters: {'teamId': teamId},
    );
    final list = (res.data as Map)['milestones'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> create({
    required String teamId,
    required String title,
    String description = '',
    String? startDate,
    String? dueDate,
  }) async {
    await _dio.post(
      '/api/milestone',
      data: {
        'teamId': teamId,
        'title': title,
        'description': description,
        'startDate': startDate ?? '',
        'dueDate': dueDate ?? '',
      },
    );
  }

  Future<void> update(
    String id, {
    required String title,
    String description = '',
    String? startDate,
    String? dueDate,
  }) async {
    await _dio.put(
      '/api/milestone/$id',
      data: {
        'title': title,
        'description': description,
        'startDate': startDate ?? '',
        'dueDate': dueDate ?? '',
      },
    );
  }

  /// 'open' or 'closed'.
  Future<void> setState(String id, String state) async {
    await _dio.put('/api/milestone/$id', data: {'state': state});
  }

  /// Tasks are kept; the server just unlinks them.
  Future<void> delete(String id) async {
    await _dio.delete('/api/milestone/$id');
  }
}

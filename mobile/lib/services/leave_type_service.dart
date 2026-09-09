import 'package:dio/dio.dart';
import 'api_client.dart';

class LeaveTypeService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getAll() async {
    final res = await _dio.get('/api/leave-types');
    final list = (res.data as Map)['leaveTypes'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> add({
    required String name,
    required int annualQuota,
    bool requiresApproval = true,
  }) async {
    await _dio.post('/api/leave-types', data: {
      'name': name,
      'annualQuota': annualQuota,
      'requiresApproval': requiresApproval,
    });
  }

  Future<void> update(
    String id, {
    required String name,
    required int annualQuota,
    required bool requiresApproval,
    required bool isActive,
  }) async {
    await _dio.put('/api/leave-types/$id', data: {
      'name': name,
      'annualQuota': annualQuota,
      'requiresApproval': requiresApproval,
      'isActive': isActive,
    });
  }

  Future<void> remove(String id) async {
    await _dio.delete('/api/leave-types/$id');
  }
}

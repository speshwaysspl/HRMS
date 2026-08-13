import 'package:dio/dio.dart';
import 'api_client.dart';

class LeaveService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getLeaves(String userId) async {
    final res = await _dio.get('/api/leave/$userId/employee');
    final list = (res.data as Map)['leaves'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> getLeaveTypes() async {
    final res = await _dio.get('/api/leave-types', queryParameters: {'activeOnly': 'true'});
    final list = (res.data as Map)['leaveTypes'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> getBalance() async {
    final res = await _dio.get('/api/leave/balance');
    final list = (res.data as Map)['balance'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> applyLeave({
    required String userId,
    required String leaveType,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    await _dio.post('/api/leave/add', data: {
      'userId': userId,
      'leaveType': leaveType,
      'startDate': startDate,
      'endDate': endDate,
      'reason': reason,
    });
  }
}

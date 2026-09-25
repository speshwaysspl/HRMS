import 'package:dio/dio.dart';
import 'api_client.dart';

class LeaveService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getLeaves(String userId) async {
    final res = await _dio.get('/api/leave/$userId/employee');
    final list = (res.data as Map)['leaves'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Admin/HR: every leave request across the org, newest first.
  Future<List<Map<String, dynamic>>> getAllLeaves() async {
    final res = await _dio.get('/api/leave/');
    final list = (res.data as Map)['leaves'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Admin/HR: approve or reject a leave request ('Approved' | 'Rejected').
  Future<void> setStatus(String leaveId, String status) async {
    await _dio.put('/api/leave/$leaveId', data: {'status': status});
  }

  /// Full detail of one leave request (employee + department populated).
  Future<Map<String, dynamic>> getLeaveDetail(String id) async {
    final res = await _dio.get('/api/leave/detail/$id');
    return Map<String, dynamic>.from((res.data as Map)['leave'] as Map);
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

  /// Withdraws the employee's own leave request (only while Pending).
  Future<void> cancelLeave(String leaveId) async {
    try {
      await _dio.delete('/api/leave/mine/$leaveId');
    } on DioException catch (e) {
      // Older server without /mine/:id — fall back to the original delete
      // route. The UI only offers this on the user's own Pending leaves.
      if (e.response?.statusCode != 404) rethrow;
      await _dio.delete('/api/leave/$leaveId');
    }
  }
}

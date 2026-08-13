import 'package:dio/dio.dart';
import 'api_client.dart';

class DashboardService {
  final Dio _dio = ApiClient.instance.dio;

  /// GET /api/dashboard/employee-stats -> { success, data: {...} }
  Future<Map<String, dynamic>> getEmployeeStats() async {
    final res = await _dio.get('/api/dashboard/employee-stats');
    final data = res.data as Map<String, dynamic>;
    return Map<String, dynamic>.from(data['data'] as Map);
  }

  /// GET /api/dashboard/summary -> org-wide summary (admin)
  Future<Map<String, dynamic>> getAdminSummary() async {
    final res = await _dio.get('/api/dashboard/summary');
    return Map<String, dynamic>.from(res.data as Map);
  }
}

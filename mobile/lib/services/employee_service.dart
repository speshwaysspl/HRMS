import 'package:dio/dio.dart';
import 'api_client.dart';

class EmployeeService {
  final Dio _dio = ApiClient.instance.dio;

  /// Admin/HR: the full employee directory. Each row has a populated
  /// `userId` (name, email, role) and `department` (dep_name).
  Future<List<Map<String, dynamic>>> getEmployees() async {
    final res = await _dio.get('/api/employee/');
    final list = (res.data as Map)['employees'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> getEmployee(String id) async {
    final res = await _dio.get('/api/employee/$id');
    return Map<String, dynamic>.from((res.data as Map)['employee'] as Map);
  }

  /// Creates a User + Employee. [role] is a list like ['employee'] or
  /// ['employee','team_lead'].
  Future<void> addEmployee(Map<String, dynamic> body) async {
    await _dio.post('/api/employee/add', data: body);
  }

  Future<void> updateEmployee(String id, Map<String, dynamic> body) async {
    await _dio.put('/api/employee/$id', data: body);
  }

  /// 'active' | 'inactive'
  Future<void> setStatus(String id, String status) async {
    await _dio.patch('/api/employee/$id/status', data: {'status': status});
  }

  Future<void> deleteEmployee(String id) async {
    await _dio.delete('/api/employee/$id');
  }
}

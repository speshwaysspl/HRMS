import 'package:dio/dio.dart';
import 'api_client.dart';

class DepartmentService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getDepartments() async {
    final res = await _dio.get('/api/department/');
    final list = (res.data as Map)['departments'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> add({required String name, String description = ''}) async {
    await _dio.post('/api/department/add', data: {
      'dep_name': name,
      'description': description,
    });
  }

  Future<void> update(String id, {required String name, String description = ''}) async {
    await _dio.put('/api/department/$id', data: {
      'dep_name': name,
      'description': description,
    });
  }

  Future<void> remove(String id) async {
    await _dio.delete('/api/department/$id');
  }
}

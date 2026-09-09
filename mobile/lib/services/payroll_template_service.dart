import 'package:dio/dio.dart';
import 'api_client.dart';

class PayrollTemplateService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getAll({String search = ''}) async {
    final res = await _dio.get('/api/payroll-template/all', queryParameters: {
      'limit': 200,
      if (search.isNotEmpty) 'search': search,
    });
    final list = (res.data as Map)['templates'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> getOne(String id) async {
    final res = await _dio.get('/api/payroll-template/$id');
    return Map<String, dynamic>.from((res.data as Map)['template'] as Map);
  }

  Future<void> setDefault(String id) async {
    await _dio.patch('/api/payroll-template/$id/set-default');
  }

  Future<void> remove(String id) async {
    await _dio.delete('/api/payroll-template/$id');
  }
}

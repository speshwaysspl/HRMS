import 'package:dio/dio.dart';
import 'api_client.dart';

class AttendanceService {
  final Dio _dio = ApiClient.instance.dio;

  Future<Map<String, dynamic>?> getToday() async {
    final res = await _dio.get('/api/attendance/today');
    if (res.data == null) return null;
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<Map<String, dynamic>>> getReport() async {
    final res = await _dio.get('/api/attendance/report');
    final list = res.data as List;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> getMonthly(String monthYYYYMM) async {
    final res = await _dio.get('/api/attendance/monthly', queryParameters: {'month': monthYYYYMM});
    final list = res.data as List;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> checkIn({
    required String date,
    required String inTime,
    String workMode = 'Office',
  }) async {
    final res = await _dio.post('/api/attendance', data: {
      'date': date,
      'inTime': inTime,
      'workMode': workMode,
      'breaks': [],
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> checkOut({
    required String date,
    required String outTime,
  }) async {
    final res = await _dio.post('/api/attendance', data: {
      'date': date,
      'outTime': outTime,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }
}

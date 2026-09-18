import 'package:dio/dio.dart';
import 'api_client.dart';
import 'location_service.dart';

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
    String workMode = 'office',
    LocationFix? location,
  }) async {
    final res = await _dio.post('/api/attendance', data: {
      'date': date,
      'inTime': inTime,
      'workMode': workMode,
      'breaks': [],
      if (location != null) 'inLocation': location.toJson(),
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> checkOut({
    required String date,
    required String outTime,
    // Any break left running gets closed out at check-out time before
    // saving — mirrors the web Attendance page.
    List<Map<String, dynamic>>? breaks,
    LocationFix? location,
  }) async {
    final res = await _dio.post('/api/attendance', data: {
      'date': date,
      'outTime': outTime,
      'breaks': ?breaks,
      if (location != null) 'outLocation': location.toJson(),
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Persists the current breaks list (used for Start Break / End Break).
  Future<Map<String, dynamic>> saveBreaks({
    required String date,
    required List<Map<String, dynamic>> breaks,
  }) async {
    final res = await _dio.post('/api/attendance', data: {
      'date': date,
      'breaks': breaks,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Fetches the employee's submitted regularization requests.
  Future<List<Map<String, dynamic>>> getMyRegularizations() async {
    final res = await _dio.get('/api/attendance-regularization/mine');
    final list = (res.data as Map)['regularizations'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Submits an attendance regularization request for missed punches or discrepancies.
  Future<void> requestRegularization({
    required String date,
    String? requestedInTime,
    String? requestedOutTime,
    required String reason,
  }) async {
    await _dio.post('/api/attendance-regularization', data: {
      'date': date,
      if (requestedInTime != null && requestedInTime.isNotEmpty) 'requestedInTime': requestedInTime,
      if (requestedOutTime != null && requestedOutTime.isNotEmpty) 'requestedOutTime': requestedOutTime,
      'reason': reason,
    });
  }
}

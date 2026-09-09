import 'package:dio/dio.dart';
import 'api_client.dart';

class AttendanceAdminService {
  final Dio _dio = ApiClient.instance.dio;

  /// Day-wise attendance for every employee on [date] (yyyy-MM-dd).
  /// Each row: { employeeId, name, designation, inTime, outTime, workMode,
  ///             status, isLate, shiftName }
  Future<List<Map<String, dynamic>>> getDayReport(String date) async {
    final res = await _dio.get('/api/attendance/admin/all', queryParameters: {'date': date});
    final list = res.data as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
}

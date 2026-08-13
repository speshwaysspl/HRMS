import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'api_client.dart';

class PayslipService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getHistory(String employeeCode) async {
    final res = await _dio.get('/api/payslip/history', queryParameters: {'employeeId': employeeCode});
    final list = (res.data as Map)['payslips'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Downloads the payslip PDF (auth header applied via ApiClient's
  /// interceptor) and saves it to the app's temp directory.
  Future<File> downloadPayslip(String salaryId) async {
    final response = await _dio.get<List<int>>(
      '/api/payslip/download/$salaryId',
      options: Options(responseType: ResponseType.bytes),
    );
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/payslip_$salaryId.pdf');
    await file.writeAsBytes(response.data!);
    return file;
  }
}

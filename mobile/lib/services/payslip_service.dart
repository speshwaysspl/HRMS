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

  /// Admin: every generated payslip across the org.
  Future<List<Map<String, dynamic>>> getAllHistory({int page = 1, int limit = 200}) async {
    final res = await _dio.get('/api/payslip/history', queryParameters: {'page': page, 'limit': limit});
    final list = (res.data as Map)['payslips'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Admin: employee master + default payroll template, used to prefill a payslip.
  Future<Map<String, dynamic>> getEmployeePayrollDetails(String employeeCode) async {
    final res = await _dio.get('/api/payslip/employee/$employeeCode');
    return Map<String, dynamic>.from((res.data as Map)['employee'] as Map);
  }

  /// Admin: generate + persist a payslip. [payload] carries name/earnings/
  /// deductions/month/year/workingdays/lopDays etc.
  Future<Map<String, dynamic>> generate(Map<String, dynamic> payload) async {
    final res = await _dio.post('/api/payslip/generate', data: payload);
    return Map<String, dynamic>.from(res.data as Map);
  }

  static const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /// "Payslip_Aug-2026_Ravi-Kumar_9617.pdf" — the name people see when the
  /// PDF is shared or saved. Same scheme as the server (payslipFileName in
  /// server/utils/pdfGenerator.js); ASCII letters/digits/-/_ only.
  static String fileNameFor(Map<String, dynamic> p) {
    String clean(Object? s) => (s == null || s.toString() == 'N/A' ? '' : s)
        .toString()
        .replaceAll(RegExp(r'[^A-Za-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    final m = (p['month'] ?? p['monthName'] ?? '').toString().trim();
    final asNum = int.tryParse(m);
    final idx = asNum != null
        ? asNum - 1
        : _months.indexWhere((x) => m.toLowerCase().startsWith(x.toLowerCase()));
    final month = idx >= 0 && idx < 12 ? _months[idx] : clean(m);
    final period = [month, clean(p['year'])].where((s) => s.isNotEmpty).join('-');
    final emp = p['employeeId'];
    final empNo = emp is Map ? emp['employeeId'] : (p['employeeCode'] ?? p['empId'] ?? emp);
    final name = p['name'] ?? (emp is Map ? emp['name'] : null);
    final parts = ['Payslip', period, clean(name), clean(empNo)].where((s) => s.isNotEmpty);
    return '${parts.join('_')}.pdf';
  }

  /// Downloads the payslip PDF (auth header applied via ApiClient's
  /// interceptor) and saves it to the app's temp directory under a readable
  /// name (see [fileNameFor]).
  Future<File> downloadPayslip(Map<String, dynamic> payslip) async {
    final salaryId = payslip['_id'].toString();
    final response = await _dio.get<List<int>>(
      '/api/payslip/download/$salaryId',
      options: Options(responseType: ResponseType.bytes),
    );
    // Own folder per payslip: two different payslips can never overwrite
    // each other even if their readable names were to match.
    final dir = await Directory('${(await getTemporaryDirectory()).path}/payslips/$salaryId')
        .create(recursive: true);
    final file = File('${dir.path}/${fileNameFor(payslip)}');
    await file.writeAsBytes(response.data!);
    return file;
  }
}

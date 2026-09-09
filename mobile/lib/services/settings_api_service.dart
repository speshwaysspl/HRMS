import 'package:dio/dio.dart';
import 'api_client.dart';

/// Server-side account/report settings (distinct from device-local AppSettings).
class SettingsApiService {
  final Dio _dio = ApiClient.instance.dio;

  Future<void> changePassword({
    required String userId,
    required String oldPassword,
    required String newPassword,
  }) async {
    await _dio.put('/api/setting/change-password', data: {
      'userId': userId,
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
  }

  /// Weekly summary email subscription for the current user.
  Future<bool> getWeeklySummary() async {
    final res = await _dio.get('/api/report-subscription/mine');
    final sub = (res.data as Map)['subscription'] as Map? ?? {};
    return sub['weeklySummaryEnabled'] != false;
  }

  Future<void> setWeeklySummary(bool enabled) async {
    await _dio.put('/api/report-subscription/mine', data: {'weeklySummaryEnabled': enabled});
  }
}

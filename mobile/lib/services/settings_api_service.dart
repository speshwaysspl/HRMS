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
    await _dio.put(
      '/api/setting/change-password',
      data: {
        'userId': userId,
        'oldPassword': oldPassword,
        'newPassword': newPassword,
      },
    );
  }

  /// Admin: root password status + recent root logins.
  Future<Map<String, dynamic>> getRootPassword() async {
    final res = await _dio.get('/api/setting/root-password');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Admin: set or change the root password (confirmed with own password).
  Future<void> setRootPassword({
    required String adminPassword,
    required String newPassword,
  }) async {
    await _dio.put(
      '/api/setting/root-password',
      data: {'adminPassword': adminPassword, 'newPassword': newPassword},
    );
  }
}

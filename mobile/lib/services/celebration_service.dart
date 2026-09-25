import 'package:dio/dio.dart';
import 'api_client.dart';

/// Today's birthdays / work anniversaries and one-tap wishes.
/// Backend: server/routes/birthdayRoutes.js (/celebrations, /wish/:userId).
class CelebrationService {
  final Dio _dio = ApiClient.instance.dio;

  /// Returns birthdays and anniversaries merged, each tagged with `kind`.
  Future<List<Map<String, dynamic>>> getToday() async {
    final res = await _dio.get('/api/birthdays/celebrations');
    final data = Map<String, dynamic>.from(res.data as Map);
    List<Map<String, dynamic>> tag(String key, String kind) => ((data[key] as List?) ?? [])
        .map((e) => {...Map<String, dynamic>.from(e as Map), 'kind': kind})
        .toList();
    return [...tag('birthdays', 'birthday'), ...tag('anniversaries', 'anniversary')];
  }

  Future<void> wish(String userId, String kind) async {
    await _dio.post('/api/birthdays/wish/$userId', data: {'kind': kind});
  }
}

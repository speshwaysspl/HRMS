import 'package:dio/dio.dart';
import 'api_client.dart';

class AnnouncementService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getAnnouncements() async {
    final res = await _dio.get('/api/announcement/');
    final list = (res.data as Map)['announcements'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> getAnnouncement(String id) async {
    final res = await _dio.get('/api/announcement/$id');
    return Map<String, dynamic>.from((res.data as Map)['announcement'] as Map);
  }

  /// Admin/HR: post a new announcement to everyone (no image).
  /// [scheduledAt] (optional, future) holds it back until that time; the server
  /// then publishes it and sends notifications/emails.
  Future<void> createAnnouncement({
    required String title,
    required String description,
    DateTime? scheduledAt,
  }) async {
    await _dio.post(
      '/api/announcement/',
      data: {
        'title': title,
        'description': description,
        'scope': 'all',
        if (scheduledAt != null)
          'scheduledAt': scheduledAt.toUtc().toIso8601String(),
      },
    );
  }

  Future<void> updateAnnouncement(
    String id, {
    required String title,
    required String description,
  }) async {
    await _dio.put(
      '/api/announcement/$id',
      data: {'title': title, 'description': description, 'scope': 'all'},
    );
  }

  Future<void> deleteAnnouncement(String id) async {
    await _dio.delete('/api/announcement/$id');
  }

  /// Deletes many at once; returns how many were skipped (posted by others).
  Future<int> deleteAnnouncements(List<String> ids) async {
    final res = await _dio.post(
      '/api/announcement/bulk-delete',
      data: {'ids': ids},
    );
    return (res.data['skipped'] as num?)?.toInt() ?? 0;
  }
}

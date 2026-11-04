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
    String category = 'important',
    bool pinned = false,
    DateTime? expiresAt,
  }) async {
    await _dio.post(
      '/api/announcement/',
      data: {
        'title': title,
        'description': description,
        'scope': 'all',
        'category': category,
        'pinned': pinned,
        if (expiresAt != null) 'expiresAt': expiresAt.toUtc().toIso8601String(),
        if (scheduledAt != null)
          'scheduledAt': scheduledAt.toUtc().toIso8601String(),
      },
    );
  }

  Future<void> updateAnnouncement(
    String id, {
    required String title,
    required String description,
    String? category,
    bool? pinned,
    DateTime? expiresAt,
    bool clearExpiry = false,
  }) async {
    await _dio.put(
      '/api/announcement/$id',
      data: {
        'title': title,
        'description': description,
        'scope': 'all',
        'category': ?category,
        'pinned': ?pinned,
        if (expiresAt != null) 'expiresAt': expiresAt.toUtc().toIso8601String() else if (clearExpiry) 'expiresAt': '',
      },
    );
  }

  /// Counts toward the admin's "seen by N" — call when an employee opens one.
  Future<void> markSeen(String id) async {
    try {
      await _dio.post('/api/announcement/$id/seen');
    } catch (_) {}
  }

  /// Admin/HR: { seen: [...], notSeen: [...] } — each {name, email}.
  Future<Map<String, dynamic>> seenBy(String id) async {
    final res = await _dio.get('/api/announcement/$id/seen');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Admin/HR: pin / unpin without editing.
  Future<bool> setPinned(String id, bool pinned) async {
    final res = await _dio.patch('/api/announcement/$id/pin', data: {'pinned': pinned});
    return (res.data as Map)['pinned'] == true;
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

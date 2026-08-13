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
}

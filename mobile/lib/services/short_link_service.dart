import 'package:dio/dio.dart';
import 'api_client.dart';

/// Admin/HR short links (`/api/links`). The server restricts targets to
/// Speshway domains and enforces roles; this is only a client.
class ShortLinkService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> list({String? query}) async {
    final res = await _dio.get('/api/links', queryParameters: {
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
    });
    final list = (res.data as Map)['links'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> create({
    required String url,
    String? title,
    String? alias,
    int expiresInDays = 90,
  }) async {
    final res = await _dio.post('/api/links', data: {
      'url': url,
      if (title != null && title.isNotEmpty) 'title': title,
      if (alias != null && alias.isNotEmpty) 'alias': alias,
      'expiresInDays': expiresInDays,
    });
    return Map<String, dynamic>.from((res.data as Map)['link'] as Map);
  }

  Future<Map<String, dynamic>> setActive(String id, bool active) async {
    final res = await _dio.patch('/api/links/$id', data: {'active': active});
    return Map<String, dynamic>.from((res.data as Map)['link'] as Map);
  }

  Future<void> remove(String id) async {
    await _dio.delete('/api/links/$id');
  }
}

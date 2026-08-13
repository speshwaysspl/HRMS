import 'package:dio/dio.dart';
import 'api_client.dart';

class DocumentService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getDocuments() async {
    final res = await _dio.get('/api/document/');
    final list = (res.data as Map)['documents'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> upload({
    required String filePath,
    required String fileName,
    required String documentType,
    String? expiryDate,
  }) async {
    final form = FormData.fromMap({
      'documentType': documentType,
      if (expiryDate != null) 'expiryDate': expiryDate,
      'file': await MultipartFile.fromFile(filePath, filename: fileName),
    });
    await _dio.post('/api/document/upload', data: form);
  }
}

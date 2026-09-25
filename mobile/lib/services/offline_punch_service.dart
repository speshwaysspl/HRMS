import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';

/// Keeps a check-in / check-out made without internet and sends it later,
/// carrying the time it was actually made (`offlineDate` / `offlineTime`).
/// The server accepts it only for the same day. Mirrors the web
/// Attendance page's `offlinePunch` localStorage queue.
class OfflinePunchService {
  OfflinePunchService._();
  static const _key = 'offline_punch';

  /// True when the error means "no connection" rather than a server reply.
  static bool isOfflineError(Object e) =>
      e is DioException &&
      e.response == null &&
      (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.unknown);

  static Future<void> save(Map<String, dynamic> payload, {required String date, required String time}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode({...payload, 'offlineDate': date, 'offlineTime': time}));
  }

  static Future<Map<String, dynamic>?> pending() async {
    final raw = (await SharedPreferences.getInstance()).getString(_key);
    return raw == null ? null : Map<String, dynamic>.from(jsonDecode(raw) as Map);
  }

  /// Sends the queued punch. Returns null when nothing was queued or it's
  /// still offline, 'synced' on success, or the server's error message when
  /// it was rejected (the punch is then dropped).
  static Future<String?> flush() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return null;
    try {
      await ApiClient.instance.dio.post('/api/attendance', data: jsonDecode(raw));
      await prefs.remove(_key);
      return 'synced';
    } catch (e) {
      if (isOfflineError(e)) return null;
      await prefs.remove(_key);
      final data = e is DioException ? e.response?.data : null;
      return (data is Map ? data['message']?.toString() : null) ?? "Offline punch couldn't be saved.";
    }
  }
}

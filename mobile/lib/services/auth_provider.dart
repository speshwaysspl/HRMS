import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/user.dart';
import 'api_client.dart';
import 'location_service.dart';
import 'push_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  /// Post-login permission prompts, one after another (Android only shows a
  /// single system dialog at a time): notifications first, then location.
  Future<void> _askPermissions() async {
    await PushService.instance.registerForUser();
    await LocationService.requestPermissionOnLaunch();
  }

  final _api = ApiClient.instance;

  AuthStatus status = AuthStatus.unknown;
  AppUser? user;
  String? lastError;
  Object? lastErrorRaw;

  Future<void> restoreSession() async {
    final token = await _api.readToken();
    final userJson = await _api.readUserJson();
    if (token != null && userJson != null) {
      try {
        user = AppUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
        status = AuthStatus.authenticated;
        unawaited(_askPermissions());
      } catch (_) {
        status = AuthStatus.unauthenticated;
      }
    } else {
      status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    lastError = null;
    lastErrorRaw = null;
    try {
      final response = await _api.dio.post(
        '/api/auth/login',
        data: {'email': email, 'password': password},
      );
      final data = response.data as Map<String, dynamic>;
      if (data['success'] == true) {
        final token = data['token']?.toString() ?? '';
        final userMap = data['user'] as Map<String, dynamic>;
        await _api.saveSession(token: token, userJson: jsonEncode(userMap));
        user = AppUser.fromJson(userMap);
        status = AuthStatus.authenticated;
        notifyListeners();
        unawaited(_askPermissions());
        return true;
      }
      lastError = data['error']?.toString() ?? 'Login failed';
      return false;
    } catch (e) {
      lastError = extractErrorMessage(e);
      lastErrorRaw = e;
      return false;
    }
  }

  Future<void> logout() async {
    await PushService.instance.unregisterForUser();
    await _api.clearSession();
    user = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}

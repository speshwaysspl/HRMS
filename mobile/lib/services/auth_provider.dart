import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/user.dart';
import 'api_client.dart';
import 'push_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
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
        unawaited(PushService.instance.registerForUser());
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
        unawaited(PushService.instance.registerForUser());
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

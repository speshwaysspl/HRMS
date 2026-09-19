import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Device-local user preferences (not synced to the backend).
///
///  • App Lock       — default OFF. When ON, the app asks for the device
///                     biometrics / PIN / passcode on launch and on resume.
///  • Notifications   — default ON. When OFF, the FCM token is removed from the
///                     backend so no push notifications are delivered.
class AppSettings {
  AppSettings._();

  static const _kAppLock = 'app_lock_enabled';
  static const _kNotifications = 'notifications_enabled';
  static const _kDarkMode = 'dark_mode_enabled';

  static final ValueNotifier<bool> appLockEnabled = ValueNotifier<bool>(false);
  static final ValueNotifier<bool> notificationsEnabled =
      ValueNotifier<bool>(true);

  static final ValueNotifier<bool> darkMode = ValueNotifier<bool>(false);

  static SharedPreferences? _prefs;

  static Future<void> init() async {
    try {
      _prefs = await SharedPreferences.getInstance();
      appLockEnabled.value = _prefs?.getBool(_kAppLock) ?? false;
      notificationsEnabled.value = _prefs?.getBool(_kNotifications) ?? true;
      darkMode.value = _prefs?.getBool(_kDarkMode) ?? false;
    } catch (e) {
      debugPrint('AppSettings.init failed: $e');
    }
  }

  static Future<void> setAppLock(bool value) async {
    appLockEnabled.value = value;
    await _prefs?.setBool(_kAppLock, value);
  }

  static Future<void> setNotifications(bool value) async {
    notificationsEnabled.value = value;
    await _prefs?.setBool(_kNotifications, value);
  }

  static Future<void> setDarkMode(bool value) async {
    darkMode.value = value;
    await _prefs?.setBool(_kDarkMode, value);
  }
}

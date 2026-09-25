import 'package:flutter/material.dart';
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
  static const _kThemeMode = 'theme_mode';

  static final ValueNotifier<bool> appLockEnabled = ValueNotifier<bool>(false);
  static final ValueNotifier<bool> notificationsEnabled =
      ValueNotifier<bool>(true);

  /// Appearance: follows the phone's setting by default (also after login).
  static final ValueNotifier<ThemeMode> themeMode = ValueNotifier<ThemeMode>(ThemeMode.system);

  static SharedPreferences? _prefs;

  static Future<void> init() async {
    try {
      _prefs = await SharedPreferences.getInstance();
      appLockEnabled.value = _prefs?.getBool(_kAppLock) ?? false;
      // Push is always on now (the Settings toggle was removed); drop any
      // old "off" choice so this device registers its token again.
      notificationsEnabled.value = true;
      await _prefs?.remove(_kNotifications);
      themeMode.value = switch (_prefs?.getString(_kThemeMode)) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      };
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

  static Future<void> setThemeMode(ThemeMode mode) async {
    themeMode.value = mode;
    await _prefs?.setString(_kThemeMode, mode.name);
  }
}

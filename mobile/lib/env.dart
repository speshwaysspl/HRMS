import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb, kReleaseMode;

/// Central place for environment configuration (API base URL, etc).
///
/// ───────────────────────────────────────────────────────────────────────
///  HOW TO SWITCH ENVIRONMENT
/// ───────────────────────────────────────────────────────────────────────
///  1. Quick toggle for local work — flip [devUsesProduction] below.
///
///  2. Per build/run, without editing code, pass a dart-define:
///        flutter run   --dart-define=ENV=production
///        flutter run   --dart-define=ENV=development
///        flutter build appbundle --dart-define=ENV=production   (default)
///
///  3. Point at any URL (e.g. a physical device on your LAN, a staging box):
///        flutter run --dart-define=API_BASE_URL=http://192.168.1.20:5001
///
///  Priority:  API_BASE_URL  >  ENV  >  release/debug default
///
///  Defaults with no flags:
///     • release build  → production
///     • debug build    → development ([devUsesProduction] can override)
/// ───────────────────────────────────────────────────────────────────────
enum Environment { development, production }

class Env {
  Env._();

  /// Set to `true` to make DEBUG builds hit production too (handy for testing
  /// live data on the simulator without passing a flag). Ignored by release
  /// builds (always production) and when an ENV / API_BASE_URL define is set.
  static const bool devUsesProduction = true;

  // ── Base URLs ──────────────────────────────────────────────────────────
  static const String productionBaseUrl = 'https://backend.speshwayhrms.com';

  /// Local backend. Android emulator reaches the host machine via the
  /// 10.0.2.2 alias; iOS simulator and desktop share the host network.
  /// A physical device needs an explicit --dart-define=API_BASE_URL=…
  static String get developmentBaseUrl => (!kIsWeb && Platform.isAndroid)
      ? 'http://10.0.2.2:5001'
      : 'http://localhost:5001';

  // ── Resolution ────────────────────────────────────────────────────────
  static const String _envOverride = String.fromEnvironment('ENV');
  static const String _urlOverride = String.fromEnvironment('API_BASE_URL');

  static Environment get current {
    switch (_envOverride.toLowerCase()) {
      case 'production':
      case 'prod':
        return Environment.production;
      case 'development':
      case 'dev':
        return Environment.development;
    }
    if (kReleaseMode) return Environment.production;
    return devUsesProduction ? Environment.production : Environment.development;
  }

  static bool get isProduction => current == Environment.production;

  /// The API base URL the app should use.
  static String get apiBaseUrl {
    if (_urlOverride.isNotEmpty) return _urlOverride;
    return isProduction ? productionBaseUrl : developmentBaseUrl;
  }
}

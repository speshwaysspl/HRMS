import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

/// Thin wrapper around local_auth for the App Lock feature.
class AppLockService {
  AppLockService._();
  static final AppLockService instance = AppLockService._();

  final LocalAuthentication _auth = LocalAuthentication();

  /// Whether the device can authenticate at all (enrolled biometrics OR a
  /// device PIN / pattern / passcode). Used to gate enabling App Lock.
  Future<bool> canAuthenticate() async {
    try {
      return await _auth.isDeviceSupported();
    } on PlatformException catch (e) {
      debugPrint('AppLock canAuthenticate error: $e');
      return false;
    }
  }

  /// Prompts the device auth sheet. Returns true only on a verified unlock.
  Future<bool> authenticate({String reason = 'Unlock Speshway HRMS'}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          // Allow falling back to device PIN / passcode, not biometrics only.
          biometricOnly: false,
        ),
      );
    } on PlatformException catch (e) {
      debugPrint('AppLock authenticate error: $e');
      return false;
    }
  }
}

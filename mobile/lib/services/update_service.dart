import 'package:flutter/foundation.dart';
import 'package:in_app_update/in_app_update.dart';

/// Play Store in-app update check. On app open, if Play has a newer version
/// of this app, shows Google Play's own "Update available" screen; otherwise
/// does nothing. Only works for installs from the Play Store — sideloaded
/// APKs / debug builds just get an error, which is ignored.
class UpdateService {
  UpdateService._();

  static bool _checked = false;

  static Future<void> checkForUpdate() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android || _checked) return;
    _checked = true;
    try {
      final info = await InAppUpdate.checkForUpdate();
      if (info.updateAvailability != UpdateAvailability.updateAvailable) return;
      if (info.immediateUpdateAllowed) {
        // Full-screen Play update flow; if the user backs out, the app
        // continues normally and asks again on the next launch.
        await InAppUpdate.performImmediateUpdate();
      } else if (info.flexibleUpdateAllowed) {
        final result = await InAppUpdate.startFlexibleUpdate();
        if (result == AppUpdateResult.success) {
          await InAppUpdate.completeFlexibleUpdate();
        }
      }
    } catch (e) {
      debugPrint('In-app update check skipped: $e');
    }
  }
}

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:in_app_update/in_app_update.dart';
import 'push_service.dart';
import '../theme/app_theme.dart';

/// Play Store in-app update check. On app open, if Play has a newer version
/// of this app, shows our own branded "Update available" sheet; "Update now"
/// then hands off to Google Play's update flow. Only works for installs from
/// the Play Store — sideloaded APKs / debug builds just get an error, which
/// is ignored.
class UpdateService {
  UpdateService._();

  static bool _checked = false;

  static Future<void> checkForUpdate() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android || _checked) return;
    _checked = true;
    try {
      final info = await InAppUpdate.checkForUpdate();
      if (info.updateAvailability != UpdateAvailability.updateAvailable) return;
      if (!info.immediateUpdateAllowed && !info.flexibleUpdateAllowed) return;
      final context = appNavigatorKey.currentContext;
      if (context == null || !context.mounted) return;
      final update = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => const _UpdateSheet(),
      );
      if (update != true) return; // "Later": ask again on next launch.
      await _startUpdate(info);
    } catch (e) {
      debugPrint('In-app update check skipped: $e');
    }
  }

  static Future<void> _startUpdate(AppUpdateInfo info) async {
    if (info.immediateUpdateAllowed) {
      await InAppUpdate.performImmediateUpdate();
      return;
    }
    final messenger = appNavigatorKey.currentContext == null
        ? null
        : ScaffoldMessenger.maybeOf(appNavigatorKey.currentContext!);
    messenger?.showSnackBar(
      const SnackBar(content: Text('Downloading update in the background...')),
    );
    final result = await InAppUpdate.startFlexibleUpdate();
    if (result == AppUpdateResult.success) {
      await InAppUpdate.completeFlexibleUpdate();
    }
  }
}

class _UpdateSheet extends StatelessWidget {
  const _UpdateSheet();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.panel),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.asset('assets/logo.png', width: 64, height: 64),
            ),
            const SizedBox(height: 20),
            Text(
              'A new version is available',
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Update Speshway HRMS to get the latest features, fixes and '
              'security improvements. It only takes a moment.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.inkMuted,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton.icon(
                onPressed: () => Navigator.pop(context, true),
                icon: const Icon(Icons.system_update_alt_rounded),
                label: const Text('Update now'),
              ),
            ),
            const SizedBox(height: 4),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Later'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

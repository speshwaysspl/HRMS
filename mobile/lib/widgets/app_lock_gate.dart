import 'dart:async';

import 'package:flutter/material.dart';

import '../services/app_lock_service.dart';
import '../services/app_settings.dart';
import '../theme/app_theme.dart';

/// Wraps the whole app. When App Lock is enabled it covers the UI with an
/// opaque lock screen until the device auth (biometrics / PIN / passcode)
/// succeeds — on cold start and every time the app returns from background.
class AppLockGate extends StatefulWidget {
  final Widget child;
  const AppLockGate({super.key, required this.child});

  /// True while the lock screen covers the app. The splash waits on this so
  /// its animation plays after unlock instead of hidden behind the lock.
  static final ValueNotifier<bool> isLocked = ValueNotifier<bool>(false);

  static _AppLockGateState? _state;

  /// Called by the splash after its animation: if App Lock is on, shows the
  /// lock screen + device auth and completes once the user has unlocked.
  static Future<void> unlockAfterSplash() => _state?._lockAndWait() ?? Future.value();

  @override
  State<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends State<AppLockGate> with WidgetsBindingObserver {
  bool _locked = false;
  bool _authInProgress = false;
  DateTime? _pausedAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Cold start: don't lock yet — the splash plays first and then calls
    // [AppLockGate.unlockAfterSplash], which shows the lock + device auth.
    _locked = false;
    AppLockGate.isLocked.value = false;
    AppLockGate._state = this;
    AppSettings.appLockEnabled.addListener(_onSettingChanged);
  }

  /// Locks and prompts for device auth; completes once unlocked.
  Future<void> _lockAndWait() async {
    if (!AppSettings.appLockEnabled.value) return;
    setState(() => _locked = true);
    final done = Completer<void>();
    void listener() {
      if (!AppLockGate.isLocked.value && !done.isCompleted) done.complete();
    }
    AppLockGate.isLocked.addListener(listener);
    _promptUnlock();
    await done.future;
    AppLockGate.isLocked.removeListener(listener);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    AppSettings.appLockEnabled.removeListener(_onSettingChanged);
    if (AppLockGate._state == this) AppLockGate._state = null;
    super.dispose();
  }

  void _onSettingChanged() {
    // Turning the setting off unlocks immediately; turning it on does not
    // lock the current foreground session (it takes effect next resume).
    if (!AppSettings.appLockEnabled.value && _locked) {
      setState(() => _locked = false);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!AppSettings.appLockEnabled.value) return;

    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      _pausedAt = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      // Re-lock only after a real trip to the background (a brief inactive
      // flash — e.g. the auth sheet itself — should not re-lock).
      final wasBackgrounded = _pausedAt != null &&
          DateTime.now().difference(_pausedAt!) > const Duration(seconds: 1);
      _pausedAt = null;
      if (wasBackgrounded && !_locked) {
        setState(() => _locked = true);
        _promptUnlock();
      } else if (_locked && !_authInProgress) {
        _promptUnlock();
      }
    }
  }

  Future<void> _promptUnlock() async {
    if (_authInProgress) return;
    _authInProgress = true;
    final ok = await AppLockService.instance.authenticate();
    _authInProgress = false;
    if (!mounted) return;
    if (ok) setState(() => _locked = false);
  }

  @override
  void setState(VoidCallback fn) {
    super.setState(fn);
    AppLockGate.isLocked.value = _locked;
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_locked)
          Positioned.fill(
            child: _LockScreen(onUnlock: _promptUnlock),
          ),
      ],
    );
  }
}

class _LockScreen extends StatelessWidget {
  final VoidCallback onUnlock;
  const _LockScreen({required this.onUnlock});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.brand900,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 84,
              height: 84,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22)),
              child: Image.asset('assets/logo.png', fit: BoxFit.contain),
            ),
            const SizedBox(height: 28),
            const Icon(Icons.lock_outline, color: Colors.white, size: 36),
            const SizedBox(height: 12),
            const Text(
              'Speshway HRMS is locked',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            const Text(
              'Authenticate to continue',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: 200,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: onUnlock,
                icon: const Icon(Icons.fingerprint, size: 20),
                label: const Text('Unlock'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(200, 48),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

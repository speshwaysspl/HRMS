import 'package:flutter/foundation.dart';

/// Lightweight cross-screen signal bus. Screens that mutate shared data
/// (attendance, leave, etc.) bump the relevant notifier; screens that show
/// derived data (the Home dashboard) listen and refresh.
///
/// Kept dead simple on purpose — a ValueNotifier tick, no payload. Listeners
/// just re-fetch when it changes.
class AppEvents {
  AppEvents._();

  /// Fired after a successful attendance check-in / check-out.
  static final ValueNotifier<int> attendanceChanged = ValueNotifier<int>(0);

  /// Fired after a leave request is applied.
  static final ValueNotifier<int> leaveChanged = ValueNotifier<int>(0);

  /// Fired when an action requests changing the bottom navigation tab.
  static final ValueNotifier<int?> tabSwitch = ValueNotifier<int?>(null);

  static void bumpAttendance() => attendanceChanged.value++;
  static void bumpLeave() => leaveChanged.value++;
  static void switchToTab(int index) => tabSwitch.value = index;
}

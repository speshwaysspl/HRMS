import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:quick_actions/quick_actions.dart';

import '../screens/employee/announcements_screen.dart';
import '../screens/employee/attendance_screen.dart';
import '../screens/employee/leaves_screen.dart';
import '../screens/employee/payslips_screen.dart';
import 'auth_provider.dart';
import 'dashboard_service.dart';
import 'push_service.dart' show appNavigatorKey;

/// Launcher long-press shortcuts: Leaves, Attendance, Payslips, Announcements.
/// A tap before login is remembered and opened once the app shell is up.
class QuickActionsService {
  QuickActionsService._();

  static String? _pending;

  static Future<void> init() async {
    if (kIsWeb) return;
    const qa = QuickActions();
    await qa.initialize((type) {
      _pending = type;
      consumePending();
    });
    await qa.setShortcutItems(const [
      ShortcutItem(type: 'leaves', localizedTitle: 'Leaves', icon: 'ic_launcher'),
      ShortcutItem(type: 'attendance', localizedTitle: 'Attendance', icon: 'ic_launcher'),
      ShortcutItem(type: 'payslips', localizedTitle: 'Payslips', icon: 'ic_launcher'),
      ShortcutItem(type: 'announcements', localizedTitle: 'Announcements', icon: 'ic_launcher'),
    ]);
  }

  /// Opens the pending shortcut if the user is signed in (called by AppShell).
  static Future<void> consumePending() async {
    final type = _pending;
    final nav = appNavigatorKey.currentState;
    final ctx = appNavigatorKey.currentContext;
    if (type == null || nav == null || ctx == null) return;
    final user = Provider.of<AuthProvider>(ctx, listen: false).user;
    if (user == null || user.isAdmin) return;
    _pending = null;

    WidgetBuilder? builder;
    switch (type) {
      case 'leaves':
        builder = (_) => const LeavesScreen();
      case 'attendance':
        builder = (_) => const AttendanceScreen();
      case 'announcements':
        builder = (_) => const AnnouncementsScreen();
      case 'payslips':
        try {
          final stats = await DashboardService().getEmployeeStats();
          final code = (stats['employee'] as Map?)?['employeeId']?.toString();
          if (code == null) return;
          builder = (_) => PayslipsScreen(employeeCode: code);
        } catch (_) {
          return;
        }
    }
    if (builder == null) return;
    nav.popUntil((r) => r.isFirst);
    nav.push(MaterialPageRoute(builder: builder));
  }
}

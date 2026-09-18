import 'package:flutter/foundation.dart';

/// Simple in-memory, per-session stale-while-revalidate cache for one piece
/// of fetched data. Screens read [data] to render immediately (skipping the
/// loading skeleton) while kicking off a silent background refetch that
/// calls [set] on success, which notifies listeners and rebuilds.
///
/// Intentionally minimal — no persistence, no generic repository framework.
/// One instance per domain (attendance, leaves, tasks, ...), held by
/// [DataCaches] and provided via MultiProvider in main.dart.
class DataCache<T> extends ChangeNotifier {
  T? data;
  DateTime? fetchedAt;

  bool get hasData => data != null;

  bool isStale({Duration maxAge = const Duration(minutes: 2)}) {
    final at = fetchedAt;
    if (at == null) return true;
    return DateTime.now().difference(at) > maxAge;
  }

  void set(T value) {
    data = value;
    fetchedAt = DateTime.now();
    notifyListeners();
  }

  void clear() {
    data = null;
    fetchedAt = null;
    notifyListeners();
  }
}

/// Registry of the specific caches wired into the provider tree. Each field
/// is a distinct [DataCache] instance for one domain's "list"/"summary"
/// payload (kept as `dynamic`/`Map`/`List` — screens cast on read, same as
/// they already do with their service layer responses).
class DataCaches {
  final attendanceToday = DataCache<Map<String, dynamic>>();
  final attendanceMonthly = DataCache<List<Map<String, dynamic>>>();
  final leavesList = DataCache<List<Map<String, dynamic>>>();
  final tasksList = DataCache<List<Map<String, dynamic>>>();
  final payslipHistory = DataCache<List<Map<String, dynamic>>>();
  final employeeProfile = DataCache<Map<String, dynamic>>();
  final events = DataCache<List<Map<String, dynamic>>>();
}

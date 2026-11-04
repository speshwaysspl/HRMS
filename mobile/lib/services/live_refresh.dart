import 'dart:async';

import 'package:flutter/widgets.dart';

import 'app_events.dart';

/// Re-fetches a screen when the server reports a write to one of
/// [liveResources] (the `/api/<resource>` names, e.g. `leave`, `attendance`).
/// Bursts collapse into one [onLiveRefresh] call.
mixin LiveRefresh<T extends StatefulWidget> on State<T> {
  List<String> get liveResources;
  void onLiveRefresh();

  Timer? _liveTimer;
  DateTime _lastLive = DateTime.fromMillisecondsSinceEpoch(0);

  /// At most one live refetch per this gap, so a flood of signals can't make
  /// the screen reload every second. The last signal still runs (trailing).
  static const _minGap = Duration(seconds: 4);

  @override
  void initState() {
    super.initState();
    AppEvents.dataChanged.addListener(_onDataChanged);
  }

  void _onDataChanged() {
    final r = AppEvents.dataChanged.value?['resource'];
    // `*` = resync after a reconnect / app resume (see RealtimeService).
    if (r == null || (r != '*' && !liveResources.contains(r))) return;
    _liveTimer?.cancel();
    final sinceLast = DateTime.now().difference(_lastLive);
    var wait = _minGap - sinceLast;
    if (wait < const Duration(milliseconds: 600)) wait = const Duration(milliseconds: 600);
    _liveTimer = Timer(wait, () {
      if (!mounted) return;
      _lastLive = DateTime.now();
      onLiveRefresh();
    });
  }

  @override
  void dispose() {
    _liveTimer?.cancel();
    AppEvents.dataChanged.removeListener(_onDataChanged);
    super.dispose();
  }
}

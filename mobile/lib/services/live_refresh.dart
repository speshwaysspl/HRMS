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

  @override
  void initState() {
    super.initState();
    AppEvents.dataChanged.addListener(_onDataChanged);
  }

  void _onDataChanged() {
    final r = AppEvents.dataChanged.value?['resource'];
    if (r == null || !liveResources.contains(r)) return;
    _liveTimer?.cancel();
    _liveTimer = Timer(const Duration(milliseconds: 600), () {
      if (mounted) onLiveRefresh();
    });
  }

  @override
  void dispose() {
    _liveTimer?.cancel();
    AppEvents.dataChanged.removeListener(_onDataChanged);
    super.dispose();
  }
}

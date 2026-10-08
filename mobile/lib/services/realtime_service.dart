import 'package:flutter/widgets.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../env.dart';
import 'app_events.dart';

/// Socket.IO connection to the server (same one the web app uses). Joins the
/// user's room; the server also puts admins in `role_admin`. Incoming
/// `team:updated` hints are forwarded to [AppEvents.teamChanged] and screens
/// re-fetch through the normal REST endpoints.
class RealtimeService with WidgetsBindingObserver {
  RealtimeService._();
  static final RealtimeService instance = RealtimeService._();

  io.Socket? _socket;
  String? _userId;
  bool _observing = false;
  DateTime? _pausedAt;

  void connect(String userId) {
    if (userId.isEmpty || (_socket != null && _userId == userId)) return;
    disconnect();
    _userId = userId;
    if (!_observing) {
      WidgetsBinding.instance.addObserver(this);
      _observing = true;
    }
    final socket = io.io(
      Env.apiBaseUrl,
      io.OptionBuilder().setTransports(['websocket']).enableReconnection().disableAutoConnect().build(),
    );
    var connectedBefore = false;
    // Re-join after every (re)connect so rooms survive network drops; hints
    // sent while disconnected are lost, so refresh every open screen once.
    socket.onConnect((_) {
      socket.emit('join', userId);
      if (connectedBefore) resyncAll();
      connectedBefore = true;
    });
    socket.on('team:updated', (data) {
      if (data is Map) AppEvents.teamChanged.value = Map<String, dynamic>.from(data);
    });
    // A leave was approved/rejected (from the dashboard or HR's email): refresh leave screens.
    socket.on('newNotification', (data) {
      final type = data is Map ? data['type']?.toString() ?? '' : '';
      if (type == 'leave_approved' || type == 'leave_rejected') {
        AppEvents.leaveChanged.value++;
      }
    });
    // Generic live-refresh hint for every other screen (see LiveRefresh).
    socket.on('data:changed', (data) {
      if (data is Map) AppEvents.dataChanged.value = Map<String, dynamic>.from(data);
    });
    socket.onConnectError((e) => debugPrint('Realtime connect error: $e'));
    socket.connect();
    _socket = socket;
  }

  /// Tell every live screen to re-fetch: resource `*` (see LiveRefresh) and
  /// team kind `resync` (team screens).
  void resyncAll() {
    final at = DateTime.now().millisecondsSinceEpoch;
    AppEvents.dataChanged.value = {'resource': '*', 'at': at};
    AppEvents.teamChanged.value = {'kind': 'resync', 'at': at};
  }

  // The OS suspends the socket in the background, so anything that happened
  // meanwhile was missed: catch up on return.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_socket == null) return;
    if (state == AppLifecycleState.paused) {
      _pausedAt = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      if (_socket!.disconnected) _socket!.connect();
      final pausedAt = _pausedAt;
      _pausedAt = null;
      if (pausedAt != null && DateTime.now().difference(pausedAt) > const Duration(seconds: 5)) {
        resyncAll();
      }
    }
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    _userId = null;
  }
}

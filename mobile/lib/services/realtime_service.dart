import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../env.dart';
import 'app_events.dart';

/// Socket.IO connection to the server (same one the web app uses). Joins the
/// user's room; the server also puts admins in `role_admin`. Incoming
/// `team:updated` hints are forwarded to [AppEvents.teamChanged] and screens
/// re-fetch through the normal REST endpoints.
class RealtimeService {
  RealtimeService._();
  static final RealtimeService instance = RealtimeService._();

  io.Socket? _socket;
  String? _userId;

  void connect(String userId) {
    if (userId.isEmpty || (_socket != null && _userId == userId)) return;
    disconnect();
    _userId = userId;
    final socket = io.io(
      Env.apiBaseUrl,
      io.OptionBuilder().setTransports(['websocket']).enableReconnection().disableAutoConnect().build(),
    );
    // Re-join after every (re)connect so rooms survive network drops.
    socket.onConnect((_) => socket.emit('join', userId));
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
    socket.onConnectError((e) => debugPrint('Realtime connect error: $e'));
    socket.connect();
    _socket = socket;
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    _userId = null;
  }
}

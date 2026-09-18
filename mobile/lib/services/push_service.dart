import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../firebase_options.dart';
import '../screens/employee/notifications_screen.dart';
import 'app_settings.dart';
import 'notification_service.dart';

/// Channel id must match the one the backend puts in every FCM data payload
/// (see server/services/fcmService.js -> channel_id: 'general_channel_v4').
const _channelId = 'general_channel_v4';
const _channel = AndroidNotificationChannel(
  _channelId,
  'General',
  description: 'HRMS alerts — leave, tasks, announcements, documents',
  importance: Importance.high,
);

/// Navigator key so a tapped notification can push a route from anywhere.
final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

final FlutterLocalNotificationsPlugin _localNotifications =
    FlutterLocalNotificationsPlugin();

/// Runs in a separate isolate — must be a top-level function.
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  if (kIsWeb) return;
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await _showLocalNotification(message);
}

Future<void> _showLocalNotification(RemoteMessage message) async {
  // Backend sends data-only messages, so pull title/body out of data first.
  final data = message.data;
  final title = data['title'] ?? message.notification?.title ?? 'Speshway';
  final body = data['body'] ?? message.notification?.body ?? '';
  if (body.isEmpty && title == 'Speshway') return;

  await _localNotifications.show(
    message.hashCode,
    title,
    body,
    const NotificationDetails(
      android: AndroidNotificationDetails(
        _channelId,
        'General',
        channelDescription:
            'HRMS alerts — leave, tasks, announcements, documents',
        importance: Importance.high,
        priority: Priority.high,
      ),
      iOS: DarwinNotificationDetails(),
    ),
    payload: jsonEncode(data),
  );
}

/// Sets up Firebase + local notifications. Call once from main() before runApp.
class PushService {
  static final PushService instance = PushService._();
  PushService._();

  final _notificationService = NotificationService();
  bool _messageHandlersBound = false;
  String? _lastRegisteredToken;

  Future<void> initFirebase() async {
    if (kIsWeb) {
      debugPrint('Push notifications are skipped on Web.');
      return;
    }
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

    const androidInit =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    await _localNotifications.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload != null) {
          _handleOpen(jsonDecode(payload) as Map<String, dynamic>);
        }
      },
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);
  }

  /// Re-applies the user's Notifications preference: registers the token when
  /// notifications are on, removes it from the backend when off.
  Future<void> applyNotificationPreference() async {
    if (kIsWeb) return;
    if (AppSettings.notificationsEnabled.value) {
      await registerForUser();
    } else {
      await unregisterForUser();
    }
  }

  /// Called after login / on session restore. Requests permission, grabs the
  /// FCM token, registers it with the backend, and wires message listeners.
  Future<void> registerForUser() async {
    if (kIsWeb) return;
    if (!AppSettings.notificationsEnabled.value) {
      // User turned push off — make sure the backend has no token for us.
      await unregisterForUser();
      return;
    }
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      final token = await messaging.getToken();
      if (token != null && token != _lastRegisteredToken) {
        await _notificationService.registerFcmToken(token);
        _lastRegisteredToken = token;
      }

      messaging.onTokenRefresh.listen((newToken) async {
        try {
          await _notificationService.registerFcmToken(newToken);
          _lastRegisteredToken = newToken;
        } catch (e) {
          debugPrint('FCM token refresh registration failed: $e');
        }
      });

      if (!_messageHandlersBound) {
        _messageHandlersBound = true;

        FirebaseMessaging.onMessage.listen(_showLocalNotification);
        FirebaseMessaging.onMessageOpenedApp.listen(
          (m) => _handleOpen(m.data),
        );

        final initial = await messaging.getInitialMessage();
        if (initial != null) {
          _handleOpen(initial.data);
        }
      }
    } catch (e) {
      debugPrint('PushService.registerForUser failed: $e');
    }
  }

  /// Called on logout so this device stops receiving the previous user's pushes.
  Future<void> unregisterForUser() async {
    if (kIsWeb) return;
    try {
      final token = _lastRegisteredToken ??
          await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await _notificationService.unregisterFcmToken(token);
      }
      await FirebaseMessaging.instance.deleteToken();
      _lastRegisteredToken = null;
    } catch (e) {
      debugPrint('PushService.unregisterForUser failed: $e');
    }
  }

  void _handleOpen(Map<String, dynamic> data) {
    final nav = appNavigatorKey.currentState;
    if (nav == null) return;
    nav.push(
      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
    );
  }
}

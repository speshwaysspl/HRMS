import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/app_settings.dart';
import 'services/auth_provider.dart';
import 'services/data_cache.dart';
import 'services/location_service.dart';
import 'services/push_service.dart';
import 'services/quick_actions_service.dart';
import 'services/update_service.dart';
import 'screens/splash_screen.dart';
import 'theme/app_theme.dart';
import 'theme/responsive.dart';
import 'widgets/app_lock_gate.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppSettings.init();
  try {
    await PushService.instance.initFirebase();
  } catch (e) {
    debugPrint('Firebase init failed: $e');
  }
  await QuickActionsService.init();
  runApp(const SpeshwayApp());
}

/// Neutral colours are read straight from AppColors (not only via Theme), so
/// a light/dark flip rebuilds every element once the new theme is applied —
/// the whole app switches, not just the screen in front.
void rebuildEntireApp() {
  void rebuild(Element e) {
    e.markNeedsBuild();
    e.visitChildren(rebuild);
  }

  WidgetsBinding.instance.addPostFrameCallback(
      (_) => WidgetsBinding.instance.rootElement?.visitChildren(rebuild));
  WidgetsBinding.instance.scheduleFrame();
}

class SpeshwayApp extends StatefulWidget {
  const SpeshwayApp({super.key});

  @override
  State<SpeshwayApp> createState() => _SpeshwayAppState();
}

class _SpeshwayAppState extends State<SpeshwayApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    AppSettings.themeMode.addListener(rebuildEntireApp);
    // Once the first screen is up, ask Play Store whether a newer version exists.
    WidgetsBinding.instance.addPostFrameCallback((_) => UpdateService.checkForUpdate());
  }

  @override
  void dispose() {
    AppSettings.themeMode.removeListener(rebuildEntireApp);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  bool _wasBackgrounded = false;
  bool _checkingLocation = false;

  // Reopening the app (from background) re-checks location: asks for the
  // permission if missing, or shows the system prompt to turn location on. Only
  // after a real background trip, so the permission dialog's own
  // inactive→resumed doesn't re-trigger it.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _wasBackgrounded = true;
    } else if (state == AppLifecycleState.resumed && _wasBackgrounded) {
      _wasBackgrounded = false;
      _checkLocation();
    }
  }

  Future<void> _checkLocation() async {
    if (_checkingLocation) return;
    final ctx = appNavigatorKey.currentContext;
    if (ctx == null || ctx.read<AuthProvider>().user == null) return;
    _checkingLocation = true;
    await LocationService.promptIfUnavailable();
    _checkingLocation = false;
  }

  // Phone switched between light/dark while "System" is selected.
  @override
  void didChangePlatformBrightness() {
    if (AppSettings.themeMode.value == ThemeMode.system) {
      setState(() {});
      rebuildEntireApp();
    }
  }

  bool _isDark(ThemeMode mode) =>
      mode == ThemeMode.dark ||
      (mode == ThemeMode.system &&
          WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        Provider(create: (_) => DataCaches()),
      ],
      child: ValueListenableBuilder<ThemeMode>(
        valueListenable: AppSettings.themeMode,
        builder: (context, mode, _) => MaterialApp(
          title: 'Speshway',
          debugShowCheckedModeBanner: false,
          navigatorKey: appNavigatorKey,
          theme: AppTheme.build(dark: _isDark(mode)),
          scrollBehavior: const MaterialScrollBehavior().copyWith(scrollbars: false),
          builder: (context, child) =>
              clampTextScale(context, AppLockGate(child: child ?? const SizedBox.shrink())),
          home: const SplashScreen(),
        ),
      ),
    );
  }
}

/// Convenience accessor so screens can grab the shared [DataCaches] instance
/// without importing `provider` boilerplate at every call site:
/// `AppCaches.of(context).leavesList`.
class AppCaches {
  static DataCaches of(BuildContext context) => Provider.of<DataCaches>(context, listen: false);
}

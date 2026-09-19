import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/app_settings.dart';
import 'services/auth_provider.dart';
import 'services/data_cache.dart';
import 'services/push_service.dart';
import 'services/quick_actions_service.dart';
import 'screens/splash_screen.dart';
import 'theme/app_theme.dart';
import 'theme/responsive.dart';
import 'widgets/app_lock_gate.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppSettings.init();
  // Neutral colours are read straight from AppColors (not via Theme), so a
  // theme flip must rebuild every element once the new theme is applied.
  AppSettings.darkMode.addListener(() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      void rebuild(Element e) {
        e.markNeedsBuild();
        e.visitChildren(rebuild);
      }
      WidgetsBinding.instance.rootElement?.visitChildren(rebuild);
    });
    WidgetsBinding.instance.scheduleFrame();
  });
  try {
    await PushService.instance.initFirebase();
  } catch (e) {
    debugPrint('Firebase init failed: $e');
  }
  await QuickActionsService.init();
  runApp(const SpeshwayApp());
}

class SpeshwayApp extends StatelessWidget {
  const SpeshwayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        Provider(create: (_) => DataCaches()),
      ],
      child: ValueListenableBuilder<bool>(
        valueListenable: AppSettings.darkMode,
        builder: (context, dark, _) => MaterialApp(
        title: 'Speshway',
        debugShowCheckedModeBanner: false,
        navigatorKey: appNavigatorKey,
        theme: AppTheme.build(dark: dark),
        scrollBehavior: const MaterialScrollBehavior().copyWith(
          scrollbars: false,
        ),
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

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/app_settings.dart';
import 'services/auth_provider.dart';
import 'services/push_service.dart';
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
  runApp(const SpeshwayApp());
}

class SpeshwayApp extends StatelessWidget {
  const SpeshwayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: MaterialApp(
        title: 'Speshway',
        debugShowCheckedModeBanner: false,
        navigatorKey: appNavigatorKey,
        theme: AppTheme.light,
        builder: (context, child) =>
            clampTextScale(context, AppLockGate(child: child ?? const SizedBox.shrink())),
        home: const SplashScreen(),
      ),
    );
  }
}

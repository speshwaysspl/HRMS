import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_provider.dart';
import '../widgets/app_lock_gate.dart';
import 'login_screen.dart';
import 'shell/app_shell.dart';

/// Launch splash — one brand moment (~1.7 s), same choreography as nutri_hrms,
/// in the login's ink + green so splash → login reads as one surface:
///   1. a green ring draws itself around the logo,
///   2. the logo badge settles in with a soft spring,
///   3. a glow ripple pulses out once,
///   4. the wordmark wipes in, then the tagline rises.
/// The session restores in parallel; then Home (via App Lock) or Login.
/// Under reduce-motion the final frame shows immediately.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1700),
  );

  Animation<double> _seg(double begin, double end, [Curve curve = Curves.easeOutCubic]) =>
      CurvedAnimation(parent: _c, curve: Interval(begin, end, curve: curve));

  late final _ring = _seg(0.0, 0.45);
  late final _logoIn = _seg(0.12, 0.40);
  late final _logoScale = Tween(begin: 0.6, end: 1.0).animate(_seg(0.12, 0.62, Curves.easeOutBack));
  late final _ripple = _seg(0.40, 0.95, Curves.easeOutQuart);
  late final _wordmark = _seg(0.52, 0.82, Curves.easeOutQuart);
  late final _tagline = _seg(0.70, 1.0);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    precacheImage(const AssetImage('assets/logo.png'), context);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final auth = context.read<AuthProvider>();
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    Future<void> intro() async {
      if (reduceMotion) {
        _c.value = 1;
        return;
      }
      await _c.forward();
      await Future<void>.delayed(const Duration(milliseconds: 250));
    }

    // Animation and session restore run together.
    await Future.wait([auth.restoreSession(), intro()]);
    if (!mounted) return;
    // Signed in with App Lock on → device auth before revealing Home.
    if (auth.status == AuthStatus.authenticated) {
      await AppLockGate.unlockAfterSplash();
    }
    if (!mounted) return;
    final destination = auth.status == AuthStatus.authenticated ? const AppShell() : const LoginScreen();
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 500),
        pageBuilder: (context, animation, secondaryAnimation) =>
            FadeTransition(opacity: animation, child: destination),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const badge = 96.0;
    const ring = 132.0;
    return Scaffold(
      backgroundColor: AuthPalette.ink,
      body: Semantics(
        label: 'Speshway Solutions HRMS — Your workday starts here.',
        child: Container(
          decoration: AuthPalette.headerGlow,
          child: Center(
            child: ExcludeSemantics(
              child: AnimatedBuilder(
                animation: _c,
                builder: (context, _) => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: ring * 1.6,
                      height: ring * 1.6,
                      child: Stack(alignment: Alignment.center, children: [
                        CustomPaint(
                          size: const Size.square(ring * 1.6),
                          painter: _RipplePainter(_ripple.value, ring / 2),
                        ),
                        CustomPaint(size: const Size.square(ring), painter: _RingPainter(_ring.value)),
                        Opacity(
                          opacity: _logoIn.value,
                          child: Transform.scale(
                            scale: _logoScale.value,
                            child: Container(
                              width: badge,
                              height: badge,
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(26),
                                boxShadow: [
                                  BoxShadow(
                                    color: AuthPalette.accentLight.withValues(alpha: 0.35 * _logoIn.value),
                                    blurRadius: 32,
                                  ),
                                ],
                              ),
                              child: Image.asset('assets/logo.png', fit: BoxFit.contain),
                            ),
                          ),
                        ),
                      ]),
                    ),
                    // Wordmark: left-to-right wipe.
                    ClipRect(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        widthFactor: _wordmark.value,
                        child: const Text(
                          'Speshway Solutions',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.6,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Opacity(
                      opacity: _tagline.value,
                      child: Transform.translate(
                        offset: Offset(0, 8 * (1 - _tagline.value)),
                        child: const Text.rich(
                          TextSpan(text: 'HRMS · ', children: [
                            TextSpan(
                              text: 'Your workday starts here.',
                              style: TextStyle(color: AuthPalette.accentLight),
                            ),
                          ]),
                          style: TextStyle(
                            color: AuthPalette.storyMuted,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A ring drawn on around the badge: a sweep from the top plus a faint inner pass.
class _RingPainter extends CustomPainter {
  _RingPainter(this.t);
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    if (t <= 0) return;
    final rect = Rect.fromCircle(center: size.center(Offset.zero), radius: size.width / 2 - 3);
    final paint = Paint()
      ..color = AuthPalette.accentLight
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, -math.pi / 2, 2 * math.pi * t, false, paint);
    canvas.drawArc(
      rect.deflate(6),
      -math.pi / 2 + 0.6,
      2 * math.pi * t * 0.92,
      false,
      paint
        ..strokeWidth = 1.2
        ..color = AuthPalette.accentLight.withValues(alpha: 0.45),
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.t != t;
}

/// One soft glow ripple that expands out from the ring and fades.
class _RipplePainter extends CustomPainter {
  _RipplePainter(this.t, this.startRadius);
  final double t;
  final double startRadius;

  @override
  void paint(Canvas canvas, Size size) {
    if (t <= 0 || t >= 1) return;
    final center = size.center(Offset.zero);
    final maxExtra = size.width / 2 - startRadius;
    for (var i = 0; i < 2; i++) {
      final local = ((t - i * 0.18) / 0.82).clamp(0.0, 1.0);
      if (local <= 0) continue;
      canvas.drawCircle(
        center,
        startRadius + maxExtra * local,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = AuthPalette.accentLight.withValues(alpha: (1 - local) * 0.5),
      );
    }
  }

  @override
  bool shouldRepaint(_RipplePainter old) => old.t != t;
}

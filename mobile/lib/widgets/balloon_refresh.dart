import 'dart:math' as math;

import 'package:custom_refresh_indicator/custom_refresh_indicator.dart';
import 'package:flutter/gestures.dart' show PointerDeviceKind;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';

/// App-wide pull to refresh: a balloon inflates as you pull and pops into
/// confetti when you let go, then the refresh runs. Drop-in for
/// [RefreshIndicator] (`onRefresh` + `child`). Under reduce-motion it falls
/// back to a still balloon with no burst.
class BalloonRefresh extends StatefulWidget {
  const BalloonRefresh({
    super.key,
    required this.onRefresh,
    required this.child,
  });

  final Future<void> Function() onRefresh;
  final Widget child;

  @override
  State<BalloonRefresh> createState() => _BalloonRefreshState();
}

class _BalloonRefreshState extends State<BalloonRefresh>
    with SingleTickerProviderStateMixin {
  static const _height = 110.0;

  late final AnimationController _burst = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  );
  final _pieces = _Confetti.generate(26);

  @override
  void dispose() {
    _burst.dispose();
    super.dispose();
  }

  void _onState(IndicatorStateChange change) {
    if (change.didChange(to: IndicatorState.loading)) {
      HapticFeedback.lightImpact();
      if (!MediaQuery.disableAnimationsOf(context)) _burst.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    return CustomRefreshIndicator(
      onRefresh: widget.onRefresh,
      offsetToArmed: _height,
      onStateChanged: _onState,
      builder: (context, child, controller) => AnimatedBuilder(
        animation: Listenable.merge([controller, _burst]),
        builder: (context, _) {
          final pull = controller.value.clamp(0.0, 1.5);
          final popping =
              controller.isLoading ||
              controller.state == IndicatorState.complete ||
              controller.state == IndicatorState.finalizing;
          final shift = _height * math.min(pull, 1.0);
          return Stack(
            children: [
              Transform.translate(offset: Offset(0, shift), child: child),
              if (pull > 0.02)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  height: shift,
                  child: IgnorePointer(
                    child: ClipRect(
                      child: CustomPaint(
                        painter: popping
                            ? _BurstPainter(_pieces, _burst.value)
                            : _BalloonPainter(pull, controller.isArmed),
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
      // Lists that fit on screen can't overscroll, so a pull never registered
      // (it only worked on long screens like Home). Default every list under
      // here to always-scrollable, keeping the platform feel (clamp / bounce).
      // Lists that set their own physics are left alone.
      child: ScrollConfiguration(
        behavior: _AlwaysPullable(ScrollConfiguration.of(context)),
        child: widget.child,
      ),
    );
  }
}

/// A latex balloon that inflates with the pull: teardrop body, rubber that
/// lightens as it stretches, rim shading, specular shine + sparkle, a tied
/// knot and a string that sways. Wobbles once armed (pull far enough).
class _BalloonPainter extends CustomPainter {
  _BalloonPainter(this.pull, this.armed);
  final double pull;
  final bool armed;

  static const _deep = Color(0xFF232C54); // Speshway navy
  static const _mid = Color(0xFF5C6FAB);
  static const _light = Color(0xFFB0BBDF);

  @override
  void paint(Canvas canvas, Size size) {
    final inflate = Curves.easeOutCubic.transform(math.min(pull, 1.0));
    // Over-pull keeps stretching a little, like it's about to burst.
    final over = pull > 1 ? (pull - 1).clamp(0.0, 0.5) : 0.0;
    final r = 7 + 19 * inflate + 8 * over;
    final cx = size.width / 2;
    final cy = size.height / 2 - 6;
    final sway =
        math.sin(pull * 9) * 0.05 + (armed ? math.sin(pull * 50) * 0.05 : 0);

    canvas.save();
    canvas.translate(cx, cy);
    canvas.rotate(sway);

    // Teardrop body: round top, tapering to the knot.
    final w = r * 0.95;
    final top = -r * 1.05;
    final bottom = r * 1.05;
    final body = Path()
      ..moveTo(0, top)
      ..cubicTo(w * 1.12, top, w * 1.08, bottom * 0.55, 0, bottom)
      ..cubicTo(-w * 1.08, bottom * 0.55, -w * 1.12, top, 0, top)
      ..close();
    final bounds = body.getBounds();

    // Soft contact shadow.
    canvas.drawPath(
      body.shift(const Offset(2, 4)),
      Paint()
        ..color = Colors.black.withValues(alpha: 0.12)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );

    // Rubber: the more it's blown up, the lighter/thinner it looks.
    final core = Color.lerp(_mid, _light, 0.35 * inflate)!;
    canvas.drawPath(
      body,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.3, -0.4),
          radius: 0.95,
          colors: [Color.lerp(core, Colors.white, 0.25)!, core, _deep],
          stops: const [0.0, 0.55, 1.0],
        ).createShader(bounds),
    );
    // Rim light on the shadow side.
    canvas.drawPath(
      body,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.transparent, Colors.white.withValues(alpha: 0.35)],
        ).createShader(bounds),
    );
    // Curved specular shine + a small sparkle.
    canvas.drawPath(
      Path()
        ..moveTo(-w * 0.55, -r * 0.55)
        ..quadraticBezierTo(-w * 0.5, -r * 0.95, -w * 0.05, -r * 0.92)
        ..quadraticBezierTo(-w * 0.4, -r * 0.78, -w * 0.55, -r * 0.55)
        ..close(),
      Paint()
        ..color = Colors.white.withValues(alpha: 0.55)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1.5),
    );
    canvas.drawCircle(
      Offset(-w * 0.62, -r * 0.2),
      math.max(1.2, r * 0.07),
      Paint()..color = Colors.white.withValues(alpha: 0.7),
    );

    // Tied knot.
    canvas.drawPath(
      Path()
        ..moveTo(-4, bottom + 5)
        ..quadraticBezierTo(0, bottom + 1, 4, bottom + 5)
        ..lineTo(1.5, bottom - 1)
        ..lineTo(-1.5, bottom - 1)
        ..close(),
      Paint()..color = _deep,
    );

    // String: hangs and sways opposite the body.
    final s = -sway * 60;
    canvas.drawPath(
      Path()
        ..moveTo(0, bottom + 5)
        ..cubicTo(6 + s, bottom + 12, -6 + s, bottom + 20, 2 + s, bottom + 30),
      Paint()
        ..color = const Color(0xFF8A8FA3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.1
        ..strokeCap = StrokeCap.round,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_BalloonPainter old) =>
      old.pull != pull || old.armed != armed;
}

class _Confetti {
  _Confetti(
    this.angle,
    this.speed,
    this.size,
    this.color,
    this.spin,
    this.flip,
  );
  final double angle;
  final double speed;
  final double size;
  final Color color;
  final double spin;
  final double flip;

  static const _colors = [
    Color(0xFF3B4677), // navy
    AppColors.accent500,
    Color(0xFFF59E0B),
    Color(0xFF10B981),
    Color(0xFFEF4444),
    Color(0xFF3B82F6),
  ];

  static List<_Confetti> generate(int n) {
    final rnd = math.Random(7);
    return [
      for (var i = 0; i < n; i++)
        _Confetti(
          -math.pi + rnd.nextDouble() * math.pi * 2,
          60 + rnd.nextDouble() * 80,
          4 + rnd.nextDouble() * 4,
          _colors[i % _colors.length],
          rnd.nextDouble() * 10 - 5,
          6 + rnd.nextDouble() * 10,
        ),
    ];
  }
}

/// Pop: a flash, torn rubber shreds flung out, and confetti that bursts,
/// slows (drag), falls (gravity) and flips over as it fades.
class _BurstPainter extends CustomPainter {
  _BurstPainter(this.pieces, this.t);
  final List<_Confetti> pieces;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    if (t <= 0 || t >= 1) return;
    final center = Offset(size.width / 2, size.height / 2 - 6);
    final fade = (1 - t).clamp(0.0, 1.0);

    // Flash.
    if (t < 0.18) {
      canvas.drawCircle(
        center,
        10 + 60 * t,
        Paint()
          ..color = Colors.white.withValues(alpha: (0.18 - t) * 4)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
      );
    }

    // Torn rubber shreds (balloon colour), heavier: fly short, drop fast.
    final rnd = math.Random(11);
    for (var i = 0; i < 7; i++) {
      final a = i / 7 * math.pi * 2 + rnd.nextDouble() * 0.5;
      final d = 26 * Curves.easeOut.transform(math.min(1, t * 2.5));
      final pos =
          center +
          Offset(math.cos(a) * d * 1.4, math.sin(a) * d) +
          Offset(0, 70 * t * t);
      canvas.save();
      canvas.translate(pos.dx, pos.dy);
      canvas.rotate(a + t * 6);
      canvas.drawPath(
        Path()
          ..moveTo(-6, -2)
          ..lineTo(-2, -5)
          ..lineTo(3, -3)
          ..lineTo(7, 1)
          ..lineTo(1, 4)
          ..lineTo(-4, 3)
          ..close(),
        Paint()..color = const Color(0xFF5C6FAB).withValues(alpha: fade),
      );
      canvas.restore();
    }

    // Confetti: burst out with drag, then gravity; flips (width oscillates).
    for (final p in pieces) {
      final out = p.speed * (1 - math.exp(-5 * t)) / (1 - math.exp(-5.0));
      final pos =
          center +
          Offset(math.cos(p.angle) * out * 1.5, math.sin(p.angle) * out * 0.6) +
          Offset(0, 55 * t * t);
      canvas.save();
      canvas.translate(pos.dx, pos.dy);
      canvas.rotate(p.spin * t);
      final flip = math.cos(t * p.flip).abs();
      canvas.drawRect(
        Rect.fromCenter(
          center: Offset.zero,
          width: p.size * math.max(0.15, flip),
          height: p.size * 0.6,
        ),
        Paint()..color = p.color.withValues(alpha: fade),
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_BurstPainter old) => old.t != t;
}

/// Wraps the inherited scroll behaviour so lists without explicit physics are
/// always scrollable (pullable even when short).
class _AlwaysPullable extends ScrollBehavior {
  const _AlwaysPullable(this.base);
  final ScrollBehavior base;

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) =>
      AlwaysScrollableScrollPhysics(parent: base.getScrollPhysics(context));

  @override
  Widget buildOverscrollIndicator(BuildContext context, Widget child, ScrollableDetails details) =>
      base.buildOverscrollIndicator(context, child, details);

  @override
  Widget buildScrollbar(BuildContext context, Widget child, ScrollableDetails details) =>
      base.buildScrollbar(context, child, details);

  @override
  Set<PointerDeviceKind> get dragDevices => base.dragDevices;
}

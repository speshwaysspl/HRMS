import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/push_service.dart' show appNavigatorKey;
import '../theme/app_theme.dart';

/// In-app notification ("Gooey Drop", from nutri_hrms): a drop falls from the
/// top, lands, melts and spreads sideways into a toast with title + body.
/// Look: white drop / toast with navy text and a thin green edge (both themes).
/// Tap opens it; swipe up or wait ~4.5 s to dismiss. Reduce-motion: it just
/// appears. Needs no BuildContext (uses the root navigator's overlay).
abstract final class GooeyToast {
  static OverlayEntry? _current;

  static void show({required String title, String body = '', VoidCallback? onTap}) {
    final overlay = appNavigatorKey.currentState?.overlay;
    if (overlay == null) return;
    _current?.remove();
    late final OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => _GooeyToastView(
        title: title,
        body: body,
        onTap: onTap,
        onDone: () {
          if (_current == entry) _current = null;
          entry.remove();
        },
      ),
    );
    _current = entry;
    overlay.insert(entry);
    HapticFeedback.selectionClick();
  }
}

class _GooeyToastView extends StatefulWidget {
  final String title;
  final String body;
  final VoidCallback? onTap;
  final VoidCallback onDone;
  const _GooeyToastView({required this.title, required this.body, required this.onTap, required this.onDone});

  @override
  State<_GooeyToastView> createState() => _GooeyToastViewState();
}

class _GooeyToastViewState extends State<_GooeyToastView> with SingleTickerProviderStateMixin {
  // 0–0.35 fall · 0.35–0.5 squash · 0.5–1 melt/spread into the toast.
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));
  Timer? _timer;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (MediaQuery.disableAnimationsOf(context)) {
        _c.value = 1;
      } else {
        _c.forward();
      }
      _timer = Timer(const Duration(milliseconds: 4500), _dismiss);
    });
  }

  Future<void> _dismiss() async {
    if (_leaving || !mounted) return;
    _leaving = true;
    _timer?.cancel();
    if (!MediaQuery.disableAnimationsOf(context)) {
      await _c.animateBack(0.5, duration: const Duration(milliseconds: 260), curve: Curves.easeIn);
    }
    widget.onDone();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top + 10;
    final dark = AppColors.isDark;
    // White drop with navy text in both themes (green edge drawn by the painter).
    const colors = [Colors.white, Color(0xFFE6EAF4)];
    return Positioned(
      top: top,
      left: 12,
      right: 12,
      child: Semantics(
        liveRegion: true,
        label: '${widget.title}. ${widget.body}',
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, _) {
            final t = _c.value;
            final contentOpacity = ((t - 0.72) / 0.28).clamp(0.0, 1.0);
            return GestureDetector(
              onTap: () {
                widget.onTap?.call();
                _dismiss();
              },
              onVerticalDragEnd: (d) {
                if ((d.primaryVelocity ?? 0) < -200) _dismiss();
              },
              child: SizedBox(
                height: 76,
                width: double.infinity,
                child: CustomPaint(
                  painter: _GooeyPainter(t, colors, dark),
                  child: Opacity(
                    opacity: contentOpacity,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                      child: Row(children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(color: AppColors.brand100, shape: BoxShape.circle),
                          child: Icon(Icons.notifications_active_rounded, color: AppColors.brand800, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(widget.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: AppColors.brand900, fontWeight: FontWeight.w700, fontSize: 15, decoration: TextDecoration.none)),
                              if (widget.body.isNotEmpty)
                                Text(widget.body,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(color: const Color(0xFF3B4677), fontSize: 13, fontWeight: FontWeight.w400, decoration: TextDecoration.none)),
                            ],
                          ),
                        ),
                      ]),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Drop → splat → toast: one blob that morphs from a falling drop (stretched
/// by speed), to a squashed splat on landing, to a rounded toast spreading out
/// from the centre with drips melting off its bottom edge.
class _GooeyPainter extends CustomPainter {
  _GooeyPainter(this.t, this.colors, this.dark);
  final double t;
  final List<Color> colors;
  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = LinearGradient(colors: colors, begin: Alignment.topLeft, end: Alignment.bottomRight).createShader(Offset.zero & size);
    final shadow = Paint()
      ..color = (dark ? Colors.black : AppColors.brand900).withValues(alpha: dark ? 0.45 : 0.28)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
    final cx = size.width / 2;
    final cy = size.height / 2;

    if (t < 0.35) {
      final f = Curves.easeIn.transform(t / 0.35);
      final y = -60 + (cy + 60) * f;
      const r = 16.0;
      final stretch = 1 + 0.6 * f;
      final path = Path()
        ..moveTo(cx, y - r * 1.4 * stretch)
        ..cubicTo(cx + r * 0.6, y - r * 0.6, cx + r, y - r * 0.2, cx + r, y + r * 0.2)
        ..arcToPoint(Offset(cx - r, y + r * 0.2), radius: const Radius.circular(r))
        ..cubicTo(cx - r, y - r * 0.2, cx - r * 0.6, y - r * 0.6, cx, y - r * 1.4 * stretch)
        ..close();
      canvas.drawPath(path, paint);
      return;
    }
    if (t < 0.5) {
      final s = (t - 0.35) / 0.15;
      final squash = math.sin(s * math.pi);
      final rect = Rect.fromCenter(center: Offset(cx, cy), width: 32 + 40 * squash + 30 * s, height: 32 - 14 * squash);
      canvas.drawOval(rect.inflate(2), shadow);
      canvas.drawOval(rect, paint);
      return;
    }
    final p = ((t - 0.5) / 0.5).clamp(0.0, 1.0);
    final m = Curves.easeOutBack.transform(p);
    final w = 100 + (size.width - 100) * m.clamp(0.0, 1.05);
    final h = 34 + (size.height - 34) * Curves.easeOut.transform(p);
    final left = cx - w / 2;
    final top = cy - h / 2;
    final rect = RRect.fromLTRBR(left, top, left + w, top + h, Radius.circular(h / 2 * (1 - 0.45 * m)));
    canvas.drawRRect(rect.inflate(1), shadow);
    canvas.drawRRect(rect, paint);
    {
      // Thin green edge around the white toast.
      canvas.drawRRect(rect, Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..color = AppColors.accent400.withValues(alpha: 0.55 * p));
    }
    final drip = (1 - m).clamp(0.0, 1.0);
    if (drip > 0.02) {
      for (final (dx, len) in const [(-0.28, 1.0), (0.12, 0.7), (0.34, 0.85)]) {
        final x = cx + w * dx;
        final l = 14 * len * drip;
        canvas.drawPath(
          Path()
            ..moveTo(x - 6, top + h - 2)
            ..quadraticBezierTo(x - 5, top + h + l, x, top + h + l)
            ..quadraticBezierTo(x + 5, top + h + l, x + 6, top + h - 2)
            ..close(),
          paint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(_GooeyPainter old) => old.t != t || old.dark != dark;
}

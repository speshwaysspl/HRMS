import 'dart:math' as math;
import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';

import 'app_backdrop.dart';

/// "Push back" side menu: the page shrinks, rounds and slides right to reveal
/// the menu behind it (instead of a drawer sliding over the page).
///
/// Wraps the whole shell (page + bottom nav). Open with
/// `PushBackDrawer.of(context).open()` (see [MenuButton]); closes on tapping
/// the page, swiping left, or Back. Honors reduce-motion.
class PushBackDrawer extends StatefulWidget {
  final Widget menu;
  final Widget child;
  const PushBackDrawer({super.key, required this.menu, required this.child});

  static PushBackDrawerState? maybeOf(BuildContext context) => context.findAncestorStateOfType<PushBackDrawerState>();

  @override
  State<PushBackDrawer> createState() => PushBackDrawerState();
}

class PushBackDrawerState extends State<PushBackDrawer> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 340));
  late final Animation<double> _t = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic, reverseCurve: Curves.easeInCubic);

  bool get isOpen => _c.value > 0;

  void open() => _animate(1);
  void close() => _animate(0);
  void toggle() => isOpen ? close() : open();

  void _animate(double target) {
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = target;
    } else {
      _c.animateTo(target);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final slide = math.min(width * 0.68, 320.0); // how far the page moves right
    final menuWidth = slide + 8;

    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        final t = _t.value;
        final open = _c.value > 0;
        return PopScope(
          canPop: !open,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) close();
          },
          // Shared brand backdrop (theme-based) — see AppBackdrop.
          child: AppBackdrop(
            child: Stack(children: [
              // Menu behind the page; fades/slides in slightly for depth.
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: menuWidth,
                child: IgnorePointer(
                  ignoring: !open,
                  child: Opacity(
                    opacity: t.clamp(0.0, 1.0),
                    child: Transform.translate(offset: Offset(-24 * (1 - t), 0), child: widget.menu),
                  ),
                ),
              ),
              // Ghost card a step behind the page: stacked "push back" depth.
              if (open)
                Transform(
                  alignment: Alignment.centerLeft,
                  transform: Matrix4.identity()
                    ..translateByDouble((slide - 26) * t, 0, 0, 1)
                    ..scaleByDouble(lerpDouble(1, 0.76, t)!, lerpDouble(1, 0.76, t)!, 1, 1),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.10 * t),
                      borderRadius: BorderRadius.circular(28 * t),
                    ),
                  ),
                ),
              // The page: shrinks, rounds, slides right.
              Transform(
                alignment: Alignment.centerLeft,
                transform: Matrix4.identity()
                  ..translateByDouble(slide * t, 0, 0, 1)
                  ..scaleByDouble(lerpDouble(1, 0.84, t)!, lerpDouble(1, 0.84, t)!, 1, 1),
                child: GestureDetector(
                  // Swipe left on the page to close.
                  onHorizontalDragUpdate: open ? (d) => _c.value = (_c.value + d.delta.dx / slide).clamp(0.0, 1.0) : null,
                  onHorizontalDragEnd: open ? (d) => (_c.value > 0.5 && d.primaryVelocity! > -300) ? this.open() : close() : null,
                  child: Container(
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(28 * t),
                      boxShadow: [
                        if (open) BoxShadow(color: Colors.black.withValues(alpha: 0.28 * t), blurRadius: 40, offset: const Offset(-8, 12)),
                      ],
                    ),
                    child: Stack(children: [
                      AbsorbPointer(absorbing: open, child: widget.child),
                      // Tap the pushed-back page to close.
                      if (open)
                        Positioned.fill(
                          child: Semantics(
                            button: true,
                            label: 'Close menu',
                            child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: close),
                          ),
                        ),
                    ]),
                  ),
                ),
              ),
            ]),
          ),
        );
      },
    );
  }
}

/// Hamburger that opens the push-back menu (falls back to a normal drawer).
class MenuButton extends StatelessWidget {
  final Color? color;
  const MenuButton({super.key, this.color});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Menu',
      icon: Icon(Icons.menu_rounded, color: color),
      onPressed: () {
        final pb = PushBackDrawer.maybeOf(context);
        if (pb != null) {
          pb.open();
        } else {
          Scaffold.maybeOf(context)?.openDrawer();
        }
      },
    );
  }
}

/// Close whichever menu is showing (push-back or a regular drawer route).
void closeAppMenu(BuildContext context) {
  final pb = PushBackDrawer.maybeOf(context);
  if (pb != null) {
    pb.close();
  } else {
    Navigator.of(context).maybePop();
  }
}

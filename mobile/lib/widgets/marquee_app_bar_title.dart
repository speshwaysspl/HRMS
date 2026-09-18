import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/responsive.dart';

/// An animated AppBar title where a SINGLE "SPESHWAY HRMS" moves smoothly and slowly
/// from right to left across the screen.
class MarqueeAppBarTitle extends StatefulWidget {
  final Duration duration;

  const MarqueeAppBarTitle({
    super.key,
    this.duration = const Duration(seconds: 10),
  });

  @override
  State<MarqueeAppBarTitle> createState() => _MarqueeAppBarTitleState();
}

class _MarqueeAppBarTitleState extends State<MarqueeAppBarTitle>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxW = constraints.maxWidth.isFinite && constraints.maxWidth > 0
            ? constraints.maxWidth
            : 240.0;

        // Measure single title text width accurately
        final textPainter = TextPainter(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'SPESHWAY HRMS',
                style: GoogleFonts.inter(
                  fontSize: context.sp(15),
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.4,
                ),
              ),
            ],
          ),
          textDirection: TextDirection.ltr,
          maxLines: 1,
        )..layout();

        final textW = textPainter.width;
        final totalDistance = maxW + textW;

        return ClipRect(
          child: SizedBox(
            width: maxW,
            height: 32,
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                // Starts at right edge (maxW) and smoothly glides to the left edge (-textW)
                final x = maxW - (_controller.value * totalDistance);
                return Transform.translate(
                  offset: Offset(x, 4),
                  child: child,
                );
              },
              child: SizedBox(
                width: textW + 8,
                child: RichText(
                  maxLines: 1,
                  softWrap: false,
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: 'SPESHWAY ',
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: context.sp(15),
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.4,
                        ),
                      ),
                      TextSpan(
                        text: 'HRMS',
                        style: GoogleFonts.inter(
                          color: const Color(0xFF10B981),
                          fontSize: context.sp(15),
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

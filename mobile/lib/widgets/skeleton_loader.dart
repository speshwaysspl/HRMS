import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

/// Lightweight shimmer effect built with only core Flutter (no external
/// package). Drives a moving gradient across its child via a [ShaderMask].
/// Skips the animation entirely (renders a static block) when the platform
/// has reduced-motion enabled.
class _Shimmer extends StatefulWidget {
  final Widget child;
  const _Shimmer({required this.child});

  @override
  State<_Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<_Shimmer> with SingleTickerProviderStateMixin {
  AnimationController? _controller;

  @override
  void initState() {
    super.initState();
    final reduceMotion = WidgetsBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations;
    if (!reduceMotion) {
      _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))
        ..repeat();
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null) {
      // Reduced motion: plain static block, no shader/animation overhead.
      return widget.child;
    }
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            final t = controller.value;
            return LinearGradient(
              begin: Alignment(-1.0 - t * 2, 0),
              end: Alignment(1.0 - t * 2, 0),
              colors: const [
                Color(0xFFEEF0F6),
                Color(0xFFF9FAFC),
                Color(0xFFEEF0F6),
              ],
              stops: const [0.35, 0.5, 0.65],
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// A single shimmering rounded rect placeholder.
class SkeletonBox extends StatelessWidget {
  final double? width;
  final double height;
  final BorderRadius? borderRadius;

  const SkeletonBox({super.key, this.width, this.height = 14, this.borderRadius});

  @override
  Widget build(BuildContext context) {
    return _Shimmer(
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: AppColors.surfaceSubtle,
          borderRadius: borderRadius ?? BorderRadius.circular(6),
        ),
      ),
    );
  }
}

/// Mimics a [SimpleCard]-style list row: leading circle + two text lines.
class SkeletonListTile extends StatelessWidget {
  const SkeletonListTile({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(bottom: context.h(10)),
      padding: EdgeInsets.all(context.w(14)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Row(
        children: [
          SkeletonBox(width: context.r(40), height: context.r(40), borderRadius: BorderRadius.circular(context.r(20))),
          SizedBox(width: context.w(12)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonBox(width: context.wf(0.45), height: 14),
                SizedBox(height: context.h(8)),
                SkeletonBox(width: context.wf(0.28), height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Mimics a generic content/dashboard card of a given height.
class SkeletonCard extends StatelessWidget {
  final double height;
  const SkeletonCard({super.key, this.height = 110});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(bottom: context.h(12)),
      padding: EdgeInsets.all(context.w(14)),
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          SkeletonBox(width: context.wf(0.4), height: 16),
          SkeletonBox(width: double.infinity, height: 12),
          SkeletonBox(width: context.wf(0.6), height: 12),
        ],
      ),
    );
  }
}

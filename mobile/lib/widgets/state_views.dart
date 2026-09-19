import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

/// Full-body "no internet / can't reach the server" state.
class NetworkErrorView extends StatelessWidget {
  final VoidCallback onRetry;
  final String? subtitle;
  const NetworkErrorView({super.key, required this.onRetry, this.subtitle});

  @override
  Widget build(BuildContext context) {
    return _StateScaffold(
      icon: Icons.wifi_off_rounded,
      iconColor: AppColors.warning,
      iconBg: AppColors.warningBg,
      title: 'No internet connection',
      subtitle: subtitle ?? "You're offline. Check your Wi-Fi or mobile data and try again.",
      action: OutlinedButton.icon(
        onPressed: onRetry,
        icon: const Icon(Icons.refresh_rounded, size: 18),
        label: const Text('Try again'),
      ),
    );
  }
}

/// Full-body generic error state (server error, unexpected failure, etc.).
class ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const ErrorView({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return _StateScaffold(
      icon: Icons.error_outline_rounded,
      iconColor: AppColors.danger,
      iconBg: AppColors.dangerBg,
      title: 'Something went wrong',
      subtitle: message,
      action: OutlinedButton.icon(
        onPressed: onRetry,
        icon: const Icon(Icons.refresh_rounded, size: 18),
        label: const Text('Try again'),
      ),
    );
  }
}

/// Friendlier "no data yet" state — distinct from an error.
class EmptyStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? action;
  const EmptyStateView({super.key, required this.icon, required this.title, this.subtitle, this.action});

  @override
  Widget build(BuildContext context) {
    return _StateScaffold(
      icon: icon,
      iconColor: AppColors.brand500,
      iconBg: AppColors.brand50,
      title: title,
      subtitle: subtitle,
      action: action,
    );
  }
}

/// Full-body success confirmation state — e.g. after a request/submission
/// completes and the screen wants to show a clear "done" moment instead of
/// (or before) navigating away.
class SuccessView extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? action;
  const SuccessView({super.key, required this.title, this.subtitle, this.action});

  @override
  Widget build(BuildContext context) {
    return _StateScaffold(
      icon: Icons.check_rounded,
      iconColor: AppColors.accent600,
      iconBg: AppColors.accent50,
      title: title,
      subtitle: subtitle,
      action: action,
    );
  }
}

/// Shared "illustrated" layout: a layered soft-circle badge behind the icon
/// (concentric rings fading outward) with a gentle scale-in entrance, so
/// these read as proper full-page states rather than a bare icon + text.
class _StateScaffold extends StatefulWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String? subtitle;
  final Widget? action;

  const _StateScaffold({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    this.subtitle,
    this.action,
  });

  @override
  State<_StateScaffold> createState() => _StateScaffoldState();
}

class _StateScaffoldState extends State<_StateScaffold> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    final reduceMotion = WidgetsBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations;
    _controller = AnimationController(
      vsync: this,
      duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 420),
    );
    _scale = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: EdgeInsets.all(context.w(32)),
        child: FadeTransition(
          opacity: _fade,
          child: ScaleTransition(
            scale: _scale,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _IllustratedBadge(icon: widget.icon, color: widget.iconColor, bg: widget.iconBg),
                SizedBox(height: context.h(20)),
                Text(
                  widget.title,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: context.sp(16), color: AppColors.ink),
                ),
                if (widget.subtitle != null && widget.subtitle!.isNotEmpty) ...[
                  SizedBox(height: context.h(6)),
                  Text(
                    widget.subtitle!,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13), height: 1.4),
                  ),
                ],
                if (widget.action != null) ...[SizedBox(height: context.h(20)), widget.action!],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _IllustratedBadge extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color bg;
  const _IllustratedBadge({required this.icon, required this.color, required this.bg});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: context.r(120),
      height: context.r(120),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: context.r(120),
            height: context.r(120),
            decoration: BoxDecoration(color: AppColors.tint(bg).withValues(alpha: 0.5), shape: BoxShape.circle),
          ),
          Container(
            width: context.r(92),
            height: context.r(92),
            decoration: BoxDecoration(color: AppColors.tint(bg), shape: BoxShape.circle),
          ),
          Container(
            width: context.r(64),
            height: context.r(64),
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 16, offset: const Offset(0, 6)),
              ],
            ),
            child: Icon(icon, size: context.r(30), color: Colors.white),
          ),
        ],
      ),
    );
  }
}

/// Branches between [NetworkErrorView] and [ErrorView] based on the caught
/// exception, so call sites just do `buildErrorState(e, _load)`.
Widget buildErrorState(Object error, VoidCallback onRetry) {
  if (isNetworkError(error)) {
    return NetworkErrorView(onRetry: onRetry);
  }
  return ErrorView(message: extractErrorMessage(error), onRetry: onRetry);
}

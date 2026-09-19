import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

class SimpleCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  const SimpleCard({super.key, required this.child, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(bottom: context.h(10)),
      child: Material(
        color: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: AppColors.surfaceSubtle),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(padding: EdgeInsets.all(context.w(14)), child: child),
        ),
      ),
    );
  }
}

class CenteredMessage extends StatelessWidget {
  final IconData icon;
  final String message;
  final Widget? action;
  const CenteredMessage({super.key, required this.icon, required this.message, this.action});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(context.w(32)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: context.r(40), color: AppColors.inkFaint),
            SizedBox(height: context.h(12)),
            Text(message, textAlign: TextAlign.center, style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(14))),
            if (action != null) ...[SizedBox(height: context.h(12)), action!],
          ],
        ),
      ),
    );
  }
}

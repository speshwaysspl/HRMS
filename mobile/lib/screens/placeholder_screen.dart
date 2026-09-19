import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

/// Used for modules that exist on the web app but haven't been ported to
/// mobile yet, so every role has a fully navigable shell from day one.
class PlaceholderScreen extends StatelessWidget {
  final String title;
  final IconData icon;
  final String message;

  const PlaceholderScreen({
    super.key,
    required this.title,
    required this.icon,
    this.message = 'This module is coming soon to the Speshway mobile app.',
  });

  @override
  Widget build(BuildContext context) {
    final box = context.r(72);
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Padding(
          padding: EdgeInsets.all(context.w(32)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: box,
                height: box,
                decoration: BoxDecoration(color: AppColors.brand50, shape: BoxShape.circle),
                child: Icon(icon, size: context.r(32), color: AppColors.brand500),
              ),
              SizedBox(height: context.h(16)),
              Text(title,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
              SizedBox(height: context.h(8)),
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Standard app bar for every sub-screen: photo backdrop with a dark scrim,
/// matching the Notifications screen. Web mirror: `MobilePageBar` in
/// frontend/src/components/dashboard/Navbar.jsx.
class HrmsAppBar extends StatelessWidget implements PreferredSizeWidget {
  final Widget? title;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;

  const HrmsAppBar({super.key, this.title, this.actions, this.bottom});

  @override
  Size get preferredSize =>
      Size.fromHeight(kToolbarHeight + (bottom?.preferredSize.height ?? 0));

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      title: title,
      actions: actions,
      bottom: bottom,
      flexibleSpace: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset('assets/appbar_bg.png', fit: BoxFit.cover),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.25),
                  AppColors.brand900.withValues(alpha: 0.45),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Backdrop behind the push-back menu — the same in light and dark themes:
/// near-black navy with a soft green glow bottom-left and a blue glow
/// top-right (the look the user picked from dark mode).
class AppBackdrop extends StatelessWidget {
  final Widget child;
  const AppBackdrop({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.brand950, Color(0xFF05060D)],
        ),
      ),
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(-0.9, 0.9),
            radius: 1.1,
            colors: [Color(0x553F8B45), Color(0x003F8B45)],
          ),
        ),
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(1, -1),
              radius: 1.2,
              colors: [Color(0x405C6FAB), Color(0x005C6FAB)],
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

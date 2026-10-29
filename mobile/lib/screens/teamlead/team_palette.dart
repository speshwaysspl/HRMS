import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// The team screens' small palette: neutral surfaces, the brand colour for
/// icons/selection, and three status colours that stay readable in both
/// light and dark mode. Status colours are for numbers, dots and chips only —
/// never large fills.
class TeamPalette {
  TeamPalette._();

  static Color get ok =>
      AppColors.isDark ? const Color(0xFF4ADE80) : const Color(0xFF15803D);
  static Color get warn =>
      AppColors.isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309);
  static Color get bad =>
      AppColors.isDark ? const Color(0xFFF87171) : const Color(0xFFDC2626);

  /// Filled primary buttons (Save, New Milestone): white text passes contrast
  /// in both themes.
  static Color get fill =>
      AppColors.isDark ? const Color(0xFF3A4C8F) : const Color(0xFF2C3968);

  /// Soft tint behind a status chip / selected segment.
  static Color soft(Color c) =>
      c.withValues(alpha: AppColors.isDark ? 0.18 : 0.12);

  /// Card decoration shared by every tile on these screens.
  static BoxDecoration card(double radius, {Color? border}) => BoxDecoration(
    color: AppColors.surface,
    borderRadius: BorderRadius.circular(radius),
    border: Border.all(color: border ?? AppColors.surfaceSubtle),
  );
}

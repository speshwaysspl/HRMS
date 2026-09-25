import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Color tokens ported 1:1 from frontend/tailwind.config.js so the mobile
/// app visually matches the web HRMS.
class AppColors {
  AppColors._();

  // brand (navy/indigo) scale
  static Color get brand50 => isDark ? const Color(0xFF242C4B) : const Color(0xFFEEF1F8);
  static const brand100 = Color(0xFFD7DDEF);
  static const brand200 = Color(0xFFB0BBDF);
  static const brand300 = Color(0xFF8898CD);
  static const brand400 = Color(0xFF5C6FAB);
  static Color get brand500 => isDark ? const Color(0xFF7B8CC8) : const Color(0xFF374A85);
  static Color get brand600 => isDark ? const Color(0xFF6B7DBA) : const Color(0xFF2C3968);
  static const brand700 = Color(0xFF232C54);
  static const brand800 = Color(0xFF1C2344);
  static const brand900 = Color(0xFF161B35);
  static const brand950 = Color(0xFF0E1122);

  // accent (green) scale
  static Color get accent50 => isDark ? const Color(0xFF1B2F20) : const Color(0xFFEEF7EE);
  static Color get accent100 => isDark ? const Color(0xFF21402A) : const Color(0xFFD7ECD8);
  static const accent200 = Color(0xFFB0D9B3);
  static const accent300 = Color(0xFF84C088);
  static const accent400 = Color(0xFF5DA562);
  static const accent500 = Color(0xFF3F8B45);
  static const accent600 = Color(0xFF337038);
  static Color get accent700 => isDark ? const Color(0xFF8FD495) : const Color(0xFF2A5A2F);
  static const accent800 = Color(0xFF224726);
  static const accent900 = Color(0xFF1B381E);

  /// Set by the app root before each build (see main.dart) — the neutral
  /// tokens below flip with it, so every widget follows light/dark.
  static bool isDark = false;

  static Color get surface => isDark ? const Color(0xFF1A1F36) : const Color(0xFFFFFFFF);
  static Color get surfaceMuted => isDark ? const Color(0xFF0F1224) : const Color(0xFFF6F7FB);
  static Color get surfaceSubtle => isDark ? const Color(0xFF2B3252) : const Color(0xFFEEF0F6);

  static Color get ink => isDark ? const Color(0xFFE9ECF5) : const Color(0xFF1C2333);
  static Color get inkMuted => isDark ? const Color(0xFFA9B0C6) : const Color(0xFF5B6376);
  static Color get inkFaint => isDark ? const Color(0xFF7F87A0) : const Color(0xFF8B93A7);

  /// Light pastel tint -> a same-hue deep tint in dark mode (white -> card
  /// surface). Use for hard-coded pastel backgrounds.
  static Color tint(Color c) {
    if (!isDark) return c;
    if (c == const Color(0xFFFFFFFF)) return surface;
    final h = HSLColor.fromColor(c);
    return h.withSaturation((h.saturation * 0.45).clamp(0.0, 1.0)).withLightness(0.2).toColor();
  }

  static const danger = Color(0xFFDC2626);
  static Color get dangerBg => isDark ? const Color(0xFF3B1C22) : const Color(0xFFFEF2F2);
  static const warning = Color(0xFFB45309);
  static Color get warningBg => isDark ? const Color(0xFF3A2D14) : const Color(0xFFFFFBEB);
}

class AppRadius {
  AppRadius._();
  static const card = 14.0;
  static const panel = 18.0;
}

class AppTheme {
  AppTheme._();

  static ThemeData get light => build(dark: false);
  static ThemeData get dark => build(dark: true);

  static ThemeData build({required bool dark}) {
    AppColors.isDark = dark;
    final textTheme = GoogleFonts.interTextTheme().apply(
      bodyColor: AppColors.ink,
      displayColor: AppColors.ink,
    );

    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: AppColors.surfaceMuted,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.brand500,
        primary: AppColors.brand500,
        secondary: AppColors.accent500,
        surface: AppColors.surface,
        error: AppColors.danger,
        brightness: dark ? Brightness.dark : Brightness.light,
      ),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: dark ? AppColors.brand950 : AppColors.brand900,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
          side: BorderSide(color: AppColors.surfaceSubtle),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: AppColors.surfaceSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: AppColors.surfaceSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: AppColors.brand500, width: 1.5),
        ),
        hintStyle: TextStyle(color: AppColors.inkFaint),
        labelStyle: TextStyle(color: AppColors.inkMuted),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accent600,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 15),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.ink,
          side: BorderSide(color: AppColors.surfaceSubtle),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
      dividerTheme: DividerThemeData(color: AppColors.surfaceSubtle, thickness: 1),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: dark ? AppColors.surfaceSubtle : AppColors.brand900,
        contentTextStyle: const TextStyle(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      // Same dark navy palette as the home screen's app bar, instead of a
      // plain white bar with a green highlight.
      dialogTheme: DialogThemeData(backgroundColor: AppColors.surface, surfaceTintColor: Colors.transparent),
      bottomSheetTheme: BottomSheetThemeData(backgroundColor: AppColors.surface, surfaceTintColor: Colors.transparent),
      drawerTheme: DrawerThemeData(backgroundColor: AppColors.surface, surfaceTintColor: Colors.transparent),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.brand900,
        selectedItemColor: AppColors.accent400,
        unselectedItemColor: Colors.white.withValues(alpha: 0.55),
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
        elevation: 0,
      ),
    );
  }
}

/// Status colors matching the pill badges used across the web app
/// (Approved/Active = accent-green, Pending = amber, Rejected/Inactive = red).
class StatusColors {
  StatusColors._();

  static Color bg(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'active':
      case 'present':
      case 'accepted':
        return AppColors.accent100;
      case 'pending':
      case 'sent':
      case 'half day':
      case 'half-day':
        return AppColors.tint(const Color(0xFFFEF3C7));
      case 'rejected':
      case 'inactive':
      case 'absent':
        return AppColors.tint(const Color(0xFFFEE2E2));
      default:
        return AppColors.surfaceSubtle;
    }
  }

  static Color fg(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'active':
      case 'present':
      case 'accepted':
        return AppColors.accent700;
      case 'pending':
      case 'sent':
      case 'half day':
      case 'half-day':
        // Dark amber/red disappear on the dark tinted pill — use light shades there.
        return AppColors.isDark ? const Color(0xFFFCD34D) : const Color(0xFFB45309);
      case 'rejected':
      case 'inactive':
      case 'absent':
        return AppColors.isDark ? const Color(0xFFFCA5A5) : const Color(0xFFB91C1C);
      default:
        return AppColors.inkMuted;
    }
  }
}

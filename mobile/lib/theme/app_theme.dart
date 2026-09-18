import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Color tokens ported 1:1 from frontend/tailwind.config.js so the mobile
/// app visually matches the web HRMS.
class AppColors {
  AppColors._();

  // brand (navy/indigo) scale
  static const brand50 = Color(0xFFEEF1F8);
  static const brand100 = Color(0xFFD7DDEF);
  static const brand200 = Color(0xFFB0BBDF);
  static const brand300 = Color(0xFF8898CD);
  static const brand400 = Color(0xFF5C6FAB);
  static const brand500 = Color(0xFF374A85);
  static const brand600 = Color(0xFF2C3968);
  static const brand700 = Color(0xFF232C54);
  static const brand800 = Color(0xFF1C2344);
  static const brand900 = Color(0xFF161B35);
  static const brand950 = Color(0xFF0E1122);

  // accent (green) scale
  static const accent50 = Color(0xFFEEF7EE);
  static const accent100 = Color(0xFFD7ECD8);
  static const accent200 = Color(0xFFB0D9B3);
  static const accent300 = Color(0xFF84C088);
  static const accent400 = Color(0xFF5DA562);
  static const accent500 = Color(0xFF3F8B45);
  static const accent600 = Color(0xFF337038);
  static const accent700 = Color(0xFF2A5A2F);
  static const accent800 = Color(0xFF224726);
  static const accent900 = Color(0xFF1B381E);

  static const surface = Color(0xFFFFFFFF);
  static const surfaceMuted = Color(0xFFF6F7FB);
  static const surfaceSubtle = Color(0xFFEEF0F6);

  static const ink = Color(0xFF1C2333);
  static const inkMuted = Color(0xFF5B6376);
  static const inkFaint = Color(0xFF8B93A7);

  static const danger = Color(0xFFDC2626);
  static const dangerBg = Color(0xFFFEF2F2);
  static const warning = Color(0xFFB45309);
  static const warningBg = Color(0xFFFFFBEB);
}

class AppRadius {
  AppRadius._();
  static const card = 14.0;
  static const panel = 18.0;
}

class AppTheme {
  AppTheme._();

  static ThemeData get light {
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
        brightness: Brightness.light,
      ),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.brand900,
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
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
          side: const BorderSide(color: AppColors.surfaceSubtle),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.surfaceSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.surfaceSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.brand500, width: 1.5),
        ),
        hintStyle: const TextStyle(color: AppColors.inkFaint),
        labelStyle: const TextStyle(color: AppColors.inkMuted),
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
          side: const BorderSide(color: AppColors.surfaceSubtle),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.surfaceSubtle, thickness: 1),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.brand900,
        contentTextStyle: const TextStyle(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      // Same dark navy palette as the home screen's app bar, instead of a
      // plain white bar with a green highlight.
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
        return const Color(0xFFFEF3C7);
      case 'rejected':
      case 'inactive':
      case 'absent':
        return const Color(0xFFFEE2E2);
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
        return const Color(0xFFB45309);
      case 'rejected':
      case 'inactive':
      case 'absent':
        return const Color(0xFFB91C1C);
      default:
        return AppColors.inkMuted;
    }
  }
}

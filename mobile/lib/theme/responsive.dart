import 'package:flutter/material.dart';

/// Size + MediaQuery based responsive helpers.
///
/// Everything is scaled against a reference design of 390 x 844 logical px
/// (iPhone 14/15/16/17 portrait — the device the screens were laid out on).
/// On wider or narrower screens the values scale proportionally, with sane
/// clamps so nothing collapses or explodes on tablets / small phones.
///
/// Usage:
///   context.w(16)      -> width-proportional spacing / sizes
///   context.h(24)      -> height-proportional spacing
///   context.sp(14)     -> font size (scales with width, clamped, honours
///                          the user's text-scale setting via the widget)
///   context.r(12)      -> radius / square sizes (min of w/h scale)
///   context.screenW / context.screenH
///   context.isSmallPhone / context.isTablet
class ResponsiveConfig {
  static const double baseWidth = 390;
  static const double baseHeight = 844;

  /// Clamp the width scale factor so tablets don't get comically large text
  /// and tiny phones stay readable.
  static const double minScale = 0.85;
  static const double maxScale = 1.30;
}

extension ResponsiveContext on BuildContext {
  Size get screenSize => MediaQuery.sizeOf(this);
  double get screenW => screenSize.width;
  double get screenH => screenSize.height;

  EdgeInsets get safePadding => MediaQuery.paddingOf(this);
  double get textScale => MediaQuery.textScalerOf(this).scale(1);

  bool get isSmallPhone => screenW < 360;
  bool get isTablet => screenW >= 600;
  bool get isLandscape =>
      MediaQuery.orientationOf(this) == Orientation.landscape;

  double get _wScale => (screenW / ResponsiveConfig.baseWidth)
      .clamp(ResponsiveConfig.minScale, ResponsiveConfig.maxScale);

  double get _hScale {
    // On very tall/short screens keep height scaling gentle.
    final raw = screenH / ResponsiveConfig.baseHeight;
    return raw.clamp(0.85, 1.15);
  }

  /// Width-proportional value (spacing, horizontal sizes, icon boxes).
  double w(double value) => value * _wScale;

  /// Height-proportional value (vertical spacing, section gaps).
  double h(double value) => value * _hScale;

  /// Square / radius value — uses the smaller of the two scales.
  double r(double value) => value * (_wScale < _hScale ? _wScale : _hScale);

  /// Font size — scales with width only (not height) and is clamped tighter
  /// so text stays proportionate. Combine with a global textScaler clamp.
  double sp(double value) {
    final scale = (screenW / ResponsiveConfig.baseWidth).clamp(0.9, 1.2);
    return value * scale;
  }

  /// Fraction of screen width / height (0..1).
  double wf(double fraction) => screenW * fraction;
  double hf(double fraction) => screenH * fraction;

  /// Responsive column count for card grids.
  int gridColumns({int phone = 2, int tablet = 3}) => isTablet ? tablet : phone;
}

/// Clamps the OS text-scale so an XXL accessibility font can't break fixed
/// layouts. Wrap the app's [MaterialApp] builder with this.
Widget clampTextScale(BuildContext context, Widget? child) {
  final mq = MediaQuery.of(context);
  return MediaQuery(
    data: mq.copyWith(
      textScaler: TextScaler.linear(
        mq.textScaler.scale(1).clamp(0.9, 1.3),
      ),
    ),
    child: child ?? const SizedBox.shrink(),
  );
}

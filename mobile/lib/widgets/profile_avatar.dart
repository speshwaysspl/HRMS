import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Round employee photo (the ID-card `profileImage` data URL), falling back to
/// initials. Used in the drawer header and Profile screen, like nutri_hrms.
class ProfileAvatar extends StatelessWidget {
  final String? photo;
  final String name;
  final double size;
  final Color borderColor;
  const ProfileAvatar({super.key, this.photo, required this.name, required this.size, this.borderColor = Colors.white});

  static Uint8List? _decode(String? dataUrl) {
    final s = dataUrl ?? '';
    final i = s.indexOf('base64,');
    if (i < 0) return null;
    try {
      return base64Decode(s.substring(i + 7));
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bytes = _decode(photo);
    final initials = name.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2).map((p) => p[0]).join().toUpperCase();
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.brand100,
        border: Border.all(color: borderColor, width: 2),
      ),
      alignment: Alignment.center,
      child: bytes != null
          ? Image.memory(bytes, width: size, height: size, fit: BoxFit.cover, gaplessPlayback: true)
          : Text(initials.isEmpty ? '?' : initials,
              style: TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w700, fontSize: size * 0.36)),
    );
  }
}

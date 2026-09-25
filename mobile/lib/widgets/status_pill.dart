import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

class StatusPill extends StatelessWidget {
  final String label;
  const StatusPill({super.key, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: context.w(10), vertical: context.h(4)),
      decoration: BoxDecoration(
        color: StatusColors.bg(label),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: StatusColors.fg(label).withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: context.r(6),
            height: context.r(6),
            decoration: BoxDecoration(color: StatusColors.fg(label), shape: BoxShape.circle),
          ),
          SizedBox(width: context.w(6)),
          Text(
            label,
            style: TextStyle(
              color: StatusColors.fg(label),
              fontSize: context.sp(12),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

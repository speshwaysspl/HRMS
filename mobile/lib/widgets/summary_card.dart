import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

class SummaryCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? iconColor;
  final Color? iconBg;

  const SummaryCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.iconColor,
    this.iconBg,
  });

  @override
  Widget build(BuildContext context) {
    final box = context.r(44);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: context.w(12),
        vertical: context.h(10),
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Row(
        children: [
          Container(
            width: box,
            height: box,
            decoration: BoxDecoration(
              color: iconBg ?? AppColors.brand50,
              borderRadius: BorderRadius.circular(context.r(10)),
            ),
            child: Icon(icon, color: iconColor ?? AppColors.brand600, size: context.r(22)),
          ),
          SizedBox(width: context.w(12)),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    value,
                    style: TextStyle(
                      fontSize: context.sp(18),
                      fontWeight: FontWeight.w700,
                      color: AppColors.ink,
                    ),
                  ),
                ),
                SizedBox(height: context.h(2)),
                Text(
                  label,
                  style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

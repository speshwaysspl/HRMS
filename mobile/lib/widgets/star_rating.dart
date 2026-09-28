import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Task rating (1-5) given by the team lead. Read-only unless [onChanged] is
/// set; tapping the current value again clears it (reports 0).
class StarRating extends StatelessWidget {
  const StarRating({
    super.key,
    required this.value,
    this.onChanged,
    this.size = 16,
  });

  final int value;
  final ValueChanged<int>? onChanged;
  final double size;

  static const _amber = Color(0xFFF59E0B);

  @override
  Widget build(BuildContext context) {
    final editable = onChanged != null;
    return Semantics(
      label: value > 0 ? 'Rated $value out of 5' : 'Not rated',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var n = 1; n <= 5; n++)
            editable
                ? IconButton(
                    tooltip: '$n star${n > 1 ? 's' : ''}',
                    visualDensity: VisualDensity.compact,
                    onPressed: () => onChanged!(value == n ? 0 : n),
                    icon: _star(n),
                  )
                : Padding(
                    padding: const EdgeInsets.only(right: 1),
                    child: _star(n),
                  ),
        ],
      ),
    );
  }

  Widget _star(int n) => Icon(
    n <= value ? Icons.star_rounded : Icons.star_outline_rounded,
    size: size,
    color: n <= value ? _amber : AppColors.inkFaint,
  );
}

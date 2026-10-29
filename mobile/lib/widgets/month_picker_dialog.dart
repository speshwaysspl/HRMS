import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

/// Shows a polished, modern Month + Year picker modal sheet.
/// Returns the first day of the chosen month (e.g. 2026-10-01).
Future<DateTime?> showHrmsMonthPicker(
  BuildContext context, {
  DateTime? initial,
  DateTime? firstDate,
  DateTime? lastDate,
}) {
  final now = DateTime.now();
  final selected = initial ?? now;
  final minDate = firstDate ?? DateTime(2020, 1, 1);
  final maxDate = lastDate ?? DateTime(now.year + 2, 12, 31);

  return showModalBottomSheet<DateTime>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (ctx) {
      return _MonthPickerSheet(
        initial: selected,
        minDate: minDate,
        maxDate: maxDate,
      );
    },
  );
}

class _MonthPickerSheet extends StatefulWidget {
  final DateTime initial;
  final DateTime minDate;
  final DateTime maxDate;

  const _MonthPickerSheet({
    required this.initial,
    required this.minDate,
    required this.maxDate,
  });

  @override
  State<_MonthPickerSheet> createState() => _MonthPickerSheetState();
}

class _MonthPickerSheetState extends State<_MonthPickerSheet> {
  late int _year;
  late DateTime _selected;
  final _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _selected = widget.initial;
    _year = widget.initial.year;
  }

  void _prevYear() {
    if (_year > widget.minDate.year) {
      setState(() => _year--);
    }
  }

  void _nextYear() {
    if (_year < widget.maxDate.year) {
      setState(() => _year++);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canGoPrev = _year > widget.minDate.year;
    final canGoNext = _year < widget.maxDate.year;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(
        context.w(20),
        context.h(12),
        context.w(20),
        context.h(24) + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          SizedBox(height: context.h(14)),

          // Header: Year Navigator
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: canGoPrev ? _prevYear : null,
                color: canGoPrev ? AppColors.ink : AppColors.inkFaint,
                tooltip: 'Previous Year',
              ),
              InkWell(
                onTap: () async {
                  final chosen = await showDialog<int>(
                    context: context,
                    builder: (dCtx) {
                      final yearList = List.generate(
                        widget.maxDate.year - widget.minDate.year + 1,
                        (i) => widget.minDate.year + i,
                      );
                      return SimpleDialog(
                        title: const Text('Select Year'),
                        children: yearList.map((y) {
                          return SimpleDialogOption(
                            onPressed: () => Navigator.pop(dCtx, y),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Text(
                                '$y',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: y == _year ? FontWeight.bold : FontWeight.normal,
                                  color: y == _year ? AppColors.accent600 : AppColors.ink,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      );
                    },
                  );
                  if (chosen != null) setState(() => _year = chosen);
                },
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: Row(
                    children: [
                      Text(
                        '$_year',
                        style: TextStyle(
                          fontSize: context.sp(18),
                          fontWeight: FontWeight.bold,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(Icons.arrow_drop_down, size: 20, color: AppColors.inkMuted),
                    ],
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: canGoNext ? _nextYear : null,
                color: canGoNext ? AppColors.ink : AppColors.inkFaint,
                tooltip: 'Next Year',
              ),
            ],
          ),
          const Divider(height: 20),

          // Months Grid (3 columns x 4 rows)
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 3,
            childAspectRatio: 2.1,
            mainAxisSpacing: context.h(10),
            crossAxisSpacing: context.w(10),
            children: List.generate(12, (index) {
              final monthNum = index + 1;
              final target = DateTime(_year, monthNum, 1);
              final isSelected = _selected.year == _year && _selected.month == monthNum;
              final isCurrent = _now.year == _year && _now.month == monthNum;
              final isOutOfRange = target.isBefore(DateTime(widget.minDate.year, widget.minDate.month, 1)) ||
                  target.isAfter(DateTime(widget.maxDate.year, widget.maxDate.month, 1));

              Color bg = AppColors.surfaceMuted;
              Color fg = AppColors.ink;
              Border? border;

              if (isSelected) {
                bg = AppColors.accent600;
                fg = Colors.white;
              } else if (isCurrent) {
                bg = AppColors.accent50;
                fg = AppColors.accent700;
                border = Border.all(color: AppColors.accent200);
              }

              return Material(
                color: isOutOfRange ? AppColors.surfaceMuted.withValues(alpha: 0.5) : bg,
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  onTap: isOutOfRange ? null : () => Navigator.pop(context, target),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: border,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      DateFormat.MMM().format(DateTime(2026, monthNum)),
                      style: TextStyle(
                        fontSize: context.sp(14),
                        fontWeight: isSelected || isCurrent ? FontWeight.w700 : FontWeight.w500,
                        color: isOutOfRange ? AppColors.inkFaint : fg,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
          SizedBox(height: context.h(16)),

          // Bottom Quick Action
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('Cancel', style: TextStyle(color: AppColors.inkMuted)),
              ),
              FilledButton.tonalIcon(
                onPressed: () {
                  final currentFirst = DateTime(_now.year, _now.month, 1);
                  Navigator.pop(context, currentFirst);
                },
                icon: const Icon(Icons.today, size: 16),
                label: const Text('This Month'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.accent50,
                  foregroundColor: AppColors.accent700,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_client.dart';
import '../../services/payroll_template_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/hrms_app_bar.dart';

class AdminPayrollTemplatesScreen extends StatefulWidget {
  const AdminPayrollTemplatesScreen({super.key});

  @override
  State<AdminPayrollTemplatesScreen> createState() => _AdminPayrollTemplatesScreenState();
}

class _AdminPayrollTemplatesScreenState extends State<AdminPayrollTemplatesScreen> {
  final _service = PayrollTemplateService();
  final _inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
  List<Map<String, dynamic>> _all = [];
  bool _loading = true;
  Object? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _service.getAll();
      if (!mounted) return;
      setState(() {
        _all = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _visible {
    if (_query.isEmpty) return _all;
    final q = _query.toLowerCase();
    return _all.where((t) {
      return (t['templateName'] ?? '').toString().toLowerCase().contains(q) ||
          (t['name'] ?? '').toString().toLowerCase().contains(q) ||
          (t['employeeId'] ?? '').toString().toLowerCase().contains(q);
    }).toList();
  }

  num _num(dynamic v) => v is num ? v : num.tryParse('$v') ?? 0;

  Future<void> _openDetail(Map<String, dynamic> t) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TemplateDetailSheet(
        template: t,
        inr: _inr,
        onSetDefault: () async {
          Navigator.pop(context);
          try {
            await _service.setDefault(t['_id'].toString());
            _load();
          } catch (e) {
            _snack(extractErrorMessage(e));
          }
        },
        onDelete: () async {
          Navigator.pop(context);
          final ok = await showDialog<bool>(
            context: context,
            builder: (_) => AlertDialog(
              title: const Text('Delete template?'),
              content: Text('“${t['templateName'] ?? 'Template'}” will be deactivated.'),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                TextButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Delete', style: TextStyle(color: AppColors.danger)),
                ),
              ],
            ),
          );
          if (ok == true) {
            try {
              await _service.remove(t['_id'].toString());
              _load();
            } catch (e) {
              _snack(extractErrorMessage(e));
            }
          }
        },
      ),
    );
  }

  void _snack(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visible;
    return Scaffold(
      appBar: HrmsAppBar(title: const Text('Payroll Templates')),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(context.w(16), context.h(12), context.w(16), context.h(4)),
            child: TextField(
              onChanged: (v) => setState(() => _query = v.trim()),
              decoration: const InputDecoration(
                hintText: 'Search by template, name or employee ID',
                prefixIcon: Icon(Icons.search, size: 20),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? ListView(
 padding: EdgeInsets.all(context.w(16)),
 children: const [SkeletonListTile(), SkeletonListTile(), SkeletonListTile(), SkeletonListTile()],
 )
                : _error != null
                    ? buildErrorState(_error!, _load)
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: visible.isEmpty
                            ? ListView(children: [
                                const SizedBox(height: 100),
                                EmptyStateView(
                                    icon: Icons.tune,
                                    title: _all.isEmpty ? 'No payroll templates' : 'No matching templates',
                                    subtitle: _all.isEmpty ? 'Templates will show up here.' : 'Try a different search.'),
                              ])
                            : ListView.builder(
                                padding: EdgeInsets.all(context.w(16)),
                                itemCount: visible.length,
                                itemBuilder: (_, i) {
                                  final t = visible[i];
                                  return SimpleCard(
                                      onTap: () => _openDetail(t),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(t['templateName']?.toString() ?? 'Template',
                                                    style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                                SizedBox(height: context.h(3)),
                                                Text(
                                                  '${t['name'] ?? ''} · ${t['employeeId'] ?? ''}  ·  net ${_inr.format(_num(t['netSalary']))}',
                                                  style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
                                                ),
                                              ],
                                            ),
                                          ),
                                          if (t['isDefault'] == true) ...[
                                            SizedBox(width: context.w(8)),
                                            const StatusPill(label: 'Default'),
                                          ],
                                        ],
                                      ),
                                    );
                                },
                              ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _TemplateDetailSheet extends StatelessWidget {
  final Map<String, dynamic> template;
  final NumberFormat inr;
  final VoidCallback onSetDefault;
  final VoidCallback onDelete;
  const _TemplateDetailSheet({
    required this.template,
    required this.inr,
    required this.onSetDefault,
    required this.onDelete,
  });

  num _n(dynamic v) => v is num ? v : num.tryParse('$v') ?? 0;

  @override
  Widget build(BuildContext context) {
    final t = template;
    return Container(
      padding: EdgeInsets.all(context.w(20)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(t['templateName']?.toString() ?? 'Template',
                style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
            SizedBox(height: context.h(2)),
            Text('${t['name'] ?? ''} · ${t['employeeId'] ?? ''}',
                style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
            SizedBox(height: context.h(16)),
            _group(context, 'Earnings', {
              'Basic salary': t['basicSalary'],
              'DA': t['da'],
              'HRA': t['hra'],
              'Conveyance': t['conveyance'],
              'Medical allowance': t['medicalallowances'],
              'Special allowance': t['specialallowances'],
            }),
            _group(context, 'Deductions', {
              'PF': t['pf'],
              'Professional tax': t['proftax'],
              'Other deductions': t['deductions'],
            }),
            const Divider(),
            _line(context, 'Net salary', inr.format(_n(t['netSalary'])), bold: true),
            SizedBox(height: context.h(16)),
            if (t['isDefault'] != true)
              OutlinedButton.icon(
                onPressed: onSetDefault,
                icon: const Icon(Icons.star_outline, size: 18),
                label: const Text('Set as default'),
              ),
            SizedBox(height: context.h(8)),
            OutlinedButton.icon(
              onPressed: onDelete,
              icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
              label: const Text('Delete template', style: TextStyle(color: AppColors.danger)),
            ),
            SizedBox(height: context.h(8)),
          ],
        ),
      ),
    );
  }

  Widget _group(BuildContext context, String title, Map<String, dynamic> rows) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.only(top: context.h(6), bottom: context.h(4)),
            child: Text(title,
                style: TextStyle(fontSize: context.sp(12), fontWeight: FontWeight.w700, color: AppColors.inkMuted)),
          ),
          ...rows.entries.map((e) => _line(context, e.key, inr.format(_n(e.value)))),
        ],
      );

  Widget _line(BuildContext context, String label, String value, {bool bold = false}) => Padding(
        padding: EdgeInsets.symmetric(vertical: context.h(3)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: context.sp(bold ? 14 : 13), color: AppColors.ink, fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
            Text(value, style: TextStyle(fontSize: context.sp(bold ? 14 : 13), color: AppColors.ink, fontWeight: bold ? FontWeight.w700 : FontWeight.w500)),
          ],
        ),
      );
}

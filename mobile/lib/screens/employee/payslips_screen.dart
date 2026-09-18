import 'package:intl/intl.dart';
import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';
import '../../main.dart';
import '../../services/api_client.dart';
import '../../services/payslip_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';

class PayslipsScreen extends StatefulWidget {
  final String employeeCode;
  const PayslipsScreen({super.key, required this.employeeCode});

  @override
  State<PayslipsScreen> createState() => _PayslipsScreenState();
}

class _PayslipsScreenState extends State<PayslipsScreen> {
  final _service = PayslipService();
  final _inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String? _error;
  Object? _lastError;
  String? _downloadingId;

  @override
  void initState() {
    super.initState();
    final cache = AppCaches.of(context).payslipHistory;
    if (cache.hasData) {
      _items = cache.data!;
      _loading = false;
      _load(silent: true);
    } else {
      _load();
    }
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
        _lastError = null;
      });
    }
    try {
      final data = await _service.getHistory(widget.employeeCode);
      if (!mounted) return;
      AppCaches.of(context).payslipHistory.set(data);
      setState(() {
        _items = data;
        _loading = false;
        _error = null;
        _lastError = null;
      });
    } catch (e) {
      if (!mounted) return;
      if (silent && _items.isNotEmpty) return;
      setState(() {
        _error = extractErrorMessage(e);
        _lastError = e;
        _loading = false;
      });
    }
  }

  Future<void> _download(Map<String, dynamic> p) async {
    final id = p['_id'].toString();
    setState(() => _downloadingId = id);
    try {
      final file = await _service.downloadPayslip(id);
      await OpenFilex.open(file.path);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _downloadingId = null);
    }
  }

  void _openPreview(Map<String, dynamic> p) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _PayslipPreviewSheet(
        payslip: p,
        formatCurrency: _inr,
        downloading: _downloadingId == p['_id'].toString(),
        onDownload: () => _download(p),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceMuted,
      appBar: AppBar(title: const Text('Payslips')),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: [
                SkeletonCard(height: context.h(140)),
                SizedBox(height: context.h(10)),
                SkeletonCard(height: context.h(140)),
                SizedBox(height: context.h(10)),
                SkeletonCard(height: context.h(140)),
              ],
            )
          : _error != null
              ? buildErrorState(_lastError ?? _error!, _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          EmptyStateView(icon: Icons.receipt_long_outlined, title: 'No payslips generated yet', subtitle: 'Your monthly payslips will appear here once issued.'),
                        ])
                      : ListView.separated(
                          padding: EdgeInsets.all(context.w(16)),
                          itemCount: _items.length,
                          separatorBuilder: (_, _) => SizedBox(height: context.h(10)),
                          itemBuilder: (_, i) => _PayslipCard(
                            payslip: _items[i],
                            formatCurrency: _inr,
                            downloading: _downloadingId == _items[i]['_id'].toString(),
                            onTap: () => _openPreview(_items[i]),
                            onDownload: () => _download(_items[i]),
                          ),
                        ),
                ),
    );
  }
}

class _PayslipCard extends StatelessWidget {
  final Map<String, dynamic> payslip;
  final NumberFormat formatCurrency;
  final bool downloading;
  final VoidCallback onTap;
  final VoidCallback onDownload;

  const _PayslipCard({
    required this.payslip,
    required this.formatCurrency,
    required this.downloading,
    required this.onTap,
    required this.onDownload,
  });

  @override
  Widget build(BuildContext context) {
    final net = num.tryParse(payslip['netSalary']?.toString() ?? '') ?? 0;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(context.r(16)),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF3F0FF), Colors.white],
        ),
        border: Border.all(color: const Color(0xFFE4DEFF)),
        boxShadow: [
          BoxShadow(color: AppColors.brand500.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.all(context.w(14)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Month icon chip — brand → accent gradient for a bit of
                // colour without straying from the app's two-tone palette.
                Container(
                  width: context.r(46),
                  height: context.r(46),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF7C3AED), Color(0xFF2563EB)],
                    ),
                    borderRadius: BorderRadius.circular(context.r(13)),
                  ),
                  child: Icon(Icons.receipt_long_rounded, color: Colors.white, size: context.r(23)),
                ),
                SizedBox(width: context.w(12)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${payslip['monthName']} ${payslip['year']}',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: context.sp(14.5), color: AppColors.ink),
                      ),
                      SizedBox(height: context.h(4)),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: context.w(8), vertical: context.h(3)),
                        decoration: BoxDecoration(
                          color: AppColors.accent100,
                          borderRadius: BorderRadius.circular(context.r(20)),
                        ),
                        child: Text(
                          'Net pay: ${formatCurrency.format(net)}',
                          style: TextStyle(color: AppColors.accent800, fontWeight: FontWeight.w700, fontSize: context.sp(12)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: context.h(12)),
            // Explicit Preview + Download actions instead of a single
            // tap-anywhere-to-preview card.
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onTap,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF7C3AED),
                      side: const BorderSide(color: Color(0xFFD8CCFB)),
                      backgroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(vertical: context.h(11)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(context.r(11))),
                    ),
                    icon: Icon(Icons.visibility_outlined, size: context.r(17)),
                    label: Text('Preview', style: TextStyle(fontSize: context.sp(13), fontWeight: FontWeight.w600)),
                  ),
                ),
                SizedBox(width: context.w(10)),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: downloading ? null : onDownload,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: EdgeInsets.symmetric(vertical: context.h(11)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(context.r(11))),
                    ),
                    icon: downloading
                        ? SizedBox(
                            width: context.r(15),
                            height: context.r(15),
                            child: const CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Icon(Icons.download_rounded, size: context.r(17)),
                    label: Text(
                      downloading ? 'Opening…' : 'Download',
                      style: TextStyle(fontSize: context.sp(13), fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PayslipPreviewSheet extends StatelessWidget {
  final Map<String, dynamic> payslip;
  final NumberFormat formatCurrency;
  final bool downloading;
  final VoidCallback onDownload;

  const _PayslipPreviewSheet({
    required this.payslip,
    required this.formatCurrency,
    required this.downloading,
    required this.onDownload,
  });

  num _n(dynamic v) => num.tryParse(v?.toString() ?? '') ?? 0;

  @override
  Widget build(BuildContext context) {
    final earnings = <String, num>{
      'Basic Salary': _n(payslip['basicSalary']),
      'DA': _n(payslip['da']),
      'HRA': _n(payslip['hra']),
      'Conveyance': _n(payslip['conveyance']),
      'Medical Allowance': _n(payslip['medicalallowances']),
      'Special Allowance': _n(payslip['specialallowances']),
    };
    final totalEarnings = earnings.values.fold<num>(0, (a, b) => a + b);

    final deductions = <String, num>{
      'Professional Tax': _n(payslip['proftax']),
      'PF': _n(payslip['pf']),
      'Loss of Pay': _n(payslip['lopamount']),
      'Other Deductions': _n(payslip['deductions']),
    };
    final totalDeductions = deductions.values.fold<num>(0, (a, b) => a + b);
    final netPay = _n(payslip['netSalary']);

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            SizedBox(height: context.h(10)),
            Container(
              width: context.w(40),
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(context.w(20), context.h(14), context.w(20), 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${payslip['monthName']} ${payslip['year']}',
                    style: TextStyle(fontSize: context.sp(18), fontWeight: FontWeight.w800, color: AppColors.ink),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: EdgeInsets.fromLTRB(context.w(20), 0, context.w(20), context.h(20)),
                children: [
                  Container(
                    padding: EdgeInsets.all(context.w(16)),
                    decoration: BoxDecoration(
                      color: AppColors.accent50,
                      borderRadius: BorderRadius.circular(context.r(14)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Net Pay', style: TextStyle(color: AppColors.accent700, fontSize: context.sp(12), fontWeight: FontWeight.w600)),
                        SizedBox(height: context.h(4)),
                        Text(
                          formatCurrency.format(netPay),
                          style: TextStyle(color: AppColors.ink, fontSize: context.sp(26), fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: context.h(20)),
                  _sectionLabel(context, 'Earnings'),
                  ...earnings.entries.map((e) => _row(context, e.key, e.value)),
                  _totalRow(context, 'Total Earnings', totalEarnings, color: AppColors.accent700),
                  SizedBox(height: context.h(18)),
                  _sectionLabel(context, 'Deductions'),
                  ...deductions.entries.map((e) => _row(context, e.key, e.value)),
                  _totalRow(context, 'Total Deductions', totalDeductions, color: AppColors.danger),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(context.w(20), 0, context.w(20), context.h(20)),
              child: SizedBox(
                width: double.infinity,
                height: context.h(50),
                child: ElevatedButton.icon(
                  onPressed: downloading ? null : onDownload,
                  icon: downloading
                      ? SizedBox(
                          width: 16,
                          height: 16,
                          child: const CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.download_rounded, size: 18),
                  label: Text(downloading ? 'Opening…' : 'Download PDF'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(BuildContext context, String text) => Padding(
        padding: EdgeInsets.only(bottom: context.h(8)),
        child: Text(
          text,
          style: TextStyle(fontSize: context.sp(13), fontWeight: FontWeight.w700, color: AppColors.inkMuted),
        ),
      );

  Widget _row(BuildContext context, String label, num value) => Padding(
        padding: EdgeInsets.symmetric(vertical: context.h(5)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: context.sp(13.5), color: AppColors.ink)),
            Text(formatCurrency.format(value), style: TextStyle(fontSize: context.sp(13.5), color: AppColors.ink, fontWeight: FontWeight.w600)),
          ],
        ),
      );

  Widget _totalRow(BuildContext context, String label, num value, {required Color color}) => Padding(
        padding: EdgeInsets.only(top: context.h(8)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w700, color: AppColors.ink)),
            Text(formatCurrency.format(value), style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w800, color: color)),
          ],
        ),
      );
}

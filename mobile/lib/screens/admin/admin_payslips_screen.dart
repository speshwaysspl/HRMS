import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';

import '../../services/api_client.dart';
import '../../services/payslip_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import 'admin_payslip_generator_screen.dart';

class AdminPayslipsScreen extends StatefulWidget {
  const AdminPayslipsScreen({super.key});

  @override
  State<AdminPayslipsScreen> createState() => _AdminPayslipsScreenState();
}

class _AdminPayslipsScreenState extends State<AdminPayslipsScreen> {
  final _service = PayslipService();
  List<Map<String, dynamic>> _all = [];
  bool _loading = true;
  String? _error;
  String _query = '';
  final _inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

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
      final data = await _service.getAllHistory();
      if (!mounted) return;
      setState(() {
        _all = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = extractErrorMessage(e);
        _loading = false;
      });
    }
  }

  Future<void> _download(Map<String, dynamic> p) async {
    try {
      final file = await _service.downloadPayslip(p['_id'].toString());
      await OpenFilex.open(file.path);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    }
  }

  List<Map<String, dynamic>> get _visible {
    if (_query.isEmpty) return _all;
    final q = _query.toLowerCase();
    return _all.where((p) {
      return (p['name'] ?? '').toString().toLowerCase().contains(q) ||
          (p['employeeId'] ?? '').toString().toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payslips')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final made = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const AdminPayslipGeneratorScreen()),
          );
          if (made == true) _load();
        },
        icon: const Icon(Icons.add),
        label: const Text('Generate'),
      ),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(context.w(16), context.h(12), context.w(16), context.h(4)),
            child: TextField(
              onChanged: (v) => setState(() => _query = v.trim()),
              decoration: const InputDecoration(
                hintText: 'Search by name or employee ID',
                prefixIcon: Icon(Icons.search, size: 20),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: _visible.isEmpty
                            ? ListView(children: const [
                                SizedBox(height: 100),
                                CenteredMessage(icon: Icons.receipt_long_outlined, message: 'No payslips generated yet.'),
                              ])
                            : ListView(
                                padding: EdgeInsets.all(context.w(16)),
                                children: _visible.map(_row).toList(),
                              ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _row(Map<String, dynamic> p) {
    num net = 0;
    final raw = p['netSalary'];
    if (raw is num) net = raw;
    if (raw is String) net = num.tryParse(raw) ?? 0;

    return SimpleCard(
      onTap: () => _download(p),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${p['name'] ?? 'Employee'}  ·  ${p['employeeId'] ?? ''}',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                SizedBox(height: context.h(3)),
                Text(
                  '${p['monthName'] ?? ''} ${p['year'] ?? ''}   ·   Net ${_inr.format(net)}'
                  '${(p['lopDays'] ?? 0) != 0 ? '   ·   LOP ${p['lopDays']}d' : ''}',
                  style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
                ),
              ],
            ),
          ),
          SizedBox(width: context.w(8)),
          Icon(Icons.download_outlined, color: AppColors.brand600, size: context.r(22)),
        ],
      ),
    );
  }
}

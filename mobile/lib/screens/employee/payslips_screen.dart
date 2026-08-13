import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';
import '../../services/api_client.dart';
import '../../services/payslip_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/simple_list_tile.dart';

class PayslipsScreen extends StatefulWidget {
  final String employeeCode;
  const PayslipsScreen({super.key, required this.employeeCode});

  @override
  State<PayslipsScreen> createState() => _PayslipsScreenState();
}

class _PayslipsScreenState extends State<PayslipsScreen> {
  final _service = PayslipService();
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String? _error;

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
      final data = await _service.getHistory(widget.employeeCode);
      if (!mounted) return;
      setState(() {
        _items = data;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payslips')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          CenteredMessage(icon: Icons.receipt_long_outlined, message: 'No payslips generated yet.'),
                        ])
                      : ListView(
                          padding: const EdgeInsets.all(16),
                          children: _items.map((p) => SimpleCard(
                                onTap: () => _download(p),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('${p['monthName']} ${p['year']}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                          const SizedBox(height: 3),
                                          Text('Net: ₹${p['netSalary']}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                                        ],
                                      ),
                                    ),
                                    const Icon(Icons.download_outlined, color: AppColors.brand600),
                                  ],
                                ),
                              )).toList(),
                        ),
                ),
    );
  }
}

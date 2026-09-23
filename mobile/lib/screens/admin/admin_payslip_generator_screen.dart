import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_client.dart';
import '../../services/payslip_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/hrms_app_bar.dart';

const _months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/// Single-employee payslip generator. Fetch prefills earnings/deductions from
/// the employee's default payroll template; totals recompute live; Generate
/// persists the payslip (POST /api/payslip/generate).
class AdminPayslipGeneratorScreen extends StatefulWidget {
  const AdminPayslipGeneratorScreen({super.key});

  @override
  State<AdminPayslipGeneratorScreen> createState() => _AdminPayslipGeneratorScreenState();
}

class _AdminPayslipGeneratorScreenState extends State<AdminPayslipGeneratorScreen> {
  final _service = PayslipService();
  final _inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

  final _empCode = TextEditingController();
  final _name = TextEditingController();
  final _designation = TextEditingController();
  final _department = TextEditingController();
  final _location = TextEditingController();
  final _bankName = TextEditingController();
  final _bankAcc = TextEditingController();
  final _pan = TextEditingController();
  final _uan = TextEditingController();
  final _workingDays = TextEditingController(text: '30');
  final _lopDays = TextEditingController(text: '0');

  // earnings + deductions
  final _c = <String, TextEditingController>{
    for (final k in [
      'basicSalary', 'da', 'hra', 'conveyance', 'medicalallowances', 'specialallowances',
      'pf', 'proftax', 'deductions',
    ])
      k: TextEditingController(text: '0'),
  };

  int _month = DateTime.now().month;
  final _year = TextEditingController(text: '${DateTime.now().year}');
  String? _employeeObjectId;
  DateTime? _joiningDate;

  bool _fetching = false;
  bool _saving = false;

  @override
  void dispose() {
    for (final c in [
      _empCode, _name, _designation, _department, _location, _bankName, _bankAcc,
      _pan, _uan, _workingDays, _lopDays, _year, ..._c.values,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  double _n(String? s) => double.tryParse((s ?? '').trim()) ?? 0;

  double get _totalEarnings =>
      ['basicSalary', 'da', 'hra', 'conveyance', 'medicalallowances', 'specialallowances']
          .fold(0.0, (sum, k) => sum + _n(_c[k]!.text));

  double get _lopAmount {
    final wd = _n(_workingDays.text);
    final lop = _n(_lopDays.text);
    if (wd <= 0 || lop <= 0) return 0;
    return (_totalEarnings / wd) * lop;
  }

  double get _totalDeductions =>
      ['pf', 'proftax', 'deductions'].fold(0.0, (sum, k) => sum + _n(_c[k]!.text)) + _lopAmount;

  double get _net => (_totalEarnings - _totalDeductions).clamp(0, double.infinity);

  Future<void> _fetch() async {
    final code = _empCode.text.trim();
    if (code.isEmpty) return;
    setState(() => _fetching = true);
    try {
      final e = await _service.getEmployeePayrollDetails(code);
      final t = (e['template'] as Map?) ?? {};
      setState(() {
        _employeeObjectId = e['_id']?.toString();
        _name.text = e['name']?.toString() ?? '';
        _designation.text = e['designation']?.toString() ?? '';
        _department.text = e['department']?.toString() ?? '';
        _location.text = e['location']?.toString() ?? '';
        _bankName.text = e['bankname']?.toString() ?? '';
        _bankAcc.text = e['bankaccountnumber']?.toString() ?? '';
        _pan.text = e['pan']?.toString() ?? '';
        _uan.text = e['uan']?.toString() ?? '';
        _joiningDate = DateTime.tryParse(e['joiningDate']?.toString() ?? '');
        for (final k in _c.keys) {
          final v = t[k];
          if (v is num) _c[k]!.text = v.toStringAsFixed(0);
        }
      });
      if (t.isEmpty) _snack('No payroll template for this employee — fill amounts manually.');
    } catch (e) {
      _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _fetching = false);
    }
  }

  Future<void> _generate() async {
    if (_name.text.trim().isEmpty) {
      _snack('Fetch an employee first');
      return;
    }
    setState(() => _saving = true);
    final payload = {
      'employeeId': _empCode.text.trim(),
      if (_employeeObjectId != null) 'employeeObjectId': _employeeObjectId,
      'name': _name.text.trim(),
      'designation': _designation.text.trim(),
      'department': _department.text.trim(),
      'location': _location.text.trim(),
      'bankname': _bankName.text.trim(),
      'bankaccountnumber': _bankAcc.text.trim(),
      'pan': _pan.text.trim(),
      'uan': _uan.text.trim(),
      if (_joiningDate != null) 'joiningDate': _joiningDate!.toIso8601String(),
      'monthName': _months[_month - 1],
      'month': _month,
      'year': int.tryParse(_year.text.trim()) ?? DateTime.now().year,
      'workingdays': _n(_workingDays.text),
      'lopDays': _n(_lopDays.text),
      'lopamount': double.parse(_lopAmount.toStringAsFixed(2)),
      for (final k in _c.keys) k: _n(_c[k]!.text),
    };
    try {
      await _service.generate(payload);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payslip generated')));
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _snack(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: HrmsAppBar(title: const Text('Generate Payslip')),
      body: ListView(
        padding: EdgeInsets.all(context.w(16)),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextField(
                  controller: _empCode,
                  decoration: const InputDecoration(labelText: 'Employee ID'),
                ),
              ),
              SizedBox(width: context.w(10)),
              SizedBox(
                height: context.h(48),
                child: ElevatedButton(
                  onPressed: _fetching ? null : _fetch,
                  child: _fetching
                      ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Fetch'),
                ),
              ),
            ],
          ),
          if (_name.text.isNotEmpty) ...[
            SizedBox(height: context.h(6)),
            Text('${_name.text} · ${_designation.text}',
                style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
          ],
          SizedBox(height: context.h(14)),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<int>(
                  initialValue: _month,
                  decoration: const InputDecoration(labelText: 'Month'),
                  items: [
                    for (var i = 1; i <= 12; i++) DropdownMenuItem(value: i, child: Text(_months[i - 1])),
                  ],
                  onChanged: (v) => setState(() => _month = v ?? _month),
                ),
              ),
              SizedBox(width: context.w(10)),
              Expanded(child: _num(_year, 'Year')),
            ],
          ),
          SizedBox(height: context.h(6)),
          Row(
            children: [
              Expanded(child: _num(_workingDays, 'Working days')),
              SizedBox(width: context.w(10)),
              Expanded(child: _num(_lopDays, 'LOP days')),
            ],
          ),
          _sectionLabel('Earnings'),
          _num(_c['basicSalary']!, 'Basic salary'),
          _num(_c['da']!, 'DA'),
          _num(_c['hra']!, 'HRA'),
          _num(_c['conveyance']!, 'Conveyance'),
          _num(_c['medicalallowances']!, 'Medical allowance'),
          _num(_c['specialallowances']!, 'Special allowance'),
          _sectionLabel('Deductions'),
          _num(_c['pf']!, 'PF'),
          _num(_c['proftax']!, 'Professional tax'),
          _num(_c['deductions']!, 'Other deductions'),
          _sectionLabel('Bank & IDs'),
          _text(_bankName, 'Bank name'),
          _text(_bankAcc, 'Account number'),
          _text(_pan, 'PAN'),
          _text(_uan, 'UAN'),
          _text(_location, 'Location'),
          SizedBox(height: context.h(16)),
          Container(
            padding: EdgeInsets.all(context.w(14)),
            decoration: BoxDecoration(
              color: AppColors.brand50,
              borderRadius: BorderRadius.circular(AppRadius.card),
            ),
            child: Column(
              children: [
                _totalRow('Total earnings', _totalEarnings),
                _totalRow('LOP amount', -_lopAmount),
                _totalRow('Total deductions', -_totalDeductions),
                const Divider(),
                _totalRow('Net salary', _net, bold: true),
              ],
            ),
          ),
          SizedBox(height: context.h(20)),
          ElevatedButton(
            onPressed: _saving ? null : _generate,
            child: _saving
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Generate payslip'),
          ),
          SizedBox(height: context.h(24)),
        ],
      ),
    );
  }

  Widget _sectionLabel(String s) => Padding(
        padding: EdgeInsets.only(top: context.h(18), bottom: context.h(6)),
        child: Text(s, style: TextStyle(fontSize: context.sp(13), fontWeight: FontWeight.w700, color: AppColors.inkMuted)),
      );

  Widget _num(TextEditingController c, String label) => Padding(
        padding: EdgeInsets.only(bottom: context.h(8)),
        child: TextField(
          controller: c,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(labelText: label),
        ),
      );

  Widget _text(TextEditingController c, String label) => Padding(
        padding: EdgeInsets.only(bottom: context.h(8)),
        child: TextField(controller: c, decoration: InputDecoration(labelText: label)),
      );

  Widget _totalRow(String label, double value, {bool bold = false}) => Padding(
        padding: EdgeInsets.symmetric(vertical: context.h(3)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: TextStyle(
                    fontSize: context.sp(bold ? 15 : 13),
                    fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                    color: AppColors.ink)),
            Text(_inr.format(value),
                style: TextStyle(
                    fontSize: context.sp(bold ? 15 : 13),
                    fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                    color: AppColors.ink)),
          ],
        ),
      );
}

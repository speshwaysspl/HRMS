import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_client.dart';
import '../../services/department_service.dart';
import '../../services/employee_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';

const _roleOptions = ['employee', 'team_lead', 'hr', 'admin'];

/// Add (existing == null) or edit an employee.
class AdminEmployeeFormScreen extends StatefulWidget {
  final Map<String, dynamic>? existing;
  const AdminEmployeeFormScreen({super.key, this.existing});

  @override
  State<AdminEmployeeFormScreen> createState() => _AdminEmployeeFormScreenState();
}

class _AdminEmployeeFormScreenState extends State<AdminEmployeeFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _employeeService = EmployeeService();
  final _departmentService = DepartmentService();

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _empId = TextEditingController();
  final _designation = TextEditingController();
  final _mobile = TextEditingController();
  final _salary = TextEditingController();
  final _password = TextEditingController();

  String? _gender;
  DateTime? _dob;
  DateTime? _joiningDate;
  String? _departmentId;
  final Set<String> _roles = {'employee'};

  List<Map<String, dynamic>> _departments = [];
  bool _loadingDepts = true;
  bool _saving = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    _prefill();
    _loadDepartments();
  }

  void _prefill() {
    final e = widget.existing;
    if (e == null) return;
    final user = e['userId'] as Map? ?? {};
    _name.text = user['name']?.toString() ?? '';
    _email.text = user['email']?.toString() ?? '';
    _empId.text = e['employeeId']?.toString() ?? '';
    _designation.text = e['designation']?.toString() ?? '';
    _mobile.text = e['mobilenumber']?.toString() ?? '';
    _salary.text = e['salaryPackage']?.toString() ?? '';
    _gender = e['gender']?.toString();
    _dob = _parse(e['dob']);
    _joiningDate = _parse(e['joiningDate']);
    final dept = e['department'];
    _departmentId = dept is Map ? dept['_id']?.toString() : dept?.toString();
    final rawRoles = user['role'];
    if (rawRoles is List && rawRoles.isNotEmpty) {
      _roles
        ..clear()
        ..addAll(rawRoles.map((r) => r.toString()));
    }
  }

  DateTime? _parse(dynamic v) {
    if (v == null) return null;
    try {
      return DateTime.parse(v.toString());
    } catch (_) {
      return null;
    }
  }

  Future<void> _loadDepartments() async {
    try {
      final d = await _departmentService.getDepartments();
      if (!mounted) return;
      setState(() {
        _departments = d;
        _loadingDepts = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingDepts = false);
    }
  }

  @override
  void dispose() {
    for (final c in [_name, _email, _empId, _designation, _mobile, _salary, _password]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate({required bool dob}) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: dob ? DateTime(now.year - 25) : now,
      firstDate: DateTime(1960),
      lastDate: DateTime(now.year + 1),
    );
    if (picked != null) {
      setState(() => dob ? _dob = picked : _joiningDate = picked);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_departmentId == null) {
      _snack('Please select a department');
      return;
    }
    if (_joiningDate == null) {
      _snack('Please select a joining date');
      return;
    }
    setState(() => _saving = true);
    final body = <String, dynamic>{
      'name': _name.text.trim(),
      'email': _email.text.trim(),
      'employeeId': _empId.text.trim(),
      'designation': _designation.text.trim(),
      'department': _departmentId,
      'gender': _gender,
      'mobilenumber': _mobile.text.trim(),
      'joiningDate': DateFormat('yyyy-MM-dd').format(_joiningDate!),
      if (_dob != null) 'dob': DateFormat('yyyy-MM-dd').format(_dob!),
      if (_salary.text.trim().isNotEmpty) 'salaryPackage': _salary.text.trim(),
      'role': _roles.toList(),
      if (!_isEdit) 'password': _password.text,
    };
    try {
      if (_isEdit) {
        await _employeeService.updateEmployee(widget.existing!['_id'].toString(), body);
      } else {
        await _employeeService.addEmployee(body);
      }
      if (mounted) Navigator.of(context).pop(true);
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
      appBar: AppBar(title: Text(_isEdit ? 'Edit Employee' : 'Add Employee')),
      body: ListView(
        padding: EdgeInsets.all(context.w(16)),
        children: [
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _field(_name, 'Full name', required: true),
                _field(_email, 'Email', required: true, keyboard: TextInputType.emailAddress),
                _field(_empId, 'Employee ID', required: true),
                _field(_designation, 'Designation', required: true),
                _field(_mobile, 'Mobile number', keyboard: TextInputType.phone),
                _field(_salary, 'Annual CTC (₹)', keyboard: TextInputType.number),
                SizedBox(height: context.h(12)),
                DropdownButtonFormField<String>(
                  initialValue: _gender,
                  decoration: const InputDecoration(labelText: 'Gender'),
                  items: const [
                    DropdownMenuItem(value: 'Male', child: Text('Male')),
                    DropdownMenuItem(value: 'Female', child: Text('Female')),
                    DropdownMenuItem(value: 'Other', child: Text('Other')),
                  ],
                  onChanged: (v) => setState(() => _gender = v),
                ),
                SizedBox(height: context.h(12)),
                _loadingDepts
                    ? const LinearProgressIndicator()
                    : DropdownButtonFormField<String>(
                        initialValue: _departmentId,
                        decoration: const InputDecoration(labelText: 'Department'),
                        items: _departments
                            .map((d) => DropdownMenuItem(
                                  value: d['_id'].toString(),
                                  child: Text(d['dep_name']?.toString() ?? ''),
                                ))
                            .toList(),
                        onChanged: (v) => setState(() => _departmentId = v),
                      ),
                SizedBox(height: context.h(12)),
                _dateRow('Date of birth', _dob, () => _pickDate(dob: true)),
                SizedBox(height: context.h(10)),
                _dateRow('Joining date', _joiningDate, () => _pickDate(dob: false)),
                SizedBox(height: context.h(16)),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Roles', style: TextStyle(fontSize: context.sp(13), color: AppColors.inkMuted)),
                ),
                SizedBox(height: context.h(6)),
                Wrap(
                  spacing: context.w(8),
                  children: _roleOptions.map((r) {
                    final on = _roles.contains(r);
                    return FilterChip(
                      label: Text(r.replaceAll('_', ' ')),
                      selected: on,
                      onSelected: (sel) => setState(() {
                        if (sel) {
                          _roles.add(r);
                        } else if (_roles.length > 1) {
                          _roles.remove(r);
                        }
                      }),
                    );
                  }).toList(),
                ),
                if (!_isEdit) ...[
                  SizedBox(height: context.h(12)),
                  _field(_password, 'Temporary password', required: true, obscure: true),
                ],
                SizedBox(height: context.h(24)),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_isEdit ? 'Save changes' : 'Create employee'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(
    TextEditingController c,
    String label, {
    bool required = false,
    bool obscure = false,
    TextInputType? keyboard,
  }) {
    return Padding(
      padding: EdgeInsets.only(bottom: context.h(6)),
      child: TextFormField(
        controller: c,
        obscureText: obscure,
        keyboardType: keyboard,
        decoration: InputDecoration(labelText: label),
        validator: required ? (v) => (v == null || v.trim().isEmpty) ? 'Required' : null : null,
      ),
    );
  }

  Widget _dateRow(String label, DateTime? value, VoidCallback onTap) {
    return OutlinedButton(
      onPressed: onTap,
      child: Row(
        children: [
          Icon(Icons.calendar_today_outlined, size: context.r(16), color: AppColors.inkMuted),
          SizedBox(width: context.w(8)),
          Text(value == null ? label : '$label: ${DateFormat('d MMM, yyyy').format(value)}'),
        ],
      ),
    );
  }
}

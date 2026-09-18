import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../services/api_client.dart';
import '../services/auth_provider.dart';
import '../services/employee_service.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/state_views.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _employeeService = EmployeeService();
  Map<String, dynamic>? _employeeData;
  bool _loading = true;
  String? _error;
  Object? _lastError;

  @override
  void initState() {
    super.initState();
    final cache = AppCaches.of(context).employeeProfile;
    if (cache.hasData) {
      _employeeData = cache.data;
      _loading = false;
      _fetchProfile(silent: true);
    } else {
      _fetchProfile();
    }
  }

  Future<void> _fetchProfile({bool silent = false}) async {
    final user = context.read<AuthProvider>().user;
    if (user == null || user.id.isEmpty) {
      setState(() => _loading = false);
      return;
    }

    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
        _lastError = null;
      });
    }

    try {
      final data = await _employeeService.getEmployee(user.id);
      if (!mounted) return;
      AppCaches.of(context).employeeProfile.set(data);
      setState(() {
        _employeeData = data;
        _loading = false;
        _error = null;
        _lastError = null;
      });
    } catch (e) {
      if (!mounted) return;
      if (silent && _employeeData != null) return;
      setState(() {
        _error = extractErrorMessage(e);
        _lastError = e;
        _loading = false;
      });
    }
  }

  void _copyToClipboard(String label, String value) {
    if (value.isEmpty || value == '--') return;
    Clipboard.setData(ClipboardData(text: value));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label copied to clipboard')),
    );
  }

  String _formatDate(dynamic dateVal) {
    if (dateVal == null) return '--';
    try {
      final dt = DateTime.parse(dateVal.toString());
      return DateFormat('d MMM, yyyy').format(dt);
    } catch (_) {
      return dateVal.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final emp = _employeeData ?? {};
    final dept = emp['department'] is Map ? emp['department']['dep_name'] : emp['department'];
    final status = (emp['status']?.toString() ?? 'active').toLowerCase();
    final isActive = status == 'active';
    final email = (user?.email.isNotEmpty == true)
        ? user!.email
        : (emp['userId'] is Map ? emp['userId']['email']?.toString() : null) ?? '--';

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchProfile,
        child: ListView(
          padding: EdgeInsets.all(context.w(16)),
          children: [
            // Header card — name/role/status, no avatar.
            Container(
              width: double.infinity,
              padding: EdgeInsets.fromLTRB(context.w(20), context.h(18), context.w(20), context.h(18)),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.brand800, AppColors.brand900],
                ),
                borderRadius: BorderRadius.circular(AppRadius.panel),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.brand900.withValues(alpha: 0.25),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.name ?? '',
                              style: TextStyle(
                                fontSize: context.sp(19),
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                            SizedBox(height: context.h(4)),
                            Text(
                              '${emp['designation'] ?? 'Employee'} · ${dept ?? ''}',
                              style: TextStyle(color: AppColors.brand200, fontSize: context.sp(13)),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: context.w(9), vertical: context.h(4)),
                        decoration: BoxDecoration(
                          color: isActive ? AppColors.accent500.withValues(alpha: 0.22) : AppColors.danger.withValues(alpha: 0.22),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: isActive ? AppColors.accent400 : AppColors.danger, width: 1),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: isActive ? AppColors.accent400 : AppColors.danger,
                                shape: BoxShape.circle,
                              ),
                            ),
                            SizedBox(width: context.w(5)),
                            Text(
                              isActive ? 'Active' : 'Inactive',
                              style: TextStyle(color: Colors.white, fontSize: context.sp(11), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if ((emp['employeeId'] ?? '').toString().isNotEmpty) ...[
                    SizedBox(height: context.h(14)),
                    InkWell(
                      onTap: () => _copyToClipboard('Employee ID', emp['employeeId'].toString()),
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: context.w(10), vertical: context.h(6)),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.badge_outlined, size: 14, color: Colors.white70),
                            SizedBox(width: context.w(6)),
                            Text(
                              'ID: ${emp['employeeId']}',
                              style: TextStyle(color: Colors.white, fontSize: context.sp(12), fontWeight: FontWeight.w600),
                            ),
                            SizedBox(width: context.w(6)),
                            const Icon(Icons.copy, size: 12, color: Colors.white70),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            SizedBox(height: context.h(16)),

            if (_loading)
              Column(
                children: [
                  SkeletonCard(height: context.h(160)),
                  SizedBox(height: context.h(14)),
                  SkeletonCard(height: context.h(160)),
                ],
              )
            else if (_error != null)
              Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: buildErrorState(_lastError ?? _error!, _fetchProfile),
              )
            else ...[
              // Personal Information Section (mirrors web employee-dashboard/profile)
              _buildSectionCard(
                title: 'Personal Information',
                icon: Icons.person_outline,
                iconColor: const Color(0xFF2563EB),
                iconBg: const Color(0xFFDBEAFE),
                items: [
                  _InfoRow('Email Address', email, isCopyable: true),
                  _InfoRow('Mobile Number', emp['mobilenumber']?.toString() ?? '--', isCopyable: true),
                  _InfoRow('Date of Birth', _formatDate(emp['dob'])),
                  _InfoRow('Gender', emp['gender']?.toString() ?? '--'),
                ],
              ),
              SizedBox(height: context.h(14)),

              // Employment Information Section (mirrors web employee-dashboard/profile)
              _buildSectionCard(
                title: 'Employment Information',
                icon: Icons.work_outline_rounded,
                iconColor: const Color(0xFF9333EA),
                iconBg: const Color(0xFFF3E8FF),
                items: [
                  _InfoRow('Department', dept?.toString() ?? '--'),
                  _InfoRow('Designation', emp['designation']?.toString() ?? '--'),
                  _InfoRow('Joining Date', _formatDate(emp['joiningDate'])),
                ],
              ),
              SizedBox(height: context.h(14)),

              // Account & Privacy Section
              _buildAccountPrivacyCard(context),
            ],

            SizedBox(height: context.h(20)),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<_InfoRow> items,
    Color iconColor = AppColors.brand600,
    Color iconBg = AppColors.brand50,
    Widget? trailing,
  }) {
    return Container(
      padding: EdgeInsets.all(context.w(16)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: context.r(30),
                height: context.r(30),
                decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
                child: Icon(icon, size: context.r(16), color: iconColor),
              ),
              SizedBox(width: context.w(10)),
              Text(
                title,
                style: TextStyle(
                  fontSize: context.sp(14),
                  fontWeight: FontWeight.w700,
                  color: AppColors.ink,
                ),
              ),
            ],
          ),
          Divider(height: context.h(20)),
          ...items.map((it) => Padding(
                padding: EdgeInsets.only(bottom: context.h(10)),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 4,
                      child: Text(
                        it.label,
                        style: TextStyle(
                          fontSize: context.sp(12),
                          color: AppColors.inkFaint,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 6,
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              it.value,
                              style: TextStyle(
                                fontSize: context.sp(13),
                                color: AppColors.ink,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (it.isCopyable && it.value != '--')
                            InkWell(
                              onTap: () => _copyToClipboard(it.label, it.value),
                              child: Padding(
                                padding: EdgeInsets.only(left: context.w(6)),
                                child: Icon(Icons.copy, size: context.r(14), color: AppColors.inkFaint),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              )),
          ?trailing,
        ],
      ),
    );
  }

  Widget _buildAccountPrivacyCard(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(context.w(16)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: context.r(30),
                height: context.r(30),
                decoration: const BoxDecoration(
                  color: Color(0xFFFEE2E2),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.shield_outlined, size: context.r(16), color: AppColors.danger),
              ),
              SizedBox(width: context.w(10)),
              Text(
                'Account & Privacy',
                style: TextStyle(
                  fontSize: context.sp(14),
                  fontWeight: FontWeight.w700,
                  color: AppColors.ink,
                ),
              ),
            ],
          ),
          Divider(height: context.h(20)),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Request Account Deletion',
                      style: TextStyle(
                        fontSize: context.sp(13),
                        fontWeight: FontWeight.w600,
                        color: AppColors.ink,
                      ),
                    ),
                    SizedBox(height: context.h(2)),
                    Text(
                      'Submit request to HR/Admin to verify & delete account',
                      style: TextStyle(
                        fontSize: context.sp(11),
                        color: AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.danger,
                  side: const BorderSide(color: AppColors.danger),
                  padding: EdgeInsets.symmetric(horizontal: context.w(12), vertical: context.h(8)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () => _showDeletionRequestSheet(context),
                child: Text('Request', style: TextStyle(fontSize: context.sp(12), fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showDeletionRequestSheet(BuildContext context) {
    final reasonCtrl = TextEditingController();
    bool busy = false;
    bool submitted = false;
    String successMessage = 'Account deletion request submitted to HR/Admin.';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          if (submitted) {
            return Container(
              padding: EdgeInsets.fromLTRB(context.w(20), context.h(24), context.w(20), context.h(24)),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
              ),
              child: SizedBox(
                height: context.h(360),
                child: SuccessView(
                  title: 'Request submitted',
                  subtitle: successMessage,
                  action: ElevatedButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text('Done'),
                  ),
                ),
              ),
            );
          }
          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
            child: Container(
              padding: EdgeInsets.all(context.w(20)),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(color: Color(0xFFFEE2E2), shape: BoxShape.circle),
                          child: const Icon(Icons.delete_outline, color: AppColors.danger, size: 20),
                        ),
                        SizedBox(width: context.w(10)),
                        Expanded(
                          child: Text(
                            'Request Account Deletion',
                            style: TextStyle(fontSize: context.sp(16), fontWeight: FontWeight.w700, color: AppColors.ink),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => Navigator.of(ctx).pop(),
                        ),
                      ],
                    ),
                    SizedBox(height: context.h(14)),
                    Container(
                      padding: EdgeInsets.all(context.w(12)),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Deletion Workflow:', style: TextStyle(fontSize: context.sp(12), fontWeight: FontWeight.w700, color: AppColors.ink)),
                          SizedBox(height: context.h(6)),
                          _stepRow(context, '1', 'Employee submits deletion request'),
                          _stepRow(context, '2', 'HR/Admin receives the request notification'),
                          _stepRow(context, '3', 'HR/Admin verifies identity & eligibility'),
                          _stepRow(context, '4', 'Account + eligible personal data deleted'),
                        ],
                      ),
                    ),
                    SizedBox(height: context.h(14)),
                    Text(
                      'Reason for Deletion (Optional)',
                      style: TextStyle(fontSize: context.sp(12), fontWeight: FontWeight.w600, color: AppColors.ink),
                    ),
                    SizedBox(height: context.h(6)),
                    TextField(
                      controller: reasonCtrl,
                      maxLines: 2,
                      decoration: InputDecoration(
                        hintText: 'e.g. Resigned from company, requesting data removal...',
                        hintStyle: TextStyle(fontSize: context.sp(12), color: AppColors.inkFaint),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: EdgeInsets.all(context.w(10)),
                      ),
                    ),
                    SizedBox(height: context.h(18)),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.danger,
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(vertical: context.h(12)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: busy
                          ? null
                          : () async {
                              setSheetState(() => busy = true);
                              try {
                                final res = await ApiClient.instance.dio.post(
                                  '/api/account/deletion-request',
                                  data: {'reason': reasonCtrl.text.trim()},
                                  options: Options(headers: {'x-client': 'mobile'}),
                                );
                                if (!ctx.mounted) return;
                                final msg = res.data?['message']?.toString() ??
                                    'Account deletion request submitted to HR/Admin.';
                                setSheetState(() {
                                  busy = false;
                                  submitted = true;
                                  successMessage = msg;
                                });
                              } catch (e) {
                                setSheetState(() => busy = false);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(extractErrorMessage(e)),
                                    backgroundColor: AppColors.danger,
                                  ),
                                );
                              }
                            },
                      child: busy
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Submit Deletion Request', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _stepRow(BuildContext context, String num, String text) {
    return Padding(
      padding: EdgeInsets.only(bottom: context.h(4)),
      child: Row(
        children: [
          CircleAvatar(
            radius: 8,
            backgroundColor: AppColors.brand500,
            child: Text(num, style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          SizedBox(width: context.w(8)),
          Expanded(child: Text(text, style: TextStyle(fontSize: context.sp(11), color: AppColors.inkMuted))),
        ],
      ),
    );
  }
}

class _InfoRow {
  final String label;
  final String value;
  final bool isCopyable;

  const _InfoRow(this.label, this.value, {this.isCopyable = false});
}



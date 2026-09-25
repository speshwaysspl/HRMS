import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/api_client.dart';
import '../services/app_lock_service.dart';
import '../services/app_settings.dart';
import '../services/auth_provider.dart';
import '../services/settings_api_service.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import '../widgets/hrms_app_bar.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _api = SettingsApiService();
  bool _busyLock = false;

  Future<void> _changePassword() async {
    final userId = context.read<AuthProvider>().user?.id;
    if (userId == null) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ChangePasswordSheet(api: _api, userId: userId),
    );
  }

  Future<void> _toggleAppLock(bool value) async {
    if (_busyLock) return;
    setState(() => _busyLock = true);
    try {
      if (value) {
        final supported = await AppLockService.instance.canAuthenticate();
        if (!supported) {
          _snack('Set up a screen lock (PIN, pattern, or biometrics) on your device first.');
          return;
        }
        final ok = await AppLockService.instance.authenticate(
          reason: 'Confirm it\'s you to turn on App Lock',
        );
        if (!ok) {
          _snack('App Lock not enabled — authentication was cancelled.');
          return;
        }
      }
      await AppSettings.setAppLock(value);
    } finally {
      if (mounted) setState(() => _busyLock = false);
    }
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _openUrl(String url) async {
    final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    if (!ok) _snack('Could not open the link.');
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      appBar: HrmsAppBar(title: const Text('Settings')),
      body: ListView(
        padding: EdgeInsets.fromLTRB(context.w(16), context.h(16), context.w(16), context.h(32)),
        children: [
          if (user != null) ...[
            _ProfileHeader(name: user.name, email: user.email),
            SizedBox(height: context.h(24)),
          ],
          _sectionLabel(context, 'Appearance'),
          _Card(
            child: Padding(
              padding: EdgeInsets.all(context.w(12)),
              child: ValueListenableBuilder<ThemeMode>(
                valueListenable: AppSettings.themeMode,
                builder: (_, mode, _) => Row(
                  children: [
                    for (final opt in const [
                      (ThemeMode.system, 'System', Icons.smartphone_outlined),
                      (ThemeMode.light, 'Light', Icons.light_mode_outlined),
                      (ThemeMode.dark, 'Dark', Icons.dark_mode_outlined),
                    ])
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.symmetric(horizontal: context.w(4)),
                          child: _ThemeOption(
                            label: opt.$2,
                            icon: opt.$3,
                            selected: mode == opt.$1,
                            onTap: () => AppSettings.setThemeMode(opt.$1),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(height: context.h(24)),
          _sectionLabel(context, 'Security'),
          _Card(
            child: Column(
              children: [
                ValueListenableBuilder<bool>(
                  valueListenable: AppSettings.appLockEnabled,
                  builder: (_, enabled, _) => _Row(
                    icon: Icons.fingerprint_rounded,
                    title: 'App Lock',
                    subtitle: 'Unlock with fingerprint, face or PIN',
                    onTap: _busyLock ? null : () => _toggleAppLock(!enabled),
                    trailing: Switch(
                      value: enabled,
                      onChanged: _busyLock ? null : _toggleAppLock,
                      activeThumbColor: AppColors.accent600,
                    ),
                  ),
                ),
                _divider(context),
                _Row(
                  icon: Icons.key_outlined,
                  title: 'Change password',
                  onTap: _changePassword,
                  trailing: Icon(Icons.chevron_right_rounded, color: AppColors.inkFaint),
                ),
              ],
            ),
          ),
          SizedBox(height: context.h(24)),
          _sectionLabel(context, 'About'),
          _Card(
            child: Column(
              children: [
                _Row(
                  icon: Icons.description_outlined,
                  title: 'Terms of Service',
                  onTap: () => _openUrl('https://speshwayhrms.com/terms-and-conditions'),
                  trailing: Icon(Icons.open_in_new_rounded, size: context.r(18), color: AppColors.inkFaint),
                ),
                _divider(context),
                _Row(
                  icon: Icons.shield_outlined,
                  title: 'Privacy Policy',
                  onTap: () => _openUrl('https://speshwayhrms.com/privacy-policy'),
                  trailing: Icon(Icons.open_in_new_rounded, size: context.r(18), color: AppColors.inkFaint),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _divider(BuildContext context) =>
      Divider(height: 1, indent: context.w(60), color: AppColors.surfaceSubtle);

  Widget _sectionLabel(BuildContext context, String text) => Padding(
        padding: EdgeInsets.only(left: context.w(4), bottom: context.h(8)),
        child: Text(text,
            style: TextStyle(fontSize: context.sp(13), fontWeight: FontWeight.w700, color: AppColors.inkMuted)),
      );
}

class _ProfileHeader extends StatelessWidget {
  final String name;
  final String email;
  const _ProfileHeader({required this.name, required this.email});

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    return (parts.first[0] + (parts.length > 1 ? parts.last[0] : '')).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Padding(
        padding: EdgeInsets.all(context.w(16)),
        child: Row(
          children: [
            CircleAvatar(
              radius: context.r(26),
              backgroundColor: AppColors.brand600,
              child: Text(_initials,
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: context.sp(17))),
            ),
            SizedBox(width: context.w(14)),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: context.sp(16), fontWeight: FontWeight.w700, color: AppColors.ink)),
                  SizedBox(height: context.h(2)),
                  Text(email,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: context.sp(13), color: AppColors.inkMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeOption extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _ThemeOption({required this.label, required this.icon, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final fg = selected ? Colors.white : AppColors.ink;
    return Semantics(
      button: true,
      selected: selected,
      label: '$label theme',
      child: Material(
        color: selected ? AppColors.brand600 : AppColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: context.h(14)),
            child: Column(
              children: [
                Icon(icon, color: fg, size: context.r(22)),
                SizedBox(height: context.h(6)),
                Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w600, fontSize: context.sp(13))),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget trailing;
  final VoidCallback? onTap;
  const _Row({required this.icon, required this.title, this.subtitle, required this.trailing, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 56),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: context.w(14), vertical: context.h(10)),
          child: Row(
            children: [
              Container(
                width: context.r(34),
                height: context.r(34),
                decoration: BoxDecoration(color: AppColors.surfaceSubtle, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, size: context.r(18), color: AppColors.ink),
              ),
              SizedBox(width: context.w(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: TextStyle(fontSize: context.sp(15), fontWeight: FontWeight.w600, color: AppColors.ink)),
                    if (subtitle != null) ...[
                      SizedBox(height: context.h(2)),
                      Text(subtitle!, style: TextStyle(fontSize: context.sp(13), color: AppColors.inkMuted)),
                    ],
                  ],
                ),
              ),
              SizedBox(width: context.w(8)),
              trailing,
            ],
          ),
        ),
      ),
    );
  }
}

class _ChangePasswordSheet extends StatefulWidget {
  final SettingsApiService api;
  final String userId;
  const _ChangePasswordSheet({required this.api, required this.userId});

  @override
  State<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<_ChangePasswordSheet> {
  final _formKey = GlobalKey<FormState>();
  final _old = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _old.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await widget.api.changePassword(
        userId: widget.userId,
        oldPassword: _old.text,
        newPassword: _new.text,
      );
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password updated')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: EdgeInsets.all(context.w(20)),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
        ),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Change password',
                    style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
                SizedBox(height: context.h(16)),
                TextFormField(
                  controller: _old,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Current password'),
                  validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
                SizedBox(height: context.h(12)),
                TextFormField(
                  controller: _new,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New password'),
                  validator: (v) => (v == null || v.length < 6) ? 'At least 6 characters' : null,
                ),
                SizedBox(height: context.h(12)),
                TextFormField(
                  controller: _confirm,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Confirm new password'),
                  validator: (v) => v != _new.text ? 'Passwords do not match' : null,
                ),
                SizedBox(height: context.h(18)),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Update password'),
                ),
                SizedBox(height: context.h(8)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.card),
        side: BorderSide(color: AppColors.surfaceSubtle),
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }
}

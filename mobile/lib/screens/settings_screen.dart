import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/api_client.dart';
import '../services/app_lock_service.dart';
import '../services/app_settings.dart';
import '../services/auth_provider.dart';
import '../services/push_service.dart';
import '../services/settings_api_service.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _api = SettingsApiService();
  bool _busyLock = false;
  bool _busyNotif = false;
  bool? _weekly;
  bool _busyWeekly = false;

  @override
  void initState() {
    super.initState();
    _loadWeekly();
  }

  Future<void> _loadWeekly() async {
    try {
      final v = await _api.getWeeklySummary();
      if (mounted) setState(() => _weekly = v);
    } catch (_) {/* section stays hidden */}
  }

  Future<void> _toggleWeekly(bool value) async {
    setState(() => _busyWeekly = true);
    try {
      await _api.setWeeklySummary(value);
      setState(() => _weekly = value);
    } catch (e) {
      _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busyWeekly = false);
    }
  }

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

  Future<void> _toggleNotifications(bool value) async {
    if (_busyNotif) return;
    setState(() => _busyNotif = true);
    try {
      await AppSettings.setNotifications(value);
      await PushService.instance.applyNotificationPreference();
      _snack(value
          ? 'Push notifications turned on.'
          : 'Push notifications turned off for this device.');
    } finally {
      if (mounted) setState(() => _busyNotif = false);
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
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: EdgeInsets.all(context.w(16)),
        children: [
          _sectionLabel(context, 'Appearance'),
          _Card(
            child: ValueListenableBuilder<ThemeMode>(
              valueListenable: AppSettings.themeMode,
              builder: (_, mode, _) => Padding(
                padding: EdgeInsets.all(context.w(14)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.brightness_6_outlined, color: AppColors.inkMuted, size: context.r(22)),
                        SizedBox(width: context.w(14)),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Theme', style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w600, color: AppColors.ink)),
                              Text("System follows your phone's light/dark setting",
                                  style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: context.h(12)),
                    SizedBox(
                      width: double.infinity,
                      child: SegmentedButton<ThemeMode>(
                        showSelectedIcon: false,
                        segments: const [
                          ButtonSegment(value: ThemeMode.system, label: Text('System'), icon: Icon(Icons.phone_android, size: 16)),
                          ButtonSegment(value: ThemeMode.light, label: Text('Light'), icon: Icon(Icons.light_mode_outlined, size: 16)),
                          ButtonSegment(value: ThemeMode.dark, label: Text('Dark'), icon: Icon(Icons.dark_mode_outlined, size: 16)),
                        ],
                        selected: {mode},
                        onSelectionChanged: (s) => AppSettings.setThemeMode(s.first),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(height: context.h(20)),
          _sectionLabel(context, 'Security'),
          _Card(
            child: ValueListenableBuilder<bool>(
              valueListenable: AppSettings.appLockEnabled,
              builder: (_, enabled, _) => SwitchListTile(
                value: enabled,
                onChanged: _busyLock ? null : _toggleAppLock,
                secondary: Icon(Icons.lock_outline, color: AppColors.inkMuted, size: context.r(22)),
                title: Text('App Lock', style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w600, color: AppColors.ink)),
                subtitle: Text(
                  'Require your phone\'s biometrics, PIN or passcode to open the app',
                  style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted),
                ),
                activeThumbColor: AppColors.accent600,
              ),
            ),
          ),
          SizedBox(height: context.h(20)),
          _sectionLabel(context, 'Notifications'),
          _Card(
            child: ValueListenableBuilder<bool>(
              valueListenable: AppSettings.notificationsEnabled,
              builder: (_, enabled, _) => SwitchListTile(
                value: enabled,
                onChanged: _busyNotif ? null : _toggleNotifications,
                secondary: Icon(Icons.notifications_none, color: AppColors.inkMuted, size: context.r(22)),
                title: Text('Push Notifications', style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w600, color: AppColors.ink)),
                subtitle: Text(
                  'Get alerts for leave, tasks, announcements and documents',
                  style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted),
                ),
                activeThumbColor: AppColors.accent600,
              ),
            ),
          ),
          SizedBox(height: context.h(20)),
          _sectionLabel(context, 'Account'),
          _Card(
            child: ListTile(
              leading: Icon(Icons.password_outlined, color: AppColors.inkMuted, size: context.r(22)),
              title: Text('Change password', style: TextStyle(fontSize: context.sp(14), color: AppColors.ink)),
              trailing: Icon(Icons.chevron_right, size: 18, color: AppColors.inkFaint),
              onTap: _changePassword,
            ),
          ),
          if (_weekly != null) ...[
            SizedBox(height: context.h(20)),
            _sectionLabel(context, 'Reports'),
            _Card(
              child: SwitchListTile(
                value: _weekly!,
                onChanged: _busyWeekly ? null : _toggleWeekly,
                secondary: Icon(Icons.summarize_outlined, color: AppColors.inkMuted, size: context.r(22)),
                title: Text('Weekly summary email', style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w600, color: AppColors.ink)),
                subtitle: Text('A digest of org activity every Monday',
                    style: TextStyle(fontSize: context.sp(12), color: AppColors.inkMuted)),
                activeThumbColor: AppColors.accent600,
              ),
            ),
          ],
          SizedBox(height: context.h(20)),
          _sectionLabel(context, 'Legal'),
          _Card(
            child: Column(
              children: [
                ListTile(
                  leading: Icon(Icons.description_outlined, color: AppColors.inkMuted, size: context.r(22)),
                  title: Text('Terms of Service', style: TextStyle(fontSize: context.sp(14), color: AppColors.ink)),
                  trailing: Icon(Icons.open_in_new, size: 16, color: AppColors.inkFaint),
                  onTap: () => _openUrl('https://www.speshway.com/terms-of-service'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: Icon(Icons.privacy_tip_outlined, color: AppColors.inkMuted, size: context.r(22)),
                  title: Text('Privacy Policy', style: TextStyle(fontSize: context.sp(14), color: AppColors.ink)),
                  trailing: Icon(Icons.open_in_new, size: 16, color: AppColors.inkFaint),
                  onTap: () => _openUrl('https://www.speshway.com/privacy-policy'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(BuildContext context, String text) => Padding(
        padding: EdgeInsets.only(left: context.w(4), bottom: context.h(8)),
        child: Text(text,
            style: TextStyle(
                fontSize: context.sp(12),
                fontWeight: FontWeight.w700,
                color: AppColors.inkMuted,
                letterSpacing: 0.4)),
      );
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

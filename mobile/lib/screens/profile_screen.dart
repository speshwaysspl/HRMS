import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_provider.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import 'employee/documents_screen.dart';
import 'employee/notifications_screen.dart';
import 'login_screen.dart';
import 'settings_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: EdgeInsets.all(context.w(16)),
        children: [
          Container(
            padding: EdgeInsets.all(context.w(20)),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.panel),
              border: Border.all(color: AppColors.surfaceSubtle),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: context.r(34),
                  backgroundColor: AppColors.brand600,
                  child: Text(
                    (user?.name.isNotEmpty == true ? user!.name[0] : '?').toUpperCase(),
                    style: TextStyle(color: Colors.white, fontSize: context.sp(26), fontWeight: FontWeight.w700),
                  ),
                ),
                SizedBox(height: context.h(12)),
                Text(user?.name ?? '',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: context.sp(17), fontWeight: FontWeight.w700, color: AppColors.ink)),
                SizedBox(height: context.h(4)),
                Text(user?.email ?? '',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
                SizedBox(height: context.h(10)),
                Wrap(
                  spacing: context.w(6),
                  alignment: WrapAlignment.center,
                  children: (user?.roles ?? []).map((r) => Chip(
                        label: Text(r.replaceAll('_', ' '), style: TextStyle(fontSize: context.sp(11))),
                        backgroundColor: AppColors.brand50,
                        labelStyle: const TextStyle(color: AppColors.brand700),
                        visualDensity: VisualDensity.compact,
                      )).toList(),
                ),
              ],
            ),
          ),
          SizedBox(height: context.h(20)),
          _ProfileTile(
            icon: Icons.notifications_none,
            label: 'Notifications',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const NotificationsScreen()),
            ),
          ),
          _ProfileTile(
            icon: Icons.description_outlined,
            label: 'My Documents',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const DocumentsScreen()),
            ),
          ),
          _ProfileTile(
            icon: Icons.settings_outlined,
            label: 'Settings',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const SettingsScreen()),
            ),
          ),
          const _ProfileTile(icon: Icons.help_outline, label: 'Help & Support'),
          SizedBox(height: context.h(12)),
          OutlinedButton.icon(
            onPressed: () async {
              await context.read<AuthProvider>().logout();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            icon: const Icon(Icons.logout, size: 18, color: AppColors.danger),
            label: const Text('Log out', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  const _ProfileTile({required this.icon, required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(bottom: context.h(8)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.inkMuted, size: context.r(20)),
        title: Text(label, style: TextStyle(fontSize: context.sp(14), color: AppColors.ink)),
        trailing: const Icon(Icons.chevron_right, size: 18, color: AppColors.inkFaint),
        onTap: onTap ??
            () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Coming soon to the mobile app.')),
              );
            },
      ),
    );
  }
}

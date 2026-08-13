import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_provider.dart';
import '../theme/app_theme.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.panel),
              border: Border.all(color: AppColors.surfaceSubtle),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 34,
                  backgroundColor: AppColors.brand600,
                  child: Text(
                    (user?.name.isNotEmpty == true ? user!.name[0] : '?').toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 12),
                Text(user?.name ?? '', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.ink)),
                const SizedBox(height: 4),
                Text(user?.email ?? '', style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6,
                  alignment: WrapAlignment.center,
                  children: (user?.roles ?? []).map((r) => Chip(
                        label: Text(r.replaceAll('_', ' '), style: const TextStyle(fontSize: 11)),
                        backgroundColor: AppColors.brand50,
                        labelStyle: const TextStyle(color: AppColors.brand700),
                        visualDensity: VisualDensity.compact,
                      )).toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _ProfileTile(icon: Icons.settings_outlined, label: 'Settings'),
          _ProfileTile(icon: Icons.notifications_none, label: 'Notifications'),
          _ProfileTile(icon: Icons.description_outlined, label: 'My Documents'),
          _ProfileTile(icon: Icons.help_outline, label: 'Help & Support'),
          const SizedBox(height: 12),
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
  const _ProfileTile({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.inkMuted, size: 20),
        title: Text(label, style: const TextStyle(fontSize: 14, color: AppColors.ink)),
        trailing: const Icon(Icons.chevron_right, size: 18, color: AppColors.inkFaint),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Coming soon to the mobile app.')),
          );
        },
      ),
    );
  }
}

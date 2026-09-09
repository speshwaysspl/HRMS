import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../admin/admin_employees_screen.dart';
import '../admin/admin_home_screen.dart';
import '../admin/admin_leaves_screen.dart';
import '../employee/attendance_screen.dart';
import '../employee/employee_home_screen.dart';
import '../employee/leaves_screen.dart';
import '../placeholder_screen.dart';
import '../profile_screen.dart';

/// Root navigation shell shown after login. Tab set adapts to the logged-in
/// user's primary role, mirroring the web app's per-role dashboards
/// (admin-dashboard / hr-dashboard / employee-dashboard / candidate-dashboard).
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final role = user?.primaryRole ?? 'employee';

    final tabs = _tabsForRole(role);
    if (_index >= tabs.length) _index = 0;

    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: tabs.map((t) => t.screen).toList(),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: tabs
            .map((t) => BottomNavigationBarItem(icon: Icon(t.icon), label: t.label))
            .toList(),
      ),
    );
  }

  List<_TabSpec> _tabsForRole(String role) {
    switch (role) {
      case 'admin':
        return [
          _TabSpec('Home', Icons.dashboard_outlined, const AdminHomeScreen()),
          _TabSpec('Leaves', Icons.beach_access_outlined, const AdminLeavesScreen()),
          _TabSpec('Employees', Icons.groups_outlined, const AdminEmployeesScreen()),
          _TabSpec('Profile', Icons.person_outline, const ProfileScreen()),
        ];
      case 'hr':
        return [
          _TabSpec('Home', Icons.dashboard_outlined,
              const PlaceholderScreen(title: 'HR Dashboard', icon: Icons.dashboard_outlined)),
          _TabSpec('Recruitment', Icons.badge_outlined,
              const PlaceholderScreen(title: 'Recruitment', icon: Icons.badge_outlined)),
          _TabSpec('Leaves', Icons.beach_access_outlined,
              const PlaceholderScreen(title: 'Leave Approvals', icon: Icons.beach_access_outlined)),
          _TabSpec('Profile', Icons.person_outline, const ProfileScreen()),
        ];
      case 'candidate':
        return [
          _TabSpec('Home', Icons.dashboard_outlined,
              const PlaceholderScreen(title: 'My Application', icon: Icons.dashboard_outlined,
                  message: 'Track your recruitment status here soon.')),
          _TabSpec('Documents', Icons.upload_file_outlined,
              const PlaceholderScreen(title: 'Documents', icon: Icons.upload_file_outlined)),
          _TabSpec('Profile', Icons.person_outline, const ProfileScreen()),
        ];
      case 'employee':
      default:
        // Employee tab set also covers team_lead, matching the web app's
        // merged Employee + Team Lead dashboard. Every other module
        // (Tasks, Documents, Team Lead tools, …) lives in the side drawer.
        return [
          _TabSpec('Home', Icons.dashboard_outlined, const EmployeeHomeScreen()),
          _TabSpec('Attendance', Icons.access_time, const AttendanceScreen()),
          _TabSpec('Leaves', Icons.beach_access_outlined, const LeavesScreen()),
        ];
    }
  }
}

class _TabSpec {
  final String label;
  final IconData icon;
  final Widget screen;
  _TabSpec(this.label, this.icon, this.screen);
}

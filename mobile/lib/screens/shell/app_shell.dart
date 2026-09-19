import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'package:provider/provider.dart';
import '../../services/app_events.dart';
import '../../services/auth_provider.dart';
import '../../services/quick_actions_service.dart';
import '../admin/admin_employees_screen.dart';
import '../admin/admin_home_screen.dart';
import '../admin/admin_leaves_screen.dart';
import '../employee/attendance_screen.dart';
import '../employee/employee_home_screen.dart';
import '../employee/leaves_screen.dart';
import '../employee/tasks_screen.dart';
import '../placeholder_screen.dart';
import '../profile_screen.dart';

typedef TabIconBuilder = Widget Function(Color color);

/// Root navigation shell shown after login. Tab set adapts to the logged-in
/// user's primary role, mirroring the web app's per-role dashboards.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 2; // Default to Home for employee
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    AppEvents.tabSwitch.addListener(_handleTabSwitch);
    // A launcher shortcut tapped while logged out / cold-starting opens here.
    WidgetsBinding.instance.addPostFrameCallback((_) => QuickActionsService.consumePending());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final user = context.read<AuthProvider>().user;
      final role = user?.primaryRole ?? 'employee';
      _index = role == 'employee' ? 2 : 0;
      _initialized = true;
    }
  }

  @override
  void dispose() {
    AppEvents.tabSwitch.removeListener(_handleTabSwitch);
    super.dispose();
  }

  // Employees land on the centre Home tab; other roles on the first tab.
  int _homeIndexFor(String role) => role == 'employee' ? 2 : 0;

  void _handleTabSwitch() {
    final target = AppEvents.tabSwitch.value;
    if (target != null && mounted) {
      setState(() => _index = target);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final role = user?.primaryRole ?? 'employee';

    final tabs = _tabsForRole(role);
    if (_index >= tabs.length) _index = 0;

    final homeIndex = _homeIndexFor(role);

    // Back / swipe: on any other tab go to Home first; on Home the pop is
    // allowed through and Android closes the app.
    return PopScope(
      canPop: _index == homeIndex,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _index = homeIndex);
      },
      child: Scaffold(
        body: IndexedStack(
          index: _index,
          children: tabs.map((t) => t.screen).toList(),
        ),
        bottomNavigationBar: _buildModernBottomNav(context, tabs),
      ),
    );
  }

  Widget _buildModernBottomNav(BuildContext context, List<_TabSpec> tabs) {
    final bottomPad = MediaQuery.paddingOf(context).bottom;
    // Same navy as the app bar (deeper in dark mode) — white = active.
    final barColor = AppColors.isDark ? AppColors.brand950 : AppColors.brand900;
    const activeColor = Colors.white;
    final inactiveColor = Colors.white.withValues(alpha: 0.55);

    return Container(
      decoration: BoxDecoration(
        color: barColor,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      padding: EdgeInsets.only(
        left: 8,
        right: 8,
        top: 6,
        bottom: bottomPad > 0 ? bottomPad : 8,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(tabs.length, (i) {
          final tab = tabs[i];
          final isActive = _index == i;
          final color = isActive ? activeColor : inactiveColor;

          if (tab.isCenter) {
            return Expanded(
              child: InkWell(
                onTap: () => setState(() => _index = i),
                borderRadius: BorderRadius.circular(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: isActive ? Colors.white.withValues(alpha: 0.18) : Colors.white.withValues(alpha: 0.08),
                        shape: BoxShape.circle,
                      ),
                      padding: const EdgeInsets.all(3.5),
                      child: Container(
                        decoration: BoxDecoration(
                          color: isActive ? Colors.white : Colors.white.withValues(alpha: 0.28),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.home_rounded,
                            color: Colors.white,
                            size: 22,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      tab.label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                        color: color,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          Widget iconWidget;
          if (tab.customIcon != null) {
            iconWidget = tab.customIcon!(color);
          } else {
            iconWidget = Icon(
              isActive ? tab.activeIcon : tab.icon,
              size: 24,
              color: color,
            );
          }

          return Expanded(
            child: InkWell(
              onTap: () => setState(() => _index = i),
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      height: 36,
                      child: Center(child: iconWidget),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      tab.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                        color: color,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  static Widget _buildLeavesIcon(Color color) {
    return SizedBox(
      width: 24,
      height: 24,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(
            Icons.article_outlined,
            size: 22,
            color: color,
          ),
          Positioned(
            right: 0,
            bottom: 0,
            child: Icon(
              Icons.eco,
              size: 12,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  List<_TabSpec> _tabsForRole(String role) {
    switch (role) {
      case 'admin':
        return [
          _TabSpec('Home', Icons.dashboard_outlined, const AdminHomeScreen(),
              activeIcon: Icons.dashboard_rounded),
          _TabSpec('Leaves', Icons.beach_access_outlined, const AdminLeavesScreen(),
              activeIcon: Icons.beach_access_rounded),
          _TabSpec('Employees', Icons.groups_outlined, const AdminEmployeesScreen(),
              activeIcon: Icons.groups_rounded),
          _TabSpec('Profile', Icons.person_outline_rounded, const ProfileScreen(),
              activeIcon: Icons.person_rounded),
        ];
      case 'hr':
        return [
          _TabSpec('Home', Icons.dashboard_outlined,
              const PlaceholderScreen(title: 'HR Dashboard', icon: Icons.dashboard_outlined),
              activeIcon: Icons.dashboard_rounded),
          _TabSpec('Recruitment', Icons.badge_outlined,
              const PlaceholderScreen(title: 'Recruitment', icon: Icons.badge_outlined),
              activeIcon: Icons.badge_rounded),
          _TabSpec('Leaves', Icons.beach_access_outlined,
              const PlaceholderScreen(title: 'Leave Approvals', icon: Icons.beach_access_outlined),
              activeIcon: Icons.beach_access_rounded),
          _TabSpec('Profile', Icons.person_outline_rounded, const ProfileScreen(),
              activeIcon: Icons.person_rounded),
        ];
      case 'candidate':
        return [
          _TabSpec('Home', Icons.dashboard_outlined,
              const PlaceholderScreen(title: 'My Application', icon: Icons.dashboard_outlined,
                  message: 'Track your recruitment status here soon.'),
              activeIcon: Icons.dashboard_rounded),
          _TabSpec('Documents', Icons.upload_file_outlined,
              const PlaceholderScreen(title: 'Documents', icon: Icons.upload_file_outlined),
              activeIcon: Icons.upload_file_rounded),
          _TabSpec('Profile', Icons.person_outline_rounded, const ProfileScreen(),
              activeIcon: Icons.person_rounded),
        ];
      case 'employee':
      default:
        // Exact order from user mockup: Leaves -> Attendance -> Home (center) -> Tasks -> Profile
        return [
          _TabSpec(
            'Leaves',
            Icons.article_outlined,
            const LeavesScreen(),
            customIcon: _buildLeavesIcon,
          ),
          _TabSpec(
            'Attendance',
            Icons.calendar_month_outlined,
            const AttendanceScreen(),
            activeIcon: Icons.calendar_month_outlined,
          ),
          _TabSpec(
            'Home',
            Icons.home_rounded,
            const EmployeeHomeScreen(),
            activeIcon: Icons.home_rounded,
            isCenter: true,
          ),
          _TabSpec(
            'Tasks',
            Icons.assignment_turned_in_outlined,
            const TasksScreen(),
            activeIcon: Icons.assignment_turned_in_outlined,
          ),
          _TabSpec(
            'Profile',
            Icons.person_outline_rounded,
            const ProfileScreen(),
            activeIcon: Icons.person_outline_rounded,
          ),
        ];
    }
  }
}

class _TabSpec {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final Widget screen;
  final bool isCenter;
  final TabIconBuilder? customIcon;

  _TabSpec(
    this.label,
    this.icon,
    this.screen, {
    IconData? activeIcon,
    this.isCenter = false,
    this.customIcon,
  }) : activeIcon = activeIcon ?? icon;
}

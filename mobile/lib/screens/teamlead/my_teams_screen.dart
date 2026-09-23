import 'package:flutter/material.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/hrms_app_bar.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import 'team_detail_screen.dart';

class MyTeamsScreen extends StatefulWidget {
  const MyTeamsScreen({super.key});

  @override
  State<MyTeamsScreen> createState() => _MyTeamsScreenState();
}

class _MyTeamsScreenState extends State<MyTeamsScreen> {
  final _service = TeamService();
  List<Map<String, dynamic>> _teams = [];
  bool _loading = true;
  Object? _error;

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
      final data = await _service.getTeams();
      if (!mounted) return;
      setState(() {
        _teams = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: HrmsAppBar(title: const Text('My Teams')),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: const [SkeletonListTile(), SkeletonListTile(), SkeletonListTile(), SkeletonListTile()],
            )
          : _error != null
              ? buildErrorState(_error!, _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _teams.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          EmptyStateView(icon: Icons.groups_outlined, title: 'No teams assigned to you yet.'),
                        ])
                      : ListView(
                          padding: EdgeInsets.all(context.w(16)),
                          children: _teams.map((t) => SimpleCard(
                                onTap: () => Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => TeamDetailScreen(id: t['_id'].toString(), name: t['name']?.toString() ?? 'Team')),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: context.r(40),
                                      height: context.r(40),
                                      decoration: BoxDecoration(color: AppColors.brand50, borderRadius: BorderRadius.circular(10)),
                                      child: Icon(Icons.groups_outlined, color: AppColors.brand600, size: context.r(22)),
                                    ),
                                    SizedBox(width: context.w(12)),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(t['name']?.toString() ?? '', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                          SizedBox(height: context.h(2)),
                                          Text('${(t['members'] as List?)?.length ?? 0} members', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
                                        ],
                                      ),
                                    ),
                                    Icon(Icons.chevron_right, color: AppColors.inkFaint, size: context.r(24)),
                                  ],
                                ),
                              )).toList(),
                        ),
                ),
    );
  }
}

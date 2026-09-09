import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';

class MyTeamsScreen extends StatefulWidget {
  const MyTeamsScreen({super.key});

  @override
  State<MyTeamsScreen> createState() => _MyTeamsScreenState();
}

class _MyTeamsScreenState extends State<MyTeamsScreen> {
  final _service = TeamService();
  List<Map<String, dynamic>> _teams = [];
  bool _loading = true;
  String? _error;

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
        _error = extractErrorMessage(e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Teams')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _teams.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          CenteredMessage(icon: Icons.groups_outlined, message: 'No teams assigned to you yet.'),
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
                                          Text(t['name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
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

class TeamDetailScreen extends StatefulWidget {
  final String id;
  final String name;
  const TeamDetailScreen({super.key, required this.id, required this.name});

  @override
  State<TeamDetailScreen> createState() => _TeamDetailScreenState();
}

class _TeamDetailScreenState extends State<TeamDetailScreen> {
  final _service = TeamService();
  Map<String, dynamic>? _detail;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _service.getTeamDetail(widget.id).then((v) {
      if (mounted) setState(() {
        _detail = v;
        _loading = false;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final memberStats = (_detail?['memberStats'] as List?) ?? [];

    return Scaffold(
      appBar: AppBar(title: Text(widget.name)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: [
                Text('Members', style: TextStyle(fontSize: context.sp(14), fontWeight: FontWeight.w700, color: AppColors.ink)),
                SizedBox(height: context.h(10)),
                if (memberStats.isEmpty)
                  const CenteredMessage(icon: Icons.person_outline, message: 'No members in this team yet.')
                else
                  ...memberStats.map((m) {
                    final member = m['member'] as Map? ?? {};
                    final user = member['userId'] as Map? ?? {};
                    return SimpleCard(
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: context.r(18),
                            backgroundColor: AppColors.brand100,
                            child: Text(
                              (user['name']?.toString().isNotEmpty == true ? user['name'].toString()[0] : '?').toUpperCase(),
                              style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w700),
                            ),
                          ),
                          SizedBox(width: context.w(12)),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(user['name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink)),
                                Text('${m['role'] ?? ''}', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
                              ],
                            ),
                          ),
                          SizedBox(width: context.w(8)),
                          Text('${m['completed'] ?? 0}/${m['totalTasks'] ?? 0} tasks', style: TextStyle(color: AppColors.inkFaint, fontSize: context.sp(12))),
                        ],
                      ),
                    );
                  }),
              ],
            ),
    );
  }
}

import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
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
                          padding: const EdgeInsets.all(16),
                          children: _teams.map((t) => SimpleCard(
                                onTap: () => Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => TeamDetailScreen(id: t['_id'].toString(), name: t['name']?.toString() ?? 'Team')),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(color: AppColors.brand50, borderRadius: BorderRadius.circular(10)),
                                      child: const Icon(Icons.groups_outlined, color: AppColors.brand600),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(t['name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                          const SizedBox(height: 2),
                                          Text('${(t['members'] as List?)?.length ?? 0} members', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                                        ],
                                      ),
                                    ),
                                    const Icon(Icons.chevron_right, color: AppColors.inkFaint),
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
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Members', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.ink)),
                const SizedBox(height: 10),
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
                            radius: 18,
                            backgroundColor: AppColors.brand100,
                            child: Text(
                              (user['name']?.toString().isNotEmpty == true ? user['name'].toString()[0] : '?').toUpperCase(),
                              style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w700),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(user['name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink)),
                                Text('${m['role'] ?? ''}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                              ],
                            ),
                          ),
                          Text('${m['completed'] ?? 0}/${m['totalTasks'] ?? 0} tasks', style: const TextStyle(color: AppColors.inkFaint, fontSize: 12)),
                        ],
                      ),
                    );
                  }),
              ],
            ),
    );
  }
}

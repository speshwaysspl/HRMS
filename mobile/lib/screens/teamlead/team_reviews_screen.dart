import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';

class TeamReviewsScreen extends StatefulWidget {
  const TeamReviewsScreen({super.key});

  @override
  State<TeamReviewsScreen> createState() => _TeamReviewsScreenState();
}

class _TeamReviewsScreenState extends State<TeamReviewsScreen> {
  final _service = ReviewService();
  List<Map<String, dynamic>> _items = [];
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
      final data = await _service.getTeamReviews();
      if (!mounted) return;
      setState(() {
        _items = data;
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
      appBar: AppBar(title: const Text('Team Reviews')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: [
                          SizedBox(height: 100),
                          CenteredMessage(
                            icon: Icons.rate_review_outlined,
                            message: 'No performance reviews created yet.\nUse the web app to start a new review cycle.',
                          ),
                        ])
                      : ListView(
                          padding: EdgeInsets.all(context.w(16)),
                          children: _items.map((r) {
                            final employee = r['employeeId'] as Map? ?? {};
                            final user = employee['userId'] as Map? ?? {};
                            final name = user['name']?.toString() ?? 'Employee';
                            return SimpleCard(
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: context.r(18),
                                    backgroundColor: AppColors.tint(AppColors.tint(const Color(0xFFF3E8FF))),
                                    child: Text(
                                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                                      style: const TextStyle(color: Color(0xFF9333EA), fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                  SizedBox(width: context.w(12)),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(name, style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                        SizedBox(height: context.h(3)),
                                        Text('${r['cycle'] ?? ''}  ·  Overall: ${r['overallRating'] ?? '-'}/5', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
                                      ],
                                    ),
                                  ),
                                  SizedBox(width: context.w(8)),
                                  StatusPill(label: r['status']?.toString() ?? 'Draft'),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                ),
    );
  }
}

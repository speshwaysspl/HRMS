import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';

class MyReviewsScreen extends StatefulWidget {
  const MyReviewsScreen({super.key});

  @override
  State<MyReviewsScreen> createState() => _MyReviewsScreenState();
}

class _MyReviewsScreenState extends State<MyReviewsScreen> {
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
      final data = await _service.getMyReviews();
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
      appBar: AppBar(title: const Text('My Reviews')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          CenteredMessage(icon: Icons.rate_review_outlined, message: 'No reviews shared with you yet.'),
                        ])
                      : ListView(
                          padding: const EdgeInsets.all(16),
                          children: _items.map((r) {
                            final reviewer = r['reviewerId'] as Map? ?? {};
                            final user = reviewer['userId'] as Map? ?? {};
                            final ratings = (r['ratings'] as List?) ?? [];
                            return SimpleCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text('${r['cycle'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                      ),
                                      StatusPill(label: r['status']?.toString() ?? 'Submitted'),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text('Reviewer: ${user['name'] ?? 'Manager'}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                                  const SizedBox(height: 4),
                                  Text('Overall Rating: ${r['overallRating'] ?? '-'}/5', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                                  if (ratings.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 6,
                                      children: ratings.map<Widget>((c) => Chip(
                                            label: Text('${c['competency']}: ${c['score']}/5', style: const TextStyle(fontSize: 11)),
                                            backgroundColor: AppColors.surfaceMuted,
                                            visualDensity: VisualDensity.compact,
                                          )).toList(),
                                    ),
                                  ],
                                  if ((r['managerComments'] ?? '').toString().isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Text('"${r['managerComments']}"', style: const TextStyle(color: AppColors.inkFaint, fontSize: 12, fontStyle: FontStyle.italic)),
                                  ],
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                ),
    );
  }
}

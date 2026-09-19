import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
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
  Object? _lastError;

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
        _lastError = e;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Reviews')),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: const [
                SkeletonListTile(),
                SkeletonListTile(),
                SkeletonListTile(),
              ],
            )
          : _error != null
              ? buildErrorState(_lastError ?? _error!, _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          EmptyStateView(icon: Icons.rate_review_outlined, title: 'No reviews shared with you yet', subtitle: 'Performance reviews will appear here once shared.'),
                        ])
                      : ListView(
                          padding: EdgeInsets.all(context.w(16)),
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
                                      Container(
                                        width: context.r(34),
                                        height: context.r(34),
                                        decoration: BoxDecoration(color: AppColors.tint(const Color(0xFFF3E8FF)), shape: BoxShape.circle),
                                        child: Icon(Icons.rate_review_rounded, size: context.r(17), color: const Color(0xFF9333EA)),
                                      ),
                                      SizedBox(width: context.w(10)),
                                      Expanded(
                                        child: Text('${r['cycle'] ?? ''}', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                      ),
                                      SizedBox(width: context.w(8)),
                                      StatusPill(label: r['status']?.toString() ?? 'Submitted'),
                                    ],
                                  ),
                                  SizedBox(height: context.h(8)),
                                  Padding(
                                    padding: EdgeInsets.only(left: context.w(44)),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Reviewer: ${user['name'] ?? 'Manager'}', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
                                        SizedBox(height: context.h(4)),
                                        Text('Overall Rating: ${r['overallRating'] ?? '-'}/5', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
                                      ],
                                    ),
                                  ),
                                  if (ratings.isNotEmpty) ...[
                                    SizedBox(height: context.h(8)),
                                    Wrap(
                                      spacing: context.w(8),
                                      runSpacing: context.h(6),
                                      children: ratings.map<Widget>((c) => Chip(
                                            label: Text('${c['competency']}: ${c['score']}/5', style: TextStyle(fontSize: context.sp(11))),
                                            backgroundColor: AppColors.surfaceMuted,
                                            visualDensity: VisualDensity.compact,
                                          )).toList(),
                                    ),
                                  ],
                                  if ((r['managerComments'] ?? '').toString().isNotEmpty) ...[
                                    SizedBox(height: context.h(8)),
                                    Text('"${r['managerComments']}"', style: TextStyle(color: AppColors.inkFaint, fontSize: context.sp(12), fontStyle: FontStyle.italic)),
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

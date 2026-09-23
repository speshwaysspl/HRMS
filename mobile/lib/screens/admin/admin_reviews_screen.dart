import 'package:flutter/material.dart';

import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/hrms_app_bar.dart';

class AdminReviewsScreen extends StatefulWidget {
  const AdminReviewsScreen({super.key});

  @override
  State<AdminReviewsScreen> createState() => _AdminReviewsScreenState();
}

class _AdminReviewsScreenState extends State<AdminReviewsScreen> {
  final _service = ReviewService();
  List<Map<String, dynamic>> _items = [];
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
      final data = await _service.getAllReviews();
      if (!mounted) return;
      setState(() {
        _items = data;
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
      appBar: HrmsAppBar(title: const Text('Performance Reviews')),
      body: _loading
          ? ListView(
 padding: EdgeInsets.all(context.w(16)),
 children: const [SkeletonListTile(), SkeletonListTile(), SkeletonListTile(), SkeletonListTile()],
 )
          : _error != null
              ? buildErrorState(_error!, _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          EmptyStateView(icon: Icons.rate_review_outlined, title: 'No reviews yet', subtitle: 'Performance reviews will show up here.'),
                        ])
                      : ListView.builder(
                          padding: EdgeInsets.all(context.w(16)),
                          itemCount: _items.length,
                          itemBuilder: (_, i) {
                            final r = _items[i];
                            final emp = (r['employeeId'] as Map?) ?? {};
                            final empUser = (emp['userId'] as Map?) ?? {};
                            final reviewer = (r['reviewerId'] as Map?) ?? {};
                            final revUser = (reviewer['userId'] as Map?) ?? {};
                            return SimpleCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(empUser['name']?.toString() ?? 'Employee',
                                            style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
                                      ),
                                      SizedBox(width: context.w(8)),
                                      StatusPill(label: r['status']?.toString() ?? 'Draft'),
                                    ],
                                  ),
                                  SizedBox(height: context.h(3)),
                                  Text(
                                    '${r['cycle'] ?? ''}  ·  by ${revUser['name'] ?? 'Manager'}  ·  Overall ${r['overallRating'] ?? '-'}/5',
                                    style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
                                  ),
                                  if ((r['managerComments'] ?? '').toString().isNotEmpty) ...[
                                    SizedBox(height: context.h(6)),
                                    Text('"${r['managerComments']}"',
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                            color: AppColors.inkFaint,
                                            fontSize: context.sp(12),
                                            fontStyle: FontStyle.italic)),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

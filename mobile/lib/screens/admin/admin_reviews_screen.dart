import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../services/team_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/simple_list_tile.dart';
import '../../widgets/status_pill.dart';

class AdminReviewsScreen extends StatefulWidget {
  const AdminReviewsScreen({super.key});

  @override
  State<AdminReviewsScreen> createState() => _AdminReviewsScreenState();
}

class _AdminReviewsScreenState extends State<AdminReviewsScreen> {
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
      final data = await _service.getAllReviews();
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
      appBar: AppBar(title: const Text('Performance Reviews')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? CenteredMessage(icon: Icons.cloud_off, message: _error!)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 100),
                          CenteredMessage(icon: Icons.rate_review_outlined, message: 'No reviews yet.'),
                        ])
                      : ListView(
                          padding: EdgeInsets.all(context.w(16)),
                          children: _items.map((r) {
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
                                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink)),
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
                          }).toList(),
                        ),
                ),
    );
  }
}

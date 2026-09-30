import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/api_client.dart';
import '../services/leave_service.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import 'status_pill.dart';
import 'work_proof_field.dart';

/// Employee's view of one leave: reason, admin's remark / rejection reason,
/// and proof with upload / replace / remove (locked once approved).
/// Web mirror: expanded row + `ProofActions` in `leave/List.jsx`.
/// Returns true if anything changed so the caller can reload.
Future<bool?> showLeaveDetailsSheet(
  BuildContext context,
  Map<String, dynamic> leave,
) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _LeaveDetailsSheet(leave: Map.of(leave)),
  );
}

class _LeaveDetailsSheet extends StatefulWidget {
  const _LeaveDetailsSheet({required this.leave});
  final Map<String, dynamic> leave;

  @override
  State<_LeaveDetailsSheet> createState() => _LeaveDetailsSheetState();
}

class _LeaveDetailsSheetState extends State<_LeaveDetailsSheet> {
  final _service = LeaveService();
  bool _busy = false;
  bool _changed = false;

  Map<String, dynamic> get l => widget.leave;
  String get _id => l['_id'].toString();
  String get _status => (l['status'] ?? 'Pending').toString();
  String get _proof => (l['proof'] ?? '').toString();

  void _snack(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  Future<void> _upload() async {
    final r = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf'],
    );
    final path = r?.files.single.path;
    if (path == null || !mounted) return;
    if (await File(path).length() > 5 * 1024 * 1024) {
      if (mounted) _snack('Proof must be 5 MB or smaller.');
      return;
    }
    setState(() => _busy = true);
    try {
      final resubmitted = await _service.uploadProof(_id, path);
      _changed = true;
      if (!mounted) return;
      _snack(
        resubmitted
            ? 'Proof uploaded. Your leave was sent for review again.'
            : 'Proof updated.',
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove proof?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await _service.deleteProof(_id);
      _changed = true;
      setState(() {
        l['proof'] = '';
        l['proofName'] = '';
      });
      if (mounted) _snack('Proof removed.');
    } catch (e) {
      if (mounted) _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _row(String label, String value, {Color? color}) => Padding(
    padding: EdgeInsets.only(bottom: context.h(12)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12)),
        ),
        SizedBox(height: context.h(2)),
        Text(
          value,
          style: TextStyle(
            color: color ?? AppColors.ink,
            fontSize: context.sp(14),
            fontWeight: color != null ? FontWeight.w600 : FontWeight.w400,
            height: 1.4,
          ),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final remark = (l['reviewRemark'] ?? '').toString();
    final proofName = (l['proofName'] ?? '').toString();
    final canEditProof = _status != 'Approved';

    return PopScope(
      canPop: !_busy,
      child: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            context.w(20),
            0,
            context.w(20),
            context.h(20) + MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      (l['leaveType'] ?? '').toString(),
                      style: TextStyle(
                        fontSize: context.sp(18),
                        fontWeight: FontWeight.w700,
                        color: AppColors.ink,
                      ),
                    ),
                  ),
                  StatusPill(label: _status),
                ],
              ),
              SizedBox(height: context.h(16)),
              _row('Reason', (l['reason'] ?? '—').toString()),
              if (_status != 'Pending')
                _row(
                  _status == 'Rejected' ? 'Rejection reason' : 'Remark',
                  remark.isNotEmpty ? remark : 'No remark given',
                  color: _status == 'Rejected' ? AppColors.danger : null,
                ),
              Text(
                'Proof',
                style: TextStyle(
                  color: AppColors.inkMuted,
                  fontSize: context.sp(12),
                ),
              ),
              SizedBox(height: context.h(6)),
              if (_proof.isNotEmpty)
                OutlinedButton.icon(
                  onPressed: () => launchUrl(
                    Uri.parse(WorkProofField.absUrl(_proof)),
                    mode: LaunchMode.externalApplication,
                  ),
                  icon: const Icon(Icons.open_in_new_rounded, size: 18),
                  label: Text(
                    proofName.isNotEmpty ? proofName : 'View proof',
                    overflow: TextOverflow.ellipsis,
                  ),
                )
              else
                Text(
                  'No proof attached',
                  style: TextStyle(
                    color: AppColors.ink,
                    fontSize: context.sp(14),
                  ),
                ),
              if (canEditProof) ...[
                SizedBox(height: context.h(12)),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _busy ? null : _upload,
                        icon: _busy
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.upload_file_rounded),
                        label: Text(
                          _proof.isNotEmpty
                              ? 'Replace proof'
                              : _status == 'Rejected'
                              ? 'Upload & resubmit'
                              : 'Upload proof',
                        ),
                      ),
                    ),
                    if (_proof.isNotEmpty) ...[
                      SizedBox(width: context.w(10)),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.danger,
                        ),
                        onPressed: _busy ? null : _remove,
                        child: const Text('Remove'),
                      ),
                    ],
                  ],
                ),
                SizedBox(height: context.h(6)),
                Text(
                  _status == 'Rejected'
                      ? 'Uploading a new proof sends this leave for review again.'
                      : 'Image or PDF, up to 5 MB.',
                  style: TextStyle(
                    color: AppColors.inkMuted,
                    fontSize: context.sp(12),
                  ),
                ),
              ],
              SizedBox(height: context.h(12)),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: _busy
                      ? null
                      : () => Navigator.pop(context, _changed),
                  child: const Text('Close'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

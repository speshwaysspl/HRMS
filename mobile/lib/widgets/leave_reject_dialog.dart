import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Asks the admin why a leave is being rejected. Returns the trimmed reason,
/// or null if cancelled. The reason is shown to the employee (web mirror:
/// reject box in `leave/Detail.jsx`).
Future<String?> askLeaveRejectReason(BuildContext context) {
  return showDialog<String>(
    context: context,
    builder: (_) => const _RejectDialog(),
  );
}

class _RejectDialog extends StatefulWidget {
  const _RejectDialog();

  @override
  State<_RejectDialog> createState() => _RejectDialogState();
}

class _RejectDialogState extends State<_RejectDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _confirm() {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Please give a reason for rejecting');
      return;
    }
    Navigator.pop(context, text);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Reject leave'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        maxLines: 3,
        maxLength: 500,
        textCapitalization: TextCapitalization.sentences,
        decoration: InputDecoration(
          labelText: 'Reason for rejecting',
          hintText: 'Tell the employee why',
          errorText: _error,
        ),
        onChanged: (_) {
          if (_error != null) setState(() => _error = null);
        },
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
          onPressed: _confirm,
          child: const Text('Reject'),
        ),
      ],
    );
  }
}

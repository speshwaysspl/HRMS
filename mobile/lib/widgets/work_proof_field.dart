import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../env.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

/// Work-proof attachment for a task (mirrors web `WorkProofField.jsx`): shows the
/// saved file or a newly picked one with a preview, and lets the user open,
/// replace or delete it. Nothing is uploaded until the parent saves.
class WorkProofField extends StatelessWidget {
  const WorkProofField({
    super.key,
    required this.existingUrl,
    this.existingName,
    required this.pickedPath,
    required this.removed,
    required this.onPicked,
    required this.onRemovedChanged,
    this.editable = true,
    this.enabled = true,
  });

  final String? existingUrl;
  final String? existingName;
  final String? pickedPath;
  final bool removed;
  final ValueChanged<String?> onPicked;
  final ValueChanged<bool> onRemovedChanged;
  final bool editable;
  final bool enabled;

  static final _imageRe = RegExp(r'\.(png|jpe?g|gif|webp|bmp|heic)(\?|$)', caseSensitive: false);
  static final _pdfRe = RegExp(r'\.pdf(\?|$)', caseSensitive: false);

  static String absUrl(String u) =>
      u.startsWith('http') ? u : '${Env.apiBaseUrl}/${u.replaceFirst(RegExp(r'^/'), '')}';

  static String nameFromUrl(String u) {
    final last = Uri.decodeComponent(u.split('?').first.split('/').last);
    return last.replaceFirst(RegExp(r'^\d{10,}[-_]'), '');
  }

  Future<void> _pick() async {
    final r = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'],
    );
    final path = r?.files.single.path;
    if (path == null) return;
    if (await File(path).length() > 10 * 1024 * 1024) {
      onPicked(null);
      return;
    }
    onPicked(path);
    onRemovedChanged(false);
  }

  @override
  Widget build(BuildContext context) {
    final hasExisting = (existingUrl ?? '').isNotEmpty;
    final isNew = pickedPath != null;

    if (!isNew && (!hasExisting || removed)) {
      if (removed && hasExisting) {
        return Container(
          padding: EdgeInsets.all(context.w(12)),
          decoration: BoxDecoration(
            color: AppColors.danger.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text('The attached file will be deleted when you submit.',
                    style: TextStyle(color: AppColors.danger, fontSize: context.sp(13))),
              ),
              TextButton(onPressed: enabled ? () => onRemovedChanged(false) : null, child: const Text('Undo')),
            ],
          ),
        );
      }
      if (!editable) {
        return Text('No file attached.', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13)));
      }
      return OutlinedButton.icon(
        onPressed: enabled ? _pick : null,
        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(56)),
        icon: const Icon(Icons.upload_file_rounded),
        label: const Text('Attach work proof (max 10 MB)'),
      );
    }

    final name = isNew ? pickedPath!.split(Platform.pathSeparator).last : (existingName ?? nameFromUrl(existingUrl!));
    final isImage = _imageRe.hasMatch(isNew ? pickedPath! : existingUrl!);
    final isPdf = _pdfRe.hasMatch(isNew ? pickedPath! : existingUrl!);
    final url = isNew ? null : absUrl(existingUrl!);

    final Widget thumb = isImage
        ? ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: isNew
                ? Image.file(File(pickedPath!), width: 64, height: 64, fit: BoxFit.cover)
                : Image.network(url!, width: 64, height: 64, fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const _IconThumb(Icons.image_outlined)),
          )
        : _IconThumb(isPdf ? Icons.picture_as_pdf_outlined : Icons.insert_drive_file_outlined);

    return Container(
      padding: EdgeInsets.all(context.w(12)),
      decoration: BoxDecoration(
        border: Border.all(color: isNew ? AppColors.accent600 : AppColors.surfaceSubtle),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              thumb,
              SizedBox(width: context.w(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink)),
                    Text(isNew ? 'Not uploaded yet' : 'Saved',
                        style: TextStyle(color: isNew ? AppColors.accent700 : AppColors.inkMuted, fontSize: context.sp(12))),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: context.h(6)),
          Wrap(
            spacing: 4,
            children: [
              if (url != null)
                TextButton.icon(
                  onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
                  icon: const Icon(Icons.open_in_new, size: 18),
                  label: const Text('Open'),
                ),
              if (editable)
                TextButton.icon(
                  onPressed: enabled ? _pick : null,
                  icon: const Icon(Icons.swap_horiz, size: 18),
                  label: Text(isNew ? 'Change' : 'Replace'),
                ),
              if (editable)
                TextButton.icon(
                  onPressed: enabled ? () => isNew ? onPicked(null) : onRemovedChanged(true) : null,
                  style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                  icon: const Icon(Icons.delete_outline, size: 18),
                  label: Text(isNew ? 'Discard' : 'Delete'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _IconThumb extends StatelessWidget {
  const _IconThumb(this.icon);
  final IconData icon;
  @override
  Widget build(BuildContext context) => Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(color: AppColors.surfaceSubtle, borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, color: AppColors.inkMuted, size: 28),
      );
}

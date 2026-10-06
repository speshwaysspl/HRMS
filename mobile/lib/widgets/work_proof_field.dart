import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../env.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

/// A saved work-proof file on a task.
class ProofFile {
  const ProofFile(this.url, this.name);
  final String url;
  final String name;
}

/// Saved proofs of a task — `workProofs`, falling back to the legacy single `workProof`.
List<ProofFile> proofsOf(Map task) {
  String nameOr(dynamic name, String url) =>
      (name ?? '').toString().isNotEmpty ? name.toString() : WorkProofField.nameFromUrl(url);
  final list = task['workProofs'];
  if (list is List && list.isNotEmpty) {
    return [
      for (final p in list)
        if (p is Map && (p['url'] ?? '').toString().isNotEmpty)
          ProofFile(p['url'].toString(), nameOr(p['name'], p['url'].toString())),
    ];
  }
  final url = (task['workProof'] ?? '').toString();
  return url.isEmpty ? const [] : [ProofFile(url, nameOr(task['workProofName'], url))];
}

/// Work-proof attachments for a task (mirrors web `WorkProofField.jsx`): lists
/// saved files (open / delete with undo) and newly picked ones (discard), with an
/// "Add files" picker. Nothing is uploaded until the parent saves.
class WorkProofField extends StatelessWidget {
  const WorkProofField({
    super.key,
    required this.existing,
    required this.pickedPaths,
    required this.removed,
    required this.onPickedChanged,
    required this.onRemovedChanged,
    this.editable = true,
    this.enabled = true,
  });

  static const maxFiles = 10;
  static const _maxBytes = 10 * 1024 * 1024;

  final List<ProofFile> existing;
  final List<String> pickedPaths;
  final Set<String> removed; // saved URLs marked for deletion
  final ValueChanged<List<String>> onPickedChanged;
  final ValueChanged<Set<String>> onRemovedChanged;
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

  int get _room => maxFiles - existing.where((p) => !removed.contains(p.url)).length - pickedPaths.length;

  Future<void> _pick(BuildContext context) async {
    final r = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'],
    );
    if (r == null) return;
    final ok = <String>[];
    var tooBig = 0;
    for (final f in r.files) {
      final path = f.path;
      if (path == null) continue;
      if (await File(path).length() > _maxBytes) {
        tooBig++;
      } else {
        ok.add(path);
      }
    }
    final room = _room;
    final dropped = ok.length > room ? ok.length - room : 0;
    final added = ok.take(room < 0 ? 0 : room).toList();
    final msgs = [
      if (tooBig > 0) '$tooBig file${tooBig > 1 ? 's are' : ' is'} over 10 MB.',
      if (dropped > 0) 'Only $maxFiles files allowed; $dropped not added.',
    ];
    if (msgs.isNotEmpty && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msgs.join(' '))));
    }
    if (added.isNotEmpty) onPickedChanged([...pickedPaths, ...added]);
  }

  @override
  Widget build(BuildContext context) {
    if (!editable && existing.isEmpty) {
      return Text('No file attached.', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13)));
    }
    final room = _room;
    final gap = SizedBox(height: context.h(8));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final p in existing) ...[
          _row(
            context,
            name: p.name,
            path: p.url,
            networkUrl: absUrl(p.url),
            meta: removed.contains(p.url) ? 'Will be deleted when you submit' : 'Saved',
            tone: removed.contains(p.url) ? _Tone.removed : _Tone.saved,
            actions: [
              if (!removed.contains(p.url))
                TextButton.icon(
                  onPressed: () => launchUrl(Uri.parse(absUrl(p.url)), mode: LaunchMode.externalApplication),
                  icon: const Icon(Icons.open_in_new, size: 18),
                  label: const Text('Open'),
                ),
              if (editable && removed.contains(p.url))
                TextButton.icon(
                  onPressed: enabled && room > 0 ? () => onRemovedChanged({...removed}..remove(p.url)) : null,
                  icon: const Icon(Icons.undo, size: 18),
                  label: const Text('Undo'),
                ),
              if (editable && !removed.contains(p.url))
                TextButton.icon(
                  onPressed: enabled ? () => onRemovedChanged({...removed, p.url}) : null,
                  style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                  icon: const Icon(Icons.delete_outline, size: 18),
                  label: const Text('Delete'),
                ),
            ],
          ),
          gap,
        ],
        for (final path in pickedPaths) ...[
          _row(
            context,
            name: path.split(Platform.pathSeparator).last,
            path: path,
            localPath: path,
            meta: 'Not uploaded yet',
            tone: _Tone.added,
            actions: [
              TextButton.icon(
                onPressed: enabled ? () => onPickedChanged([...pickedPaths]..remove(path)) : null,
                style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                icon: const Icon(Icons.delete_outline, size: 18),
                label: const Text('Discard'),
              ),
            ],
          ),
          gap,
        ],
        if (editable && room > 0)
          OutlinedButton.icon(
            onPressed: enabled ? () => _pick(context) : null,
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(56)),
            icon: const Icon(Icons.upload_file_rounded),
            label: Text(existing.length + pickedPaths.length - removed.length > 0
                ? 'Add more files'
                : 'Attach work proof (up to $maxFiles, 10 MB each)'),
          ),
        if (editable && room <= 0)
          Text("You've reached the $maxFiles-file limit.",
              style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
      ],
    );
  }

  Widget _row(
    BuildContext context, {
    required String name,
    required String path,
    String? networkUrl,
    String? localPath,
    required String meta,
    required _Tone tone,
    required List<Widget> actions,
  }) {
    final isImage = _imageRe.hasMatch(path);
    final isPdf = _pdfRe.hasMatch(path);
    final Widget thumb = isImage && tone != _Tone.removed
        ? ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: localPath != null
                ? Image.file(File(localPath), width: 56, height: 56, fit: BoxFit.cover)
                : Image.network(networkUrl!, width: 56, height: 56, fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const _IconThumb(Icons.image_outlined)),
          )
        : _IconThumb(isPdf ? Icons.picture_as_pdf_outlined : Icons.insert_drive_file_outlined);
    final color = switch (tone) {
      _Tone.added => AppColors.accent700,
      _Tone.removed => AppColors.danger,
      _Tone.saved => AppColors.inkMuted,
    };

    return Container(
      padding: EdgeInsets.all(context.w(10)),
      decoration: BoxDecoration(
        color: tone == _Tone.removed ? AppColors.danger.withValues(alpha: 0.06) : null,
        border: Border.all(
          color: switch (tone) {
            _Tone.added => AppColors.accent600,
            _Tone.removed => AppColors.danger.withValues(alpha: 0.4),
            _Tone.saved => AppColors.surfaceSubtle,
          },
        ),
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
                    Text(name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: tone == _Tone.removed ? AppColors.danger : AppColors.ink,
                          decoration: tone == _Tone.removed ? TextDecoration.lineThrough : null,
                        )),
                    Text(meta, style: TextStyle(color: color, fontSize: context.sp(12))),
                  ],
                ),
              ),
            ],
          ),
          if (actions.isNotEmpty) Wrap(spacing: 4, children: actions),
        ],
      ),
    );
  }
}

enum _Tone { saved, added, removed }

class _IconThumb extends StatelessWidget {
  const _IconThumb(this.icon);
  final IconData icon;
  @override
  Widget build(BuildContext context) => Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(color: AppColors.surfaceSubtle, borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, color: AppColors.inkMuted, size: 26),
      );
}

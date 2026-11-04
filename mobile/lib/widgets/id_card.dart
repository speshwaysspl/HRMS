import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../services/api_client.dart';
import '../services/employee_service.dart';
import '../theme/app_theme.dart';

// Speshway ID card — mirrors frontend/src/components/common/IdCard.jsx and
// frontend/src/utils/idCard.js. Keep layout, address and QR payload in sync.

const _navy = Color(0xFF1C2344);
const _navyDeep = Color(0xFF161B35);
const _green = Color(0xFF3F8B45);
const double kIdCardWidth = 320;
const double kIdCardHeight = 550;

const idCardAddress = [
  'Plot No 1/C, Sy No 83/1,',
  'Raidurgam Knowledge City Rd,',
  'panmaktha Hyderabad,',
  'Serilingampalle (M), Rai Durg,',
  'Telangana 500032',
];
const idCardWebsite = 'www.speshway.com';
const idCardEmail = 'info@speshway.com';
const idCardPhone = '+91 91549 86732';

String _escapeMeCard(String v) => v
    .replaceAllMapped(RegExp(r'([\\;:,"])'), (m) => '\\${m[1]}')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();

String buildIdCardQrPayload(Map<String, dynamic> emp) {
  final user = emp['userId'] as Map? ?? {};
  final name = _escapeMeCard((user['name'] ?? 'SPESHWAY SOLUTIONS').toString());
  final phone = (emp['mobilenumber'] ?? '').toString().replaceAll(
    RegExp(r'[^\d+]'),
    '',
  );
  final code = _escapeMeCard((emp['employeeId'] ?? '').toString());
  var card = 'MECARD:N:$name;';
  if (phone.isNotEmpty) {
    card += 'TEL:${phone.length == 10 ? '+91$phone' : phone};';
  }
  if (code.isNotEmpty) card += 'NOTE:$code;';
  card += 'URL:$idCardWebsite;';
  return '$card;';
}

String formatIdCardPhone(dynamic mobile) {
  final digits = (mobile ?? '').toString().replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return '';
  return digits.length == 10 ? '+91 $digits' : '+$digits';
}

Uint8List? _decodePhoto(dynamic dataUrl) {
  final s = (dataUrl ?? '').toString();
  final i = s.indexOf('base64,');
  if (i < 0) return null;
  try {
    return base64Decode(s.substring(i + 7));
  } catch (_) {
    return null;
  }
}

/// Pick an image and return a square-cropped PNG data URL (~360px) for the
/// ID card — small enough for the server's 500 KB cap. Null if cancelled.
Future<String?> pickIdCardPhoto() async {
  final result = await FilePicker.platform.pickFiles(
    type: FileType.image,
    withData: true,
  );
  final file = result?.files.single;
  if (file == null) return null;
  final bytes =
      file.bytes ??
      (file.path != null ? await File(file.path!).readAsBytes() : null);
  if (bytes == null) return null;

  final codec = await ui.instantiateImageCodec(bytes);
  final src = (await codec.getNextFrame()).image;
  const size = 360.0;
  final side = src.width < src.height ? src.width : src.height;
  final sx = (src.width - side) / 2;
  // Bias upward on portrait photos so faces stay centred (same as web).
  final sy = src.height > src.width
      ? (src.height - side) * 0.3
      : (src.height - side) / 2;
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  canvas.drawRect(
    const Rect.fromLTWH(0, 0, size, size),
    Paint()..color = Colors.white,
  );
  canvas.drawImageRect(
    src,
    Rect.fromLTWH(sx, sy, side.toDouble(), side.toDouble()),
    const Rect.fromLTWH(0, 0, size, size),
    Paint()..filterQuality = FilterQuality.high,
  );
  final out = await recorder.endRecording().toImage(size.toInt(), size.toInt());
  final png = await out.toByteData(format: ui.ImageByteFormat.png);
  if (png == null) return null;
  return 'data:image/png;base64,${base64Encode(png.buffer.asUint8List())}';
}

/// Paints the card's background shapes in the same 320×550 coordinate space
/// as the web SVG paths (frontend/src/components/common/IdCard.jsx).
class _CardBgPainter extends CustomPainter {
  final bool back;
  const _CardBgPainter({this.back = false});

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / kIdCardWidth, size.height / kIdCardHeight);
    final navy = Paint()..color = _navy;
    final green = Paint()..color = _green;
    if (!back) {
      canvas.drawPath(Path()..moveTo(0, 0)..lineTo(120, 0)..cubicTo(80, 6, 30, 22, 0, 48)..close(), navy);
      // Symmetric arch centred under the photo (matches web).
      canvas.drawPath(
          Path()
            ..moveTo(0, 238)
            ..quadraticBezierTo(160, 158, 320, 238)
            ..lineTo(320, 256)
            ..quadraticBezierTo(160, 176, 0, 256)
            ..close(),
          green);
      canvas.drawPath(
          Path()..moveTo(0, 256)..quadraticBezierTo(160, 176, 320, 256)..lineTo(320, 550)..lineTo(0, 550)..close(), navy);
    } else {
      canvas.drawPath(
        Path()
          ..moveTo(200, 0)
          ..lineTo(320, 0)
          ..lineTo(320, 60)
          ..cubicTo(300, 30, 260, 8, 200, 0)
          ..close(),
        navy,
      );
      canvas.drawPath(
        Path()
          ..moveTo(0, 470)
          ..cubicTo(100, 440, 220, 500, 320, 462)
          ..lineTo(320, 476)
          ..cubicTo(220, 514, 100, 454, 0, 484)
          ..close(),
        green,
      );
      canvas.drawPath(
        Path()
          ..moveTo(0, 484)
          ..cubicTo(100, 454, 220, 514, 320, 476)
          ..lineTo(320, 550)
          ..lineTo(0, 550)
          ..close(),
        navy,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _CardBgPainter old) => old.back != back;
}

class _Shell extends StatelessWidget {
  final bool back;
  final List<Widget> children;
  const _Shell({required this.children, this.back = false});

  @override
  Widget build(BuildContext context) => MediaQuery.withNoTextScaling(
    child: Container(
      width: kIdCardWidth,
      height: kIdCardHeight,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: DefaultTextStyle(
        // Times New Roman (iOS); Android has no TNR, so it falls back to the system serif.
            style: const TextStyle(color: Colors.white, fontFamily: 'Times New Roman', fontFamilyFallback: ['serif']),
        child: Stack(
          children: [
            Positioned.fill(
              child: CustomPaint(painter: _CardBgPainter(back: back)),
            ),
            ...children,
          ],
        ),
      ),
    ),
  );
}

class _Logo extends StatelessWidget {
  final double size;
  const _Logo({this.size = 56});

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Image.asset(
        'assets/logo.png',
        width: size,
        height: size,
        fit: BoxFit.contain,
      ),
      const SizedBox(width: 10),
      const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'SPESHWAY',
            style: TextStyle(
              color: _navy,
              fontWeight: FontWeight.w800,
              fontSize: 28,
              height: 1,
              letterSpacing: .6,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'SOLUTIONS',
            style: TextStyle(
              color: _green,
              fontWeight: FontWeight.w600,
              fontSize: 13,
              height: 1,
              letterSpacing: 5.4,
            ),
          ),
        ],
      ),
    ],
  );
}

const _ink = Color(0xFF111827);

/// Photo position inside the card circle — zoom 1–3.5, pan ±80% of the circle.
/// Same clamp as web (utils/idCard.js parseIdCardPhoto) and the server.
Map<String, double> parseIdCardPhoto(dynamic v) {
  double pick(dynamic x, double min, double max, double fb) {
    final n = x is num ? x.toDouble() : double.tryParse('${x ?? ''}');
    return n == null || n.isNaN ? fb : n.clamp(min, max).toDouble();
  }

  final m = v is Map ? v : const {};
  return {
    'scale': pick(m['scale'], 1, 3.5, 1),
    'x': pick(m['x'], -80, 80, 0),
    'y': pick(m['y'], -80, 80, 0),
  };
}

const _defaultFit = {'scale': 1.0, 'x': 0.0, 'y': 0.0};

/// Front of the card. With [onPhotoFitChange] set, the photo can be dragged
/// to move and pinched to zoom (same as nutri_hrms); the caller saves it.
class IdCardFront extends StatelessWidget {
  final Map<String, dynamic> employee;
  final Map<String, double>? photoFit;
  final ValueChanged<Map<String, double>>? onPhotoFitChange;
  const IdCardFront({
    super.key,
    required this.employee,
    this.photoFit,
    this.onPhotoFitChange,
  });

  @override
  Widget build(BuildContext context) {
    final name = ((employee['userId'] as Map?)?['name'] ?? '').toString();
    final photo = _decodePhoto(employee['profileImage']);
    final fit = photoFit ?? parseIdCardPhoto(employee['idCardPhoto']);

    final initials = name
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0])
        .join()
        .toUpperCase();
    return _Shell(
      children: [
        const Positioned(top: 30, left: 0, right: 0, child: _Logo()),
        Positioned(
          top: 108,
          left: (kIdCardWidth - 156) / 2,
          child: Container(
            width: 156,
            height: 156,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFE5E7EB),
              border: Border.all(color: Colors.white, width: 5),
              boxShadow: const [BoxShadow(color: _green, spreadRadius: 2)],
            ),
            alignment: Alignment.center,
            child: photo != null
                ? _FitGesture(
                    fit: fit,
                    onChanged: onPhotoFitChange,
                    child: Transform.translate(
                      offset: Offset(
                        fit['x']! / 100 * 156,
                        fit['y']! / 100 * 156,
                      ),
                      child: Transform.scale(
                        scale: fit['scale']!,
                        child: Image.memory(
                          photo,
                          width: 156,
                          height: 156,
                          fit: BoxFit.cover,
                          gaplessPlayback: true,
                        ),
                      ),
                    ),
                  )
                : Text(
                    initials.isEmpty ? '?' : initials,
                    style: const TextStyle(
                      fontSize: 46,
                      fontWeight: FontWeight.w700,
                      color: _navy,
                    ),
                  ),
          ),
        ),
        Positioned(
          top: 278,
          left: 16,
          right: 16,
          child: Column(
            children: [
              Text(
                name.isEmpty ? '—' : name.toUpperCase(),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: name.length > 22 ? 17 : 21,
                  height: 1.15,
                  letterSpacing: .6,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                (employee['designation'] ?? '').toString(),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: Color(0xCCFFFFFF),
                ),
              ),
              Container(
                height: 1,
                width: 210,
                margin: const EdgeInsets.fromLTRB(0, 10, 0, 6),
                color: const Color(0x73FFFFFF),
              ),
              const Text(
                'EMPLOYEE ID',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: .9,
                ),
              ),
              const SizedBox(height: 5),
              Container(
                constraints: const BoxConstraints(minWidth: 140),
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: const Color(0x1FFFFFFF),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                child: Text(
                  (employee['employeeId'] ?? '—').toString(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    letterSpacing: .6,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: QrImageView(
                  data: buildIdCardQrPayload(employee),
                  size: 84,
                  padding: EdgeInsets.zero,
                  backgroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          height: 44,
          child: Container(
            decoration: const BoxDecoration(
              color: _navyDeep,
              border: Border(top: BorderSide(color: _green, width: 3)),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.verified_user_outlined,
                  color: Colors.white,
                  size: 26,
                ),
                SizedBox(width: 10),
                Text(
                  'Scan to save contact\nName · Phone · Employee ID',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    height: 1.25,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ContactRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _ContactRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 12),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: const BoxDecoration(color: _navy, shape: BoxShape.circle),
          child: Icon(icon, size: 16, color: Colors.white),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: _green,
                  letterSpacing: .7,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                value,
                style: const TextStyle(fontSize: 12, color: _ink, height: 1.4),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

/// Back follows the nutri_hrms back: logo, CONFIDENTIAL badge + return notice,
/// then contact / office / website / email rows, navy wave footer.
class IdCardBack extends StatelessWidget {
  final Map<String, dynamic> employee;
  const IdCardBack({super.key, required this.employee});

  @override
  Widget build(BuildContext context) {
    return _Shell(
      back: true,
      children: [
        const Positioned(top: 34, left: 0, right: 0, child: _Logo(size: 54)),
        Positioned(
          top: 110,
          left: 18,
          right: 18,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: _navy,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'CONFIDENTIAL',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    letterSpacing: 1,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: 'This card is the property of '),
                    TextSpan(
                      text: 'Speshway Solutions',
                      style: TextStyle(
                        color: _green,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    TextSpan(
                      text: '.\nIf found, please return to the HR Department.',
                    ),
                  ],
                ),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: _ink,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
        Positioned(
          top: 212,
          left: 22,
          right: 18,
          child: Column(
            children: [
              const _ContactRow(Icons.phone_in_talk, 'CONTACT', idCardPhone),
              _ContactRow(
                Icons.location_on,
                'REGISTERED OFFICE',
                idCardAddress.join(' '),
              ),
              const _ContactRow(Icons.language, 'WEBSITE', idCardWebsite),
              const _ContactRow(Icons.email, 'EMAIL', idCardEmail),
            ],
          ),
        ),
        const Positioned(
          bottom: 22,
          left: 0,
          right: 0,
          child: Text(
            'SPESHWAY SOLUTIONS PVT. LTD.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.7,
            ),
          ),
        ),
      ],
    );
  }
}

/// Bottom sheet with the front + back of the ID card.
/// [allowManage] (admin/HR) adds photo upload and a print-ready PDF share.
Future<void> showIdCardSheet(
  BuildContext context, {
  required Map<String, dynamic> employee,
  bool allowManage = false,
  ValueChanged<Map<String, dynamic>>? onPhotoChanged,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _IdCardSheet(
      employee: employee,
      allowManage: allowManage,
      onPhotoChanged: onPhotoChanged,
    ),
  );
}

class _IdCardSheet extends StatefulWidget {
  final Map<String, dynamic> employee;
  final bool allowManage;
  final ValueChanged<Map<String, dynamic>>? onPhotoChanged;
  const _IdCardSheet({
    required this.employee,
    required this.allowManage,
    this.onPhotoChanged,
  });

  @override
  State<_IdCardSheet> createState() => _IdCardSheetState();
}

class _IdCardSheetState extends State<_IdCardSheet> {
  final _frontKey = GlobalKey();
  final _backKey = GlobalKey();
  late Map<String, dynamic> _emp = Map<String, dynamic>.from(widget.employee);
  String _busy = '';
  late Map<String, double> _fit = parseIdCardPhoto(
    widget.employee['idCardPhoto'],
  );

  bool get _fitDirty {
    final saved = parseIdCardPhoto(_emp['idCardPhoto']);
    return saved.keys.any((k) => saved[k] != _fit[k]);
  }

  void _zoom(double f) => setState(
    () => _fit = parseIdCardPhoto({..._fit, 'scale': _fit['scale']! * f}),
  );

  Future<void> _removePhoto() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove photo?'),
        content: const Text('Initials will show on the ID card.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Remove',
              style: TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busy = 'remove');
    try {
      await EmployeeService().updatePhoto(_emp['_id'].toString(), '');
      if (!mounted) return;
      final patch = {'profileImage': '', 'idCardPhoto': _defaultFit};
      setState(() {
        _emp = {..._emp, ...patch};
        _fit = Map.of(_defaultFit);
      });
      widget.onPhotoChanged?.call(patch);
    } catch (e) {
      if (mounted) _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = '');
    }
  }

  Future<void> _saveFit() async {
    setState(() => _busy = 'fit');
    try {
      final saved = await EmployeeService().updatePhotoFit(
        _emp['_id'].toString(),
        _fit,
      );
      if (!mounted) return;
      setState(() => _emp = {..._emp, 'idCardPhoto': saved});
      widget.onPhotoChanged?.call({'idCardPhoto': saved});
    } catch (e) {
      if (mounted) _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = '');
    }
  }

  void _snack(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _upload() async {
    setState(() => _busy = 'upload');
    try {
      final dataUrl = await pickIdCardPhoto();
      if (dataUrl == null) return;
      final saved = await EmployeeService().updatePhoto(
        _emp['_id'].toString(),
        dataUrl,
      );
      if (!mounted) return;
      final patch = {'profileImage': saved, 'idCardPhoto': _defaultFit};
      setState(() {
        _emp = {..._emp, ...patch};
        _fit = Map.of(_defaultFit);
      });
      widget.onPhotoChanged?.call(patch);
    } catch (e) {
      if (mounted) _snack(extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = '');
    }
  }

  Future<Uint8List> _capture(GlobalKey key) async {
    final boundary =
        key.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final image = await boundary.toImage(pixelRatio: 3);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    return data!.buffer.asUint8List();
  }

  /// Front + back side by side on one PDF page — same sheet as the web download.
  Future<void> _sharePdf() async {
    setState(() => _busy = 'pdf');
    try {
      final front = await _capture(_frontKey);
      final back = await _capture(_backKey);
      const gap = 32.0, margin = 24.0;
      final doc = pw.Document();
      doc.addPage(
        pw.Page(
          pageFormat: const PdfPageFormat(
            margin * 2 + kIdCardWidth * 2 + gap,
            margin * 2 + kIdCardHeight,
          ),
          build: (_) => pw.Padding(
            padding: const pw.EdgeInsets.all(margin),
            child: pw.Row(
              children: [
                pw.Image(
                  pw.MemoryImage(front),
                  width: kIdCardWidth,
                  height: kIdCardHeight,
                ),
                pw.SizedBox(width: gap),
                pw.Image(
                  pw.MemoryImage(back),
                  width: kIdCardWidth,
                  height: kIdCardHeight,
                ),
              ],
            ),
          ),
        ),
      );
      final dir = await getTemporaryDirectory();
      final file = File(
        '${dir.path}/speshway-id-card-${_emp['employeeId'] ?? 'employee'}.pdf',
      );
      await file.writeAsBytes(await doc.save());
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: 'application/pdf')],
          subject: 'ID card — ${(_emp['userId'] as Map?)?['name'] ?? ''}',
        ),
      );
    } catch (e) {
      if (mounted) _snack("Couldn't prepare the ID card. Please try again.");
    } finally {
      if (mounted) setState(() => _busy = '');
    }
  }

  Widget _side(String label, GlobalKey key, Widget card) => Column(
    children: [
      Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.inkFaint,
          letterSpacing: .6,
        ),
      ),
      const SizedBox(height: 8),
      // Cards render at print size and scale down to fit narrow phones.
      FittedBox(
        child: RepaintBoundary(key: key, child: card),
      ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final hasPhoto = (_emp['profileImage'] ?? '').toString().isNotEmpty;
    // Draggable rounded sheet with grab handle + centred title, like nutri_hrms.
    return DraggableScrollableSheet(
      initialChildSize: widget.allowManage ? 0.9 : 0.8,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(
              'Digital ID Card',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 16),
            if (!hasPhoto)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  widget.allowManage
                      ? 'No photo yet — initials are shown. Upload a photo before printing.'
                      : "Your photo hasn't been added yet. Ask HR to add it.",
                  style: TextStyle(fontSize: 13, color: AppColors.inkMuted),
                ),
              ),
            _side(
              'Front',
              _frontKey,
              IdCardFront(
                employee: _emp,
                photoFit: _fit,
                onPhotoFitChange: widget.allowManage && hasPhoto
                    ? (f) => setState(() => _fit = f)
                    : null,
              ),
            ),
            if (widget.allowManage && hasPhoto) ...[
              const SizedBox(height: 10),
              Text(
                'Drag the photo to move it, pinch to zoom',
                style: TextStyle(fontSize: 13, color: AppColors.inkMuted),
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton.outlined(
                    onPressed: () => _zoom(0.9),
                    icon: const Icon(Icons.remove),
                    tooltip: 'Zoom out',
                  ),
                  IconButton.outlined(
                    onPressed: () => _zoom(1.12),
                    icon: const Icon(Icons.add),
                    tooltip: 'Zoom in',
                  ),
                  IconButton.outlined(
                    onPressed: () => setState(() => _fit = Map.of(_defaultFit)),
                    icon: const Icon(Icons.restart_alt),
                    tooltip: 'Reset position',
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _fitDirty && _busy.isEmpty ? _saveFit : null,
                    child: Text(_busy == 'fit' ? 'Saving…' : 'Save position'),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 20),
            _side('Back', _backKey, IdCardBack(employee: _emp)),
            if (widget.allowManage) ...[
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _busy.isEmpty ? _upload : null,
                      icon: const Icon(Icons.upload_outlined, size: 18),
                      label: Text(
                        _busy == 'upload'
                            ? 'Uploading…'
                            : hasPhoto
                            ? 'Change photo'
                            : 'Upload photo',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _busy.isEmpty ? _sharePdf : null,
                      icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
                      label: Text(_busy == 'pdf' ? 'Preparing…' : 'Share PDF'),
                    ),
                  ),
                ],
              ),
              if (hasPhoto)
                TextButton.icon(
                  onPressed: _busy.isEmpty ? _removePhoto : null,
                  icon: const Icon(
                    Icons.delete_outline,
                    size: 18,
                    color: AppColors.danger,
                  ),
                  label: Text(
                    _busy == 'remove' ? 'Removing…' : 'Remove photo',
                    style: const TextStyle(color: AppColors.danger),
                  ),
                ),
            ] else ...[
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _busy.isEmpty ? _sharePdf : null,
                icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
                label: Text(_busy == 'pdf' ? 'Preparing…' : 'Download ID card (PDF)'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Drag-to-move / pinch-to-zoom for the card photo. Keeps the gesture's
/// starting fit in State so parent rebuilds mid-gesture don't make it drift.
class _FitGesture extends StatefulWidget {
  final Map<String, double> fit;
  final ValueChanged<Map<String, double>>? onChanged;
  final Widget child;
  const _FitGesture({
    required this.fit,
    required this.onChanged,
    required this.child,
  });

  @override
  State<_FitGesture> createState() => _FitGestureState();
}

class _FitGestureState extends State<_FitGesture> {
  Map<String, double> _start = const {};
  Offset _focal = Offset.zero;

  @override
  Widget build(BuildContext context) {
    final onChanged = widget.onChanged;
    if (onChanged == null) return widget.child;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onScaleStart: (d) {
        _start = widget.fit;
        _focal = d.focalPoint;
      },
      onScaleUpdate: (d) {
        final delta = d.focalPoint - _focal;
        onChanged(
          parseIdCardPhoto({
            'scale': _start['scale']! * d.scale,
            'x': _start['x']! + delta.dx / 156 * 100,
            'y': _start['y']! + delta.dy / 156 * 100,
          }),
        );
      },
      child: widget.child,
    );
  }
}

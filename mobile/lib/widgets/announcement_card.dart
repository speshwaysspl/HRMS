import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// Themed announcement (nutri_hrms style) — one design per type, same palettes
/// as the web card (frontend/src/index.css `.anc[data-type]`,
/// components/announcements/AnnouncementCard.jsx). Keep both in sync.
enum AnnouncementVariant { card, full, compact }

class AnnouncementTheme {
  final String label;
  final IconData icon;
  final Color accent, deep, soft, surface, ink, muted;
  const AnnouncementTheme(this.label, this.icon, this.accent, this.deep, this.soft,
      {this.surface = Colors.white, this.ink = const Color(0xFF0F172A), this.muted = const Color(0xFF475569)});
}

const announcementThemes = <String, AnnouncementTheme>{
  'important': AnnouncementTheme('Important Announcement', Icons.campaign_outlined,
      Color(0xFFC2311F), Color(0xFF7A1A0F), Color(0xFFFDEBE7)),
  'quote': AnnouncementTheme('Today\'s Quote', Icons.format_quote_rounded,
      Color(0xFFA99BFF), Color(0xFFE9E5FF), Color(0x14FFFFFF),
      surface: Color(0xFF24215F), ink: Colors.white, muted: Color(0xFFC9C3F3)),
  'festival': AnnouncementTheme('Festival Greeting', Icons.celebration_outlined,
      Color(0xFFE0650B), Color(0xFF7C2D06), Color(0xFFFFEFDC), surface: Color(0xFFFFFAF3)),
  'event': AnnouncementTheme('Event & Activity', Icons.event_outlined,
      Color(0xFF0F766E), Color(0xFF134E4A), Color(0xFFE3F4F1)),
  'achievement': AnnouncementTheme('Achievement', Icons.emoji_events_outlined,
      Color(0xFFB7791F), Color(0xFF6B4210), Color(0xFFFDF3DC), surface: Color(0xFFFFFDF7)),
  'notice': AnnouncementTheme('Company Notice', Icons.push_pin_outlined,
      Color(0xFF475569), Color(0xFF1E293B), Color(0xFFEEF2F6)),
  'birthday': AnnouncementTheme('Birthday', Icons.cake_outlined,
      Color(0xFFBE185D), Color(0xFF831843), Color(0xFFFDE7F1), surface: Color(0xFFFFFAFC)),
  'anniversary': AnnouncementTheme('Work Anniversary', Icons.workspace_premium_outlined,
      Color(0xFF6D28D9), Color(0xFF4C1D95), Color(0xFFEFE7FE)),
  'holiday': AnnouncementTheme('Holiday', Icons.beach_access_outlined,
      Color(0xFF15803D), Color(0xFF14532D), Color(0xFFE5F6EA)),
};

/// 'general' (legacy) and unknown categories render as Company Notice.
String announcementType(dynamic category) {
  final c = category?.toString();
  return c == null || c == 'general' || !announcementThemes.containsKey(c) ? 'notice' : c;
}

String announcementTimeAgo(DateTime d) {
  final min = DateTime.now().difference(d).inMinutes;
  if (min < 1) return 'just now';
  if (min < 60) return '$min min ago';
  final h = (min / 60).round();
  if (h < 24) return '$h h ago';
  if (h < 48) return 'Yesterday';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${d.day} ${months[d.month - 1]}';
}

class AnnouncementCard extends StatelessWidget {
  final Map<String, dynamic> item;
  final AnnouncementVariant variant;
  final bool isNew;
  final VoidCallback? onTap;
  const AnnouncementCard({super.key, required this.item, this.variant = AnnouncementVariant.card, this.isNew = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    final type = announcementType(item['category']);
    final t = announcementThemes[type]!;
    final compact = variant == AnnouncementVariant.compact;
    final full = variant == AnnouncementVariant.full;
    final title = item['title']?.toString() ?? '';
    final message = item['description']?.toString() ?? '';
    final image = item['imageUrl']?.toString() ?? '';
    final pinned = item['pinned'] == true;
    final author = (item['createdBy'] is Map ? item['createdBy']['name']?.toString() : null) ?? 'HR';
    final when = DateTime.tryParse((item['publishedAt'] ?? item['createdAt'] ?? '').toString())?.toLocal();
    final maxLines = full ? null : (compact ? 2 : 3);
    final important = type == 'important';

    Widget pill(String text, {IconData? icon, required Color bg, required Color fg}) => Container(
          margin: const EdgeInsets.only(left: 6),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            if (icon != null) ...[Icon(icon, size: 11, color: fg), const SizedBox(width: 3)],
            Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg)),
          ]),
        );

    final band = Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 13 : 16, vertical: compact ? 8 : 10),
      decoration: BoxDecoration(
        color: important ? t.accent : t.soft,
        gradient: type == 'festival' ? const LinearGradient(colors: [Color(0xFFFFE2BF), Color(0xFFFFF1D0)]) : null,
        border: type == 'festival' ? const Border(bottom: BorderSide(color: Color(0xFFF4A63A), width: 3)) : null,
      ),
      child: Row(children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: important || type == 'quote' ? Colors.white.withValues(alpha: 0.16) : t.accent,
            borderRadius: BorderRadius.circular(9),
          ),
          child: Icon(t.icon, size: compact ? 15 : 17, color: type == 'quote' ? t.deep : Colors.white),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(t.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: important ? Colors.white : t.deep)),
        ),
        if (pinned)
          pill('Pinned',
              icon: Icons.push_pin,
              bg: important || type == 'quote' ? Colors.white.withValues(alpha: 0.18) : t.surface,
              fg: important || type == 'quote' ? Colors.white : t.deep),
        if (isNew) pill('New', bg: important ? Colors.white : t.accent, fg: important ? t.accent : (type == 'quote' ? const Color(0xFF1D1A4F) : Colors.white)),
        if (type == 'achievement') const SizedBox(width: 30), // room for the ribbon
      ]),
    );

    final meta = Text('$author${when != null ? ' · ${announcementTimeAgo(when)}' : ''}',
        style: TextStyle(fontSize: 12.5, color: t.muted));

    final text = type == 'quote'
        ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('“', style: TextStyle(fontFamily: 'serif', fontSize: 52, height: 0.9, color: t.accent)),
            Text(message,
                maxLines: maxLines,
                overflow: maxLines == null ? null : TextOverflow.ellipsis,
                style: TextStyle(fontFamily: 'serif', fontStyle: FontStyle.italic, fontSize: full ? 21 : 17, height: 1.5, color: t.ink)),
            const SizedBox(height: 6),
            Text('— $title', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: t.muted)),
            const SizedBox(height: 6),
            meta,
          ])
        : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style: TextStyle(fontSize: full ? 24 : 16.5, fontWeight: FontWeight.w700, height: 1.3, color: t.ink, letterSpacing: full ? -0.3 : 0)),
            if (message.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(message,
                  maxLines: maxLines,
                  overflow: maxLines == null ? null : TextOverflow.ellipsis,
                  style: TextStyle(fontSize: full ? 16 : 14.5, height: full ? 1.65 : 1.55, color: t.ink)),
            ],
            const SizedBox(height: 6),
            meta,
          ]);

    final body = Padding(
      padding: EdgeInsets.fromLTRB(compact ? 14 : 17, compact ? 12 : 15, compact ? 14 : 17, compact ? 13 : 17),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (type == 'event' && when != null) ...[
          Container(
            width: 58,
            height: 62,
            decoration: BoxDecoration(
              color: t.soft,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: t.accent.withValues(alpha: 0.25)),
            ),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('${when.day}', style: TextStyle(fontSize: 23, height: 1, fontWeight: FontWeight.w800, color: t.deep)),
              Text(const ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][when.month - 1],
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: t.deep)),
            ]),
          ),
          const SizedBox(width: 14),
        ],
        Expanded(child: text),
      ]),
    );

    final card = Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: t.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isNew ? t.accent : t.accent.withValues(alpha: 0.22)),
        boxShadow: [BoxShadow(color: t.accent.withValues(alpha: 0.10), blurRadius: 18, offset: const Offset(0, 6))],
      ),
      child: Stack(children: [
        Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          band,
          if (image.isNotEmpty && !compact)
            ConstrainedBox(
              constraints: BoxConstraints(maxHeight: full ? 440 : 260),
              // Tap → full image in a bottom sheet (pinch to zoom).
              child: Semantics(
                button: true,
                label: 'View image',
                child: GestureDetector(
                  onTap: () => showAnnouncementImage(context, image, title: title),
                  // Disk-cached (instant on revisit) and decoded at screen width,
                  // not the image's full resolution; soft placeholder while loading.
                  child: CachedNetworkImage(
                    imageUrl: image,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    memCacheWidth: (MediaQuery.sizeOf(context).width * MediaQuery.devicePixelRatioOf(context)).round(),
                    fadeInDuration: const Duration(milliseconds: 180),
                    placeholder: (_, _) => Container(height: compact ? 0 : 180, color: t.soft),
                    errorWidget: (_, _, _) => const SizedBox.shrink(),
                  ),
                ),
              ),
            ),
          // Notice: ruled "notice board" lines behind the text.
          if (type == 'notice') CustomPaint(painter: _RuledPainter(), child: body) else body,
        ]),
        if (type == 'achievement')
          Positioned(top: 0, right: 22, child: ClipPath(clipper: _RibbonClipper(), child: Container(width: 22, height: 34, color: const Color(0xE6D69E2E)))),
      ]),
    );

    if (onTap == null) return Semantics(container: true, child: card);
    return Semantics(
      button: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(16), child: card),
      ),
    );
  }
}

class _RuledPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = const Color(0xFFEEF2F6);
    for (double y = 27; y < size.height; y += 28) {
      canvas.drawRect(Rect.fromLTWH(0, y, size.width, 1), p);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _RibbonClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size s) => Path()
    ..moveTo(0, 0)
    ..lineTo(s.width, 0)
    ..lineTo(s.width, s.height)
    ..lineTo(s.width / 2, s.height * 0.75)
    ..lineTo(0, s.height)
    ..close();

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

/// Announcement image in a draggable bottom sheet — grab handle, title,
/// pinch / double-tap to zoom, close button.
Future<void> showAnnouncementImage(BuildContext context, String url, {String title = ''}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (ctx, scroll) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFF0E1122),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(children: [
          // Handle + header scroll the sheet; the image area is for zooming.
          SingleChildScrollView(
            controller: scroll,
            physics: const ClampingScrollPhysics(),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 8, 4),
              child: Column(children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
                ),
                Row(children: [
                  Expanded(
                    child: Text(title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                  IconButton(
                    tooltip: 'Close',
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ]),
              ]),
            ),
          ),
          Expanded(
            child: InteractiveViewer(
              minScale: 1,
              maxScale: 5,
              child: Center(
                // Same disk-cached file as the card, so it opens instantly.
                child: CachedNetworkImage(
                  imageUrl: url,
                  fit: BoxFit.contain,
                  placeholder: (_, _) => const CircularProgressIndicator(color: Colors.white),
                  errorWidget: (_, _, _) => const Text("Couldn't load the image", style: TextStyle(color: Colors.white70)),
                ),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Text('Pinch to zoom', style: TextStyle(color: Colors.white54, fontSize: 12.5)),
          ),
        ]),
      ),
    ),
  );
}

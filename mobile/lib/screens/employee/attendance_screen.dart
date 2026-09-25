import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import '../../main.dart';
import '../../services/api_client.dart';
import '../../services/app_events.dart';
import '../../services/attendance_service.dart';
import '../../services/offline_punch_service.dart';
import '../../services/location_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';
import '../../widgets/hrms_app_bar.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> with WidgetsBindingObserver {
  final _service = AttendanceService();
  Map<String, dynamic>? _today;
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  Object? _lastError;
  // No default — the employee must actively pick a mode before checking in,
  // and it locks once they have (mirrors the web Attendance screen).
  String? _workMode;

  final _locationService = LocationService();
  LocationFix? _location;
  DateTime? _locationAt; // when _location was captured
  bool _locationLoading = false;
  String? _locationError;
  bool _breakBusy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final cache = AppCaches.of(context).attendanceToday;
    // Ignore a cached record from a previous day (app kept open past
    // midnight) so a new day always starts on Check In, never Check Out.
    if (cache.hasData && cache.data?['date']?.toString() == _todayDate) {
      // Show last-known data immediately, then quietly refresh.
      _today = cache.data;
      _workMode = _today?['workMode']?.toString();
      _loading = false;
      _load(silent: true);
    } else {
      _load();
    }
    _fetchLocation();
    _syncOffline();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // Coming back from system Settings after enabling location: fetch it
  // automatically — no manual retry needed.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    // The day may have rolled over while backgrounded — refresh today's record.
    _syncOffline().then((_) => _load(silent: true));
    if (_location == null && !_locationLoading) {
      _fetchLocation();
    }
  }

  Future<void> _fetchLocation() async {
    setState(() {
      _locationLoading = true;
      _locationError = null;
    });
    try {
      // Map first (fast GPS / cached fix), address fills in right after.
      final quick = await _locationService.getQuickFix();
      if (!mounted) return;
      setState(() {
        _location = quick;
        _locationAt = DateTime.now();
        _locationLoading = false;
      });
      final area = await _locationService.resolveArea(quick.latitude, quick.longitude);
      if (!mounted) return;
      setState(() => _location = LocationFix(latitude: quick.latitude, longitude: quick.longitude, area: area));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _locationError = e.toString();
        _locationLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _breaks =>
      ((_today?['breaks'] as List?) ?? []).map((b) => Map<String, dynamic>.from(b as Map)).toList();

  bool get _hasOngoingBreak => _breaks.any((b) => b['end'] == null || b['end'] == '');

  Future<void> _startBreak() async {
    setState(() => _breakBusy = true);
    try {
      final updated = [..._breaks, {'start': _nowTime, 'end': ''}];
      await _service.saveBreaks(date: _todayDate, breaks: updated);
      await _load();
    } catch (e) {
      if (mounted) _toast(extractErrorMessage(e), isError: true);
    } finally {
      if (mounted) setState(() => _breakBusy = false);
    }
  }

  Future<void> _endBreak(int index) async {
    setState(() => _breakBusy = true);
    try {
      final updated = [..._breaks];
      updated[index] = {...updated[index], 'end': _nowTime};
      await _service.saveBreaks(date: _todayDate, breaks: updated);
      await _load();
    } catch (e) {
      if (mounted) _toast(extractErrorMessage(e), isError: true);
    } finally {
      if (mounted) setState(() => _breakBusy = false);
    }
  }

  /// No connection: keep the punch with the time it was made, show it on
  /// screen right away, and let [_syncOffline] send it later.
  Future<void> _saveOffline(Map<String, dynamic> payload, String time, Map<String, dynamic> localUpdate) async {
    await OfflinePunchService.save(payload, date: _todayDate, time: time);
    if (!mounted) return;
    setState(() => _today = {...?_today, 'date': _todayDate, ...localUpdate});
    _toast("You're offline — saved at $time. It will sync automatically.");
  }

  Future<void> _syncOffline() async {
    final result = await OfflinePunchService.flush();
    if (result == null || !mounted) return;
    if (result == 'synced') {
      _toast('Offline punch synced.');
      AppEvents.bumpAttendance();
    } else {
      _toast(result, isError: true);
    }
    await _load(silent: true);
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
        _lastError = null;
      });
    }
    try {
      final result = await _service.getToday();
      if (!mounted) return;
      if (result != null) {
        AppCaches.of(context).attendanceToday.set(result);
      }
      setState(() {
        _today = result;
        _workMode = _today?['workMode']?.toString();
        _loading = false;
        _error = null;
        _lastError = null;
      });
    } catch (e) {
      if (!mounted) return;
      // If a silent background refresh fails, keep showing the cached data
      // instead of replacing it with an error state.
      if (silent && _today != null) return;
      setState(() {
        _error = extractErrorMessage(e);
        _lastError = e;
        _loading = false;
      });
    }
  }

  /// The API returns "" (not null) for a time that hasn't happened yet.
  bool _hasTime(String key) {
    final v = _today?[key]?.toString().trim();
    return v != null && v.isNotEmpty && v != 'null';
  }

  String _timeOrDash(String key) => _hasTime(key) ? _today![key].toString() : '--:--';

  String get _todayDate => DateFormat('yyyy-MM-dd').format(DateTime.now());
  String get _nowTime => DateFormat('HH:mm').format(DateTime.now());

  /// Location for a punch, without making the user wait. Reuses the fix
  /// already on screen when it's under 2 minutes old (the common case);
  /// otherwise takes a quick fix and gives the address lookup at most 3 s.
  /// Returns null only when there is no usable location at all.
  Future<LocationFix?> _punchLocation() async {
    final cur = _location;
    final fresh = _locationAt != null && DateTime.now().difference(_locationAt!) < const Duration(minutes: 2);
    if (cur != null && fresh && !cur.area.startsWith('Locating')) return cur;
    try {
      final quick = await _locationService.getQuickFix();
      final area = await _locationService
          .resolveArea(quick.latitude, quick.longitude)
          .timeout(const Duration(seconds: 3), onTimeout: () => cur?.area ?? 'Unknown Area');
      final fix = LocationFix(latitude: quick.latitude, longitude: quick.longitude, area: area);
      if (mounted) {
        setState(() {
          _location = fix;
          _locationAt = DateTime.now();
        });
      }
      return fix;
    } catch (_) {
      return cur;
    }
  }

  /// Show the saved record straight from the POST response — no extra GET.
  void _applySaved(Map<String, dynamic> saved) {
    if (!mounted) return;
    AppCaches.of(context).attendanceToday.set(saved);
    setState(() {
      _today = saved;
      _workMode = saved['workMode']?.toString() ?? _workMode;
    });
  }

  Future<void> _checkIn() async {
    if (_workMode == null) {
      _toast('Please select a work mode before checking in.', isError: true);
      return;
    }
    setState(() => _submitting = true);
    try {
      final loc = await _punchLocation();
      if (loc == null) {
        _toast('Could not get your location. Turn on location/GPS, allow permission and try again.', isError: true);
        return;
      }
      final time = _nowTime;
      final Map<String, dynamic> saved;
      try {
        saved = await _service.checkIn(date: _todayDate, inTime: time, workMode: _workMode!, location: loc);
      } catch (e) {
        if (!OfflinePunchService.isOfflineError(e)) rethrow;
        await _saveOffline({
          'inTime': time,
          'workMode': _workMode,
          'breaks': [],
          'inLocation': loc.toJson(),
        }, time, {'inTime': time, 'workMode': _workMode, 'outTime': ''});
        return;
      }
      _applySaved(saved);
      AppEvents.bumpAttendance();
      if (mounted) _toast('Checked in at ${saved['inTime'] ?? time}');
    } catch (e) {
      if (mounted) _toast(extractErrorMessage(e), isError: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _checkOut() async {
    setState(() => _submitting = true);
    try {
      // Checking out ends the day — close any break still running at the
      // same moment instead of leaving it "Ongoing" forever.
      final closedBreaks = _breaks.map((b) {
        final open = b['end'] == null || b['end'] == '';
        return open ? {...b, 'end': _nowTime} : b;
      }).toList();
      final loc = await _punchLocation();
      final time = _nowTime;
      final Map<String, dynamic> saved;
      try {
        saved = await _service.checkOut(date: _todayDate, outTime: time, breaks: closedBreaks, location: loc);
      } catch (e) {
        if (!OfflinePunchService.isOfflineError(e)) rethrow;
        await _saveOffline({
          'outTime': time,
          'breaks': closedBreaks,
          if (loc != null) 'outLocation': loc.toJson(),
        }, time, {'outTime': time, 'breaks': closedBreaks});
        return;
      }
      _applySaved(saved);
      AppEvents.bumpAttendance();
      if (mounted) _toast('Checked out at ${saved['outTime'] ?? time}');
    } catch (e) {
      if (mounted) _toast(extractErrorMessage(e), isError: true);
      // e.g. "A new day has started" — reload so the screen shows Check In.
      await _load(silent: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _toast(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? AppColors.danger : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasCheckedIn = _hasTime('inTime');
    final hasCheckedOut = _hasTime('outTime');

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: HrmsAppBar(title: const Text('Attendance')),
      body: _loading
          ? ListView(
              padding: EdgeInsets.all(context.w(16)),
              children: [
                SkeletonCard(height: context.h(220)),
                SizedBox(height: context.h(16)),
                SkeletonCard(height: context.h(180)),
              ],
            )
          : _error != null
              ? buildErrorState(_lastError ?? _error!, _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: EdgeInsets.all(context.w(16)),
                    children: [
                      _buildCheckCard(hasCheckedIn, hasCheckedOut),
                      SizedBox(height: context.h(16)),
                      _buildSummaryCard(),
                      SizedBox(height: context.h(16)),
                      _buildBreakCard(hasCheckedIn, hasCheckedOut),
                      SizedBox(height: context.h(16)),
                      _buildLocationCard(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildCheckCard(bool hasCheckedIn, bool hasCheckedOut) {
    return Container(
      padding: EdgeInsets.all(context.w(18)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.panel),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(DateFormat('EEEE, d MMMM yyyy').format(DateTime.now()),
              style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
          SizedBox(height: context.h(12)),
          Row(
            children: [
              Expanded(
                child: _timeBlock(
                  Icons.login_rounded,
                  AppColors.accent600,
                  AppColors.accent50,
                  'Check In',
                  _timeOrDash('inTime'),
                ),
              ),
              Container(width: 1, height: context.h(56), color: AppColors.surfaceSubtle),
              Expanded(
                child: _timeBlock(
                  Icons.logout_rounded,
                  Color(0xFFDC2626),
                  AppColors.tint(AppColors.tint(const Color(0xFFFEF2F2))),
                  'Check Out',
                  _timeOrDash('outTime'),
                ),
              ),
            ],
          ),
          SizedBox(height: context.h(18)),
          _buildWorkModeSelector(hasCheckedIn),
          SizedBox(height: context.h(18)),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _submitting || hasCheckedOut || (hasCheckedIn && hasCheckedOut) || (!hasCheckedIn && _workMode == null)
                  ? null
                  : (hasCheckedIn ? _checkOut : _checkIn),
              icon: Icon(hasCheckedIn ? Icons.logout : Icons.login, size: 18),
              label: Text(
                hasCheckedOut
                    ? 'Attendance Completed'
                    : (hasCheckedIn ? 'Check Out' : 'Check In'),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: hasCheckedOut
                    ? AppColors.surfaceSubtle
                    : (hasCheckedIn ? AppColors.brand600 : AppColors.accent600),
                foregroundColor: hasCheckedOut ? AppColors.inkMuted : Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWorkModeSelector(bool hasCheckedIn) {
    const modes = [
      {'value': 'office', 'label': 'Office', 'icon': Icons.apartment_rounded},
      {'value': 'home', 'label': 'Home', 'icon': Icons.home_rounded},
    ];

    if (hasCheckedIn) {
      // Locked after check-in — mirrors the web Attendance screen.
      final label = modes.firstWhere(
        (m) => m['value'] == _workMode,
        orElse: () => modes[0],
      )['label'] as String;
      return Row(
        children: [
          Text('Work Mode', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
          SizedBox(width: context.w(8)),
          Text(label, style: TextStyle(color: AppColors.ink, fontWeight: FontWeight.w700, fontSize: context.sp(13))),
          SizedBox(width: context.w(4)),
          Icon(Icons.lock_outline, size: context.sp(13), color: AppColors.inkMuted),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Work Mode', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
            Text(' *', style: TextStyle(color: AppColors.danger, fontSize: context.sp(12))),
          ],
        ),
        SizedBox(height: context.h(8)),
        Row(
          children: modes.map((mode) {
            final selected = _workMode == mode['value'];
            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(right: mode == modes.first ? context.w(8) : 0),
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => setState(() => _workMode = mode['value'] as String),
                  child: Container(
                    padding: EdgeInsets.symmetric(vertical: context.h(10)),
                    decoration: BoxDecoration(
                      // Solid fill when selected so it reads in both themes;
                      // unselected keeps a visible outline on the card.
                      color: selected ? AppColors.accent500 : AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: selected ? AppColors.accent500 : AppColors.inkFaint, width: 1.5),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(selected ? Icons.check_circle_rounded : mode['icon'] as IconData, size: context.sp(16), color: selected ? Colors.white : AppColors.ink),
                        SizedBox(width: context.w(6)),
                        Text(
                          mode['label'] as String,
                          style: TextStyle(
                            fontSize: context.sp(13),
                            fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                            color: selected ? Colors.white : AppColors.ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildBreakCard(bool hasCheckedIn, bool hasCheckedOut) {
    final breaks = _breaks;
    final canStartBreak = hasCheckedIn && !hasCheckedOut && !_hasOngoingBreak && !_breakBusy;

    return Container(
      padding: EdgeInsets.all(context.w(18)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.panel),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.free_breakfast_outlined, size: 16, color: AppColors.brand600),
              SizedBox(width: context.w(6)),
              Text('Break Times', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink, fontSize: context.sp(14))),
            ],
          ),
          SizedBox(height: context.h(10)),
          if (breaks.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: context.h(6)),
              child: Text('No breaks logged yet today.', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
            )
          else
            ...breaks.asMap().entries.map((entry) {
              final idx = entry.key;
              final b = entry.value;
              final isOpen = b['end'] == null || b['end'] == '';
              return Container(
                margin: EdgeInsets.only(bottom: context.h(6)),
                padding: EdgeInsets.symmetric(horizontal: context.w(12), vertical: context.h(8)),
                decoration: BoxDecoration(
                  color: isOpen ? AppColors.accent50 : AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: isOpen ? AppColors.accent500.withValues(alpha: 0.4) : AppColors.surfaceSubtle),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Break ${idx + 1}: ${b['start'] ?? '--:--'} - ${isOpen ? 'Ongoing' : b['end']}',
                        style: TextStyle(fontSize: context.sp(12.5), color: AppColors.ink),
                      ),
                    ),
                    if (isOpen && !hasCheckedOut)
                      TextButton(
                        onPressed: _breakBusy ? null : () => _endBreak(idx),
                        child: Text('End', style: TextStyle(fontSize: context.sp(12), fontWeight: FontWeight.w700)),
                      ),
                  ],
                ),
              );
            }),
          SizedBox(height: context.h(6)),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: canStartBreak ? _startBreak : null,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Start Break'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationCard() {
    return Container(
      padding: EdgeInsets.all(context.w(18)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.panel),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.location_on_outlined, size: 16, color: AppColors.brand600),
              SizedBox(width: context.w(6)),
              Text('Current Location', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink, fontSize: context.sp(14))),
            ],
          ),
          SizedBox(height: context.h(10)),
          if (_locationLoading)
            Row(
              children: [
                const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                SizedBox(width: context.w(8)),
                Text('Getting your location…', style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
              ],
            )
          else if (_location != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  // OpenStreetMap tiles via flutter_map — same map source as
                  // the web Attendance page's OSM embed, and (unlike a
                  // static-map image URL) works on Android, iOS and web.
                  child: SizedBox(
                    height: context.h(150),
                    width: double.infinity,
                    child: FlutterMap(
                      options: MapOptions(
                        initialCenter: LatLng(_location!.latitude, _location!.longitude),
                        initialZoom: 16.5,
                        interactionOptions: const InteractionOptions(flags: InteractiveFlag.none),
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.speshway.hrms',
                        ),
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: LatLng(_location!.latitude, _location!.longitude),
                              width: 36,
                              height: 36,
                              alignment: Alignment.topCenter,
                              child: const Icon(Icons.location_on, color: Color(0xFFDC2626), size: 36),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: context.h(10)),
                Text(_location!.area, style: TextStyle(color: AppColors.ink, fontSize: context.sp(13))),
              ],
            )
          else
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _locationError ?? 'Location not available.',
                  style: TextStyle(color: AppColors.danger, fontSize: context.sp(12.5)),
                ),
                SizedBox(height: context.h(8)),
                // Only a permanently denied permission needs app settings;
                // otherwise retry, which shows the in-app prompts.
                if ((_locationError ?? '').contains('permanently denied'))
                  OutlinedButton.icon(
                    onPressed: LocationService.openSettings,
                    icon: const Icon(Icons.settings_outlined, size: 16),
                    label: const Text('Allow in app settings'),
                  )
                else
                  FilledButton.icon(
                    onPressed: _locationLoading ? null : _fetchLocation,
                    icon: const Icon(Icons.my_location_rounded, size: 16),
                    label: const Text('Turn on location'),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  int _toMinutes(String hhmm) {
    final parts = hhmm.split(':');
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }

  // Working Hours = plain check-in -> check-out span (or check-in -> now
  // while still checked in), same rule as the web Attendance page —
  // breaks are shown separately, not deducted from this figure.
  int get _workingMinutes {
    final inTime = _today?['inTime']?.toString();
    if (inTime == null || inTime.isEmpty) return 0;
    final outTime = _today?['outTime']?.toString();
    final endStr = (outTime != null && outTime.isNotEmpty) ? outTime : _nowTime;
    try {
      var mins = _toMinutes(endStr) - _toMinutes(inTime);
      if (mins < 0) mins += 24 * 60;
      return mins;
    } catch (_) {
      return 0;
    }
  }

  int get _totalBreakMinutes {
    final outTime = _today?['outTime']?.toString();
    final sessionEnd = (outTime != null && outTime.isNotEmpty) ? outTime : _nowTime;
    var total = 0;
    for (final b in _breaks) {
      final start = b['start']?.toString();
      if (start == null || start.isEmpty) continue;
      final end = (b['end']?.toString().isNotEmpty ?? false) ? b['end'].toString() : sessionEnd;
      try {
        var mins = _toMinutes(end) - _toMinutes(start);
        if (mins < 0) mins += 24 * 60;
        total += mins;
      } catch (_) {}
    }
    return total;
  }

  String _formatDuration(int minutes) => '${minutes ~/ 60}h ${minutes % 60}m';

  // Mirrors Attendance.jsx's status: not final until checked out, then
  // resolves to Present/Half-Day/Absent from the worked minutes above.
  String get _todayStatus {
    final inTime = _today?['inTime']?.toString();
    final outTime = _today?['outTime']?.toString();
    if (inTime == null || inTime.isEmpty) return 'Not Checked In';
    if (outTime == null || outTime.isEmpty) return 'Checked In';
    if (_workingMinutes >= 480) return _workingMinutes > 480 ? 'Present + OT' : 'Present';
    if (_workingMinutes >= 240) return 'Half-Day';
    return 'Absent';
  }

  Widget _buildSummaryCard() {
    final checkInLocation = (_today?['inLocation'] as Map?)?['area']?.toString() ?? _location?.area;
    final checkOutLocation = (_today?['outLocation'] as Map?)?['area']?.toString();

    return Container(
      padding: EdgeInsets.all(context.w(18)),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.panel),
        border: Border.all(color: AppColors.surfaceSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.fact_check_outlined, size: 16, color: AppColors.brand600),
              SizedBox(width: context.w(6)),
              Text("Today's Summary", style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink, fontSize: context.sp(14))),
            ],
          ),
          SizedBox(height: context.h(12)),
          _summaryRow(Icons.login_rounded, AppColors.accent600, AppColors.accent50, 'Check In', _timeOrDash('inTime')),
          _summaryRow(Icons.logout_rounded, Color(0xFFDC2626), AppColors.tint(AppColors.tint(const Color(0xFFFEF2F2))), 'Check Out', _timeOrDash('outTime')),
          _summaryRow(Icons.access_time_rounded, Color(0xFF2563EB), AppColors.tint(AppColors.tint(const Color(0xFFDBEAFE))), 'Working Hours', _formatDuration(_workingMinutes)),
          _summaryRow(Icons.free_breakfast_outlined, Color(0xFFEA580C), AppColors.tint(AppColors.tint(const Color(0xFFFFEDD5))), 'Break Time', '${_totalBreakMinutes}m'),
          _summaryRow(Icons.badge_outlined, AppColors.brand600, AppColors.brand50, 'Status', _todayStatus),
          if (_workMode != null)
            _summaryRow(Icons.apartment_rounded, Color(0xFF9333EA), AppColors.tint(AppColors.tint(const Color(0xFFF3E8FF))), 'Work Mode', _workMode == 'home' ? 'Home' : 'Office'),
          if (checkInLocation != null)
            _summaryRow(Icons.location_on_outlined, const Color(0xFF0D9488), AppColors.tint(const Color(0xFFCCFBF1)), 'Check-in Location', checkInLocation, wrap: true),
          if (checkOutLocation != null)
            _summaryRow(Icons.location_on_outlined, const Color(0xFF0D9488), AppColors.tint(const Color(0xFFCCFBF1)), 'Check-out Location', checkOutLocation, wrap: true),
        ],
      ),
    );
  }

  Widget _summaryRow(IconData icon, Color iconColor, Color iconBg, String label, String value, {bool wrap = false}) {
    final iconChip = Container(
      width: context.r(22),
      height: context.r(22),
      decoration: BoxDecoration(color: AppColors.tint(iconBg), shape: BoxShape.circle),
      child: Icon(icon, size: context.r(12), color: iconColor),
    );
    return Padding(
      padding: EdgeInsets.symmetric(vertical: context.h(6)),
      child: wrap
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    iconChip,
                    SizedBox(width: context.w(8)),
                    Text(label, style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12.5))),
                  ],
                ),
                SizedBox(height: context.h(3)),
                Padding(
                  padding: EdgeInsets.only(left: context.w(30)),
                  child: Text(value, style: TextStyle(color: AppColors.ink, fontSize: context.sp(12.5), fontWeight: FontWeight.w600)),
                ),
              ],
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    iconChip,
                    SizedBox(width: context.w(8)),
                    Text(label, style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13))),
                  ],
                ),
                Text(value, style: TextStyle(color: AppColors.ink, fontSize: context.sp(13), fontWeight: FontWeight.w700)),
              ],
            ),
    );
  }

  Widget _timeBlock(IconData icon, Color iconColor, Color iconBg, String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: context.w(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: context.r(28),
                height: context.r(28),
                decoration: BoxDecoration(color: AppColors.tint(iconBg), shape: BoxShape.circle),
                child: Icon(icon, size: context.r(15), color: iconColor),
              ),
              SizedBox(width: context.w(8)),
              Flexible(
                child: Text(label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
              ),
            ],
          ),
          SizedBox(height: context.h(8)),
          Text(value, style: TextStyle(fontSize: context.sp(22), fontWeight: FontWeight.w700, color: AppColors.ink)),
        ],
      ),
    );
  }

}

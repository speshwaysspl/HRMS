import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../main.dart';
import '../../services/api_client.dart';
import '../../services/app_events.dart';
import '../../services/attendance_service.dart';
import '../../services/location_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/responsive.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/state_views.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
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
  bool _locationLoading = false;
  String? _locationError;
  bool _breakBusy = false;

  @override
  void initState() {
    super.initState();
    final cache = AppCaches.of(context).attendanceToday;
    if (cache.hasData) {
      // Show last-known data immediately, then quietly refresh.
      _today = cache.data;
      _workMode = _today?['workMode']?.toString();
      _loading = false;
      _load(silent: true);
    } else {
      _load();
    }
    _fetchLocation();
  }

  Future<void> _fetchLocation() async {
    setState(() {
      _locationLoading = true;
      _locationError = null;
    });
    try {
      final fix = await _locationService.getCurrentFix();
      if (!mounted) return;
      setState(() => _location = fix);
    } catch (e) {
      if (!mounted) return;
      setState(() => _locationError = e.toString());
    } finally {
      if (mounted) setState(() => _locationLoading = false);
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

  String get _todayDate => DateFormat('yyyy-MM-dd').format(DateTime.now());
  String get _nowTime => DateFormat('HH:mm').format(DateTime.now());

  /// Fresh fix right before check-in/out so we never submit a stale, missing
  /// or "Unknown Area" location captured minutes earlier. Falls back to the
  /// last known fix if a new one can't be obtained; returns null only when
  /// there is no usable location at all.
  Future<LocationFix?> _freshLocation() async {
    try {
      final fix = await _locationService.getCurrentFix();
      if (mounted) setState(() => _location = fix);
      return fix;
    } catch (_) {
      return _location;
    }
  }

  Future<void> _checkIn() async {
    if (_workMode == null) {
      _toast('Please select a work mode before checking in.', isError: true);
      return;
    }
    setState(() => _submitting = true);
    try {
      final loc = await _freshLocation();
      if (loc == null) {
        _toast('Could not get your location. Turn on location/GPS, allow permission and try again.', isError: true);
        return;
      }
      await _service.checkIn(date: _todayDate, inTime: _nowTime, workMode: _workMode!, location: loc);
      await _load();
      AppEvents.bumpAttendance();
      if (mounted) _toast('Checked in at $_nowTime');
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
      final loc = await _freshLocation();
      await _service.checkOut(date: _todayDate, outTime: _nowTime, breaks: closedBreaks, location: loc);
      await _load();
      AppEvents.bumpAttendance();
      if (mounted) _toast('Checked out at $_nowTime');
    } catch (e) {
      if (mounted) _toast(extractErrorMessage(e), isError: true);
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
    final hasCheckedIn = _today != null && _today!['inTime'] != null;
    final hasCheckedOut = _today != null && _today!['outTime'] != null;

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Attendance')),
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
                  _today?['inTime']?.toString() ?? '--:--',
                ),
              ),
              Container(width: 1, height: context.h(48), color: AppColors.surfaceSubtle),
              Expanded(
                child: _timeBlock(
                  Icons.logout_rounded,
                  const Color(0xFFDC2626),
                  const Color(0xFFFEF2F2),
                  'Check Out',
                  _today?['outTime']?.toString() ?? '--:--',
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
                      color: selected ? AppColors.accent50 : AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: selected ? AppColors.accent500 : AppColors.surfaceSubtle, width: selected ? 1.5 : 1),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(mode['icon'] as IconData, size: context.sp(16), color: selected ? AppColors.accent500 : AppColors.inkMuted),
                        SizedBox(width: context.w(6)),
                        Text(
                          mode['label'] as String,
                          style: TextStyle(
                            fontSize: context.sp(13),
                            fontWeight: FontWeight.w600,
                            color: selected ? AppColors.accent500 : AppColors.inkMuted,
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
              const Icon(Icons.free_breakfast_outlined, size: 16, color: AppColors.brand600),
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
              const Icon(Icons.location_on_outlined, size: 16, color: AppColors.brand600),
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
                SizedBox(height: context.h(8)),
                TextButton.icon(
                  onPressed: () => launchUrl(
                    Uri.parse('https://www.google.com/maps?q=${_location!.latitude},${_location!.longitude}'),
                    mode: LaunchMode.externalApplication,
                  ),
                  icon: const Icon(Icons.open_in_new, size: 14),
                  label: const Text('View on Map'),
                ),
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
                OutlinedButton.icon(
                  onPressed: _fetchLocation,
                  icon: const Icon(Icons.refresh, size: 16),
                  label: const Text('Retry Location'),
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
    final inTime = _today?['inTime']?.toString();
    final outTime = _today?['outTime']?.toString();
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
              const Icon(Icons.fact_check_outlined, size: 16, color: AppColors.brand600),
              SizedBox(width: context.w(6)),
              Text("Today's Summary", style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink, fontSize: context.sp(14))),
            ],
          ),
          SizedBox(height: context.h(12)),
          _summaryRow(Icons.login_rounded, AppColors.accent600, AppColors.accent50, 'Check In', inTime ?? '--:--'),
          _summaryRow(Icons.logout_rounded, const Color(0xFFDC2626), const Color(0xFFFEF2F2), 'Check Out', outTime ?? '--:--'),
          _summaryRow(Icons.access_time_rounded, const Color(0xFF2563EB), const Color(0xFFDBEAFE), 'Working Hours', _formatDuration(_workingMinutes)),
          _summaryRow(Icons.free_breakfast_outlined, const Color(0xFFEA580C), const Color(0xFFFFEDD5), 'Break Time', '${_totalBreakMinutes}m'),
          _summaryRow(Icons.badge_outlined, AppColors.brand600, AppColors.brand50, 'Status', _todayStatus),
          if (_workMode != null)
            _summaryRow(Icons.apartment_rounded, const Color(0xFF9333EA), const Color(0xFFF3E8FF), 'Work Mode', _workMode == 'home' ? 'Home' : 'Office'),
          if (checkInLocation != null)
            _summaryRow(Icons.location_on_outlined, const Color(0xFF0D9488), const Color(0xFFCCFBF1), 'Check-in Location', checkInLocation, wrap: true),
          if (checkOutLocation != null)
            _summaryRow(Icons.location_on_outlined, const Color(0xFF0D9488), const Color(0xFFCCFBF1), 'Check-out Location', checkOutLocation, wrap: true),
        ],
      ),
    );
  }

  Widget _summaryRow(IconData icon, Color iconColor, Color iconBg, String label, String value, {bool wrap = false}) {
    final iconChip = Container(
      width: context.r(22),
      height: context.r(22),
      decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: context.r(30),
          height: context.r(30),
          decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
          child: Icon(icon, size: context.r(16), color: iconColor),
        ),
        SizedBox(height: context.h(8)),
        Text(label, style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(12))),
        SizedBox(height: context.h(4)),
        Text(value, style: TextStyle(fontSize: context.sp(18), fontWeight: FontWeight.w700, color: AppColors.ink)),
      ],
    );
  }

}

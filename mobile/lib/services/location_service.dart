import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

/// A resolved location fix: coordinates plus a best-effort human-readable
/// area. Mirrors the web app's `getLocationWithFallback` in
/// frontend/src/components/EmployeeDashboard/Attendance.jsx — try a real
/// GPS fix first, fall back to a lower-accuracy fix, and never throw just
/// because reverse geocoding failed (the area simply stays "Unknown Area").
class LocationFix {
  final double latitude;
  final double longitude;
  final String area;

  const LocationFix({required this.latitude, required this.longitude, required this.area});

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
        'area': area,
      };
}

class LocationPermissionDenied implements Exception {
  final String message;
  LocationPermissionDenied(this.message);
  @override
  String toString() => message;
}

class LocationService {
  /// Asks for location permission up front (no GPS fix). Returns true when
  /// granted. Safe to call repeatedly — it only prompts while still undecided.
  static Future<bool> requestPermissionOnLaunch() async {
    if (kIsWeb) return true;
    try {
      var p = await Geolocator.checkPermission();
      if (p == LocationPermission.denied) p = await Geolocator.requestPermission();
      return p == LocationPermission.whileInUse || p == LocationPermission.always;
    } catch (_) {
      return false;
    }
  }

  static Future<void> openSettings() async {
    await Geolocator.openAppSettings();
    await Geolocator.openLocationSettings();
  }

  Future<void> _ensurePermission() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw LocationPermissionDenied('Location services are turned off. Please enable them and try again.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw LocationPermissionDenied('Location access denied. Please allow location permission.');
    }
    if (permission == LocationPermission.deniedForever) {
      throw LocationPermissionDenied('Location access is permanently denied. Enable it from app settings.');
    }
  }

  // Plain Dio (NOT ApiClient.instance.dio): that one attaches the user's
  // auth token to every request, which must never be sent to a third party.
  final Dio _osmDio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 8),
    receiveTimeout: const Duration(seconds: 8),
    headers: {'Accept': 'application/json'},
  ));

  /// OpenStreetMap Nominatim — same fallback the web app uses
  /// (frontend/src/utils/geocodeUtils.js). Works on every platform incl.
  /// Flutter web, where the `geocoding` plugin isn't supported.
  Future<String?> _reverseGeocodeOsm(double lat, double lng) async {
    try {
      final res = await _osmDio.get(
        'https://nominatim.openstreetmap.org/reverse',
        queryParameters: {'format': 'jsonv2', 'lat': lat, 'lon': lng},
      );
      final data = res.data;
      if (data is Map) {
        final display = data['display_name']?.toString().trim();
        if (display != null && display.isNotEmpty) return display;
        final addr = data['address'];
        if (addr is Map) {
          for (final k in ['suburb', 'village', 'town', 'city']) {
            final v = addr[k]?.toString().trim();
            if (v != null && v.isNotEmpty) return v;
          }
        }
      }
    } catch (_) {}
    return null;
  }

  Future<String> _reverseGeocode(double lat, double lng) async {
    // Native geocoder first (not available on web), then OSM Nominatim.
    if (!kIsWeb) {
      try {
        final placemarks = await Geocoding().placemarkFromCoordinates(lat, lng);
        if (placemarks.isNotEmpty) {
          final p = placemarks.first;
          final parts = <String>[
            for (final s in [p.subLocality, p.locality, p.administrativeArea, p.postalCode, p.country])
              if (s != null && s.trim().isNotEmpty) s,
          ];
          if (parts.isNotEmpty) return parts.join(', ');
        }
      } catch (_) {}
    }
    return await _reverseGeocodeOsm(lat, lng) ?? 'Unknown Area';
  }

  Future<Position> _position({required bool allowCached}) async {
    // A recent cached fix is instant — good enough to draw the map.
    Position? last;
    try {
      last = await Geolocator.getLastKnownPosition();
    } catch (_) {}
    if (allowCached && last != null && DateTime.now().difference(last.timestamp) < const Duration(minutes: 2)) {
      return last;
    }
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 12)),
      );
    } catch (_) {
      try {
        return await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(accuracy: LocationAccuracy.low, timeLimit: Duration(seconds: 8)),
        );
      } catch (_) {
        if (last != null) return last;
        throw LocationPermissionDenied('Could not get a GPS fix. Move to an open area and make sure GPS is on.');
      }
    }
  }

  /// Fast fix for showing the map: coordinates only, area still "Locating…".
  /// Follow with [resolveArea] to fill in the address.
  Future<LocationFix> getQuickFix() async {
    await _ensurePermission();
    final p = await _position(allowCached: true);
    return LocationFix(latitude: p.latitude, longitude: p.longitude, area: 'Locating area…');
  }

  /// Address for a coordinate; never hangs (bounded) and never throws.
  Future<String> resolveArea(double lat, double lng) async {
    try {
      return await _reverseGeocode(lat, lng).timeout(const Duration(seconds: 8));
    } catch (_) {
      return 'Unknown Area';
    }
  }

  /// Fresh, fully-resolved fix — used right before check-in / check-out.
  Future<LocationFix> getCurrentFix() async {
    await _ensurePermission();
    final position = await _position(allowCached: false);
    final area = await resolveArea(position.latitude, position.longitude);
    return LocationFix(latitude: position.latitude, longitude: position.longitude, area: area);
  }
}

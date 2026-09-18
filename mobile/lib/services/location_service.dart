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

  Future<String> _reverseGeocode(double lat, double lng) async {
    try {
      final placemarks = await Geocoding().placemarkFromCoordinates(lat, lng);
      if (placemarks.isEmpty) return 'Unknown Area';
      final p = placemarks.first;
      final parts = <String>[
        for (final s in [p.subLocality, p.locality, p.administrativeArea, p.postalCode, p.country])
          if (s != null && s.trim().isNotEmpty) s,
      ];
      return parts.isEmpty ? 'Unknown Area' : parts.join(', ');
    } catch (_) {
      return 'Unknown Area';
    }
  }

  /// Best-effort current fix: high accuracy first, then a quicker/lower
  /// accuracy attempt if the first one times out.
  Future<LocationFix> getCurrentFix() async {
    await _ensurePermission();

    Position position;
    try {
      position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 20)),
      );
    } catch (_) {
      position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium, timeLimit: Duration(seconds: 10)),
      );
    }

    final area = await _reverseGeocode(position.latitude, position.longitude);
    return LocationFix(latitude: position.latitude, longitude: position.longitude, area: area);
  }
}

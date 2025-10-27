// src/utils/geocodeUtils.js

/**
 * Fast reverse geocoding with Google REST and OSM fallback.
 * Returns a human-readable area string.
 */
export const reverseGeocodeFast = async (lat, lng) => {
  // Try Google Geocoding REST first if key is available
  const googleKey = import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.results) && data.results[0]) {
          return data.results[0].formatted_address;
        }
      }
    } catch (_) {
      // fall through to OSM
    }
  }

  // Fallback: OpenStreetMap Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetch(osmUrl, {
      headers: {
        // Nominatim recommends identifying the application
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.display_name || (data.address && (data.address.suburb || data.address.village || data.address.town || data.address.city)))) {
        return data.display_name || data.address.suburb || data.address.village || data.address.town || data.address.city;
      }
    }
  } catch (_) {
    // ignore
  }

  return 'Unknown Area';
};

/**
 * Build a labeled accuracy string from meters.
 * Example: 18 -> "Excellent (±18m)"
 */
export const buildAccuracyLabel = (meters) => {
  if (meters == null || Number.isNaN(meters)) return 'Unknown';
  const m = Math.round(meters);
  if (m <= 10) return `Excellent (±${m}m)`;
  if (m <= 50) return `Good (±${m}m)`;
  if (m <= 100) return `Fair (±${m}m)`;
  return `Poor (±${m}m)`;
};

/**
 * Extract numeric meters from a labeled accuracy string.
 * Example: "Poor (±198m)" -> 198
 */
export const parseAccuracyMeters = (label) => {
  if (!label) return Infinity;
  const match = /±(\d+)m/.exec(label);
  return match ? Number(match[1]) : Infinity;
};
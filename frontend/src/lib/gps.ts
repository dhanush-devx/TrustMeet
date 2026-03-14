// GPS Utilities for TrustMeet
// Coordinates are stored on-chain as u64 with offset to avoid negatives:
//   lat_stored = (lat + 90.0) * 1_000_000
//   lng_stored = (lng + 180.0) * 1_000_000

export const GPS_PRECISION = 1_000_000;
export const LOCATION_TOLERANCE_METERS = 1000; // 1km radius for hackathon demo

export function encodeLatitude(lat: number): bigint {
  return BigInt(Math.round((lat + 90.0) * GPS_PRECISION));
}

export function encodeLongitude(lng: number): bigint {
  return BigInt(Math.round((lng + 180.0) * GPS_PRECISION));
}

export function decodeLatitude(encoded: bigint): number {
  return Number(encoded) / GPS_PRECISION - 90.0;
}

export function decodeLongitude(encoded: bigint): number {
  return Number(encoded) / GPS_PRECISION - 180.0;
}

export function encodeCoords(lat: number, lng: number): { lat: bigint; lng: bigint } {
  return { lat: encodeLatitude(lat), lng: encodeLongitude(lng) };
}

export function decodeCoords(latEncoded: bigint, lngEncoded: bigint): { lat: number; lng: number } {
  return {
    lat: decodeLatitude(latEncoded),
    lng: decodeLongitude(lngEncoded),
  };
}

// Haversine distance in meters
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface GPSPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  mock?: boolean;
}

// Get real GPS from browser, fall back to mock
export async function getCurrentPosition(mock = false): Promise<GPSPosition> {
  if (mock) {
    // Return a mock position (slightly randomized for demo)
    const baseLat = 19.0760; // Mumbai
    const baseLng = 72.8777;
    return {
      lat: baseLat + (Math.random() - 0.5) * 0.001,
      lng: baseLng + (Math.random() - 0.5) * 0.001,
      accuracy: 10,
      mock: true,
    };
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          mock: false,
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function isWithinRadius(
  userLat: number,
  userLng: number,
  meetupLat: number,
  meetupLng: number,
  radiusMeters = LOCATION_TOLERANCE_METERS
): boolean {
  const dist = haversineDistance(userLat, userLng, meetupLat, meetupLng);
  return dist <= radiusMeters;
}

export function formatCoords(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

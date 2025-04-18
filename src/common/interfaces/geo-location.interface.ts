// src/common/interfaces/geo-location.interface.ts
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number; // in meters
  timestamp?: number; // unix timestamp
  provider?: 'gps' | 'network' | 'manual'; // location provider
}

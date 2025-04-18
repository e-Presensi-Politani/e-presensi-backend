// src/common/services/geo.service.ts
import { Injectable } from '@nestjs/common';
import { GeoLocation } from '../interfaces/geo-location.interface';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class GeoService {
  private readonly referencePoint: GeoLocation;
  private readonly geofenceRadius: number;

  constructor(private configService: ConfigService) {
    // Initialize the reference point and radius from config
    this.referencePoint = this.configService.referencePoint;
    this.geofenceRadius = this.configService.geofenceRadius;
  }

  /**
   * Calculate distance between two points using the Haversine formula
   * @param coord1 First coordinate
   * @param coord2 Second coordinate
   * @returns Distance in meters
   */
  calculateDistance(coord1: GeoLocation, coord2: GeoLocation): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Check if a location is within the geofence radius of the fixed reference point
   * @param userLocation User's current location
   * @returns Boolean indicating if the location is within radius
   */
  isWithinGeofence(userLocation: GeoLocation): boolean {
    const distance = this.calculateDistance(userLocation, this.referencePoint);
    return distance <= this.geofenceRadius;
  }

  /**
   * Format a GeoLocation object for display or storage
   * @param location The GeoLocation to format
   * @returns Formatted location string
   */
  formatLocation(location: GeoLocation): string {
    return `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
  }

  /**
   * Parse a location string in format "latitude,longitude" into a GeoLocation object
   * @param locationString Location string in format "latitude,longitude"
   * @returns GeoLocation object
   */
  parseLocation(locationString: string): GeoLocation | null {
    try {
      const [latitude, longitude] = locationString.split(',').map(Number);

      if (isNaN(latitude) || isNaN(longitude)) {
        return null;
      }

      return { latitude, longitude };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the fixed reference point from configuration
   * @returns Reference point GeoLocation
   */
  getReferencePoint(): GeoLocation {
    return this.referencePoint;
  }

  /**
   * Get the fixed geofence radius from configuration
   * @returns Radius in meters
   */
  getGeofenceRadius(): number {
    return this.geofenceRadius;
  }
}

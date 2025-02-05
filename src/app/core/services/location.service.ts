import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface LocationError {
  code: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private currentLocationSubject = new BehaviorSubject<Location | null>(null);
  public currentLocation$ = this.currentLocationSubject.asObservable();

  private readonly LOCATION_PERMISSION_DENIED = 1;
  private readonly POSITION_UNAVAILABLE = 2;
  private readonly TIMEOUT = 3;

  constructor() {
    // Başlangıçta konum almayı dene
    this.watchLocation();
  }

  private watchLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          this.currentLocationSubject.next(location);
        },
        (error) => {
          console.error('Error watching location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }

  async requestLocationPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<Location> {
    const currentLocation = this.currentLocationSubject.value;
    if (currentLocation) {
      return currentLocation;
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({
          code: -1,
          message: 'Geolocation is not supported by your browser'
        } as LocationError);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          this.currentLocationSubject.next(location);
          resolve(location);
        },
        (error) => {
          let errorMessage = 'An unknown error occurred while getting your location.';
          
          switch (error.code) {
            case this.LOCATION_PERMISSION_DENIED:
              errorMessage = 'Location permission was denied. Please enable location services in your browser settings.';
              break;
            case this.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please try again.';
              break;
            case this.TIMEOUT:
              errorMessage = 'Location request timed out. Please check your connection and try again.';
              break;
          }

          reject({
            code: error.code,
            message: errorMessage
          } as LocationError);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  clearLocation(): void {
    this.currentLocationSubject.next(null);
  }

  // Mevcut konumu Observable olarak al
  getLocation$(): Observable<Location | null> {
    return this.currentLocation$;
  }
} 
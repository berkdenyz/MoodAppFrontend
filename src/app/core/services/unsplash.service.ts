import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UnsplashService {
  private readonly cityImages = [
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800', // İstanbul
    'https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?w=800', // Şehir
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800', // Paris
    'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?w=800', // Barcelona
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800', // New York
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800', // Chicago
    'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=800', // Tokyo
    'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=800', // London
    'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?w=800', // Dubai
    'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800'  // Seoul
  ];

  private photoCache: { [key: string]: string[] } = {};

  constructor() {
    // Local storage'dan cache'i yükle
    const cachedPhotos = localStorage.getItem('photoCache');
    if (cachedPhotos) {
      this.photoCache = JSON.parse(cachedPhotos);
    }
  }

  getLocationPhotos(latitude: number, longitude: number): Observable<string[]> {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

    // Cache'den kontrol et
    if (this.photoCache[cacheKey]) {
      return of(this.photoCache[cacheKey]);
    }

    // Rastgele 2 görsel seç
    const randomImages = this.getRandomImages(2);
    
    // Cache'e kaydet
    this.photoCache[cacheKey] = randomImages;
    this.saveCache();

    return of(randomImages);
  }

  private getRandomImages(count: number): string[] {
    const images = [...this.cityImages];
    const result: string[] = [];

    for (let i = 0; i < count && images.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * images.length);
      result.push(images.splice(randomIndex, 1)[0]);
    }

    return result;
  }

  private saveCache(): void {
    localStorage.setItem('photoCache', JSON.stringify(this.photoCache));
  }
} 
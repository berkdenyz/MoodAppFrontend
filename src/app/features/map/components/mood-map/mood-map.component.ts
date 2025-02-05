import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { MoodEntryService } from '../../../../core/services/mood-entry.service';
import { UserService } from '../../../../core/services/user.service';
import { LocationService } from '../../../../core/services/location.service';
import { UnsplashService } from '../../../../core/services/unsplash.service';
import { MoodEntry, MoodType } from '../../../../core/models/mood-entry.model';
import { User } from '../../../../core/models/user.model';
import { firstValueFrom } from 'rxjs';
import { Chart, ChartConfiguration, DoughnutController, ArcElement, Legend, Tooltip, registerables } from 'chart.js';

Chart.register(...registerables);

// Fix Leaflet icon issue
const iconRetinaUrl = 'assets/leaflet/marker-icon-2x.png';
const iconUrl = 'assets/leaflet/marker-icon.png';
const shadowUrl = 'assets/leaflet/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
});

interface MoodEntryWithUser extends MoodEntry {
  user?: User;
  locationName?: string;
  locationPhotos?: string[];
}

interface LocationCache {
  [key: string]: string;
}

@Component({
  selector: 'app-mood-map',
  templateUrl: './mood-map.component.html',
  styleUrls: ['./mood-map.component.scss']
})
export class MoodMapComponent implements OnInit, AfterViewInit {
  @ViewChild('moodChart') moodChart!: ElementRef;
  private chart: Chart | null = null;
  map!: L.Map;
  private markers: L.Marker[] = [];
  private currentUser: User | null = null;
  private locationMarker: L.Marker | null = null;
  private locationCache: LocationCache = {};
  searchQuery: string = '';
  moodEntries: MoodEntryWithUser[] = [];
  searchResults: any[] = [];
  
  totalMoods: number = 0;
  todayMoods: number = 0;
  mostCommonMood: MoodType | null = null;
  locationPhotos: { [key: string]: string[] } = {};
  recentMoodEntries: MoodEntryWithUser[] = [];

  constructor(
    private router: Router,
    private moodEntryService: MoodEntryService,
    private userService: UserService,
    private locationService: LocationService,
    private unsplashService: UnsplashService
  ) {
    // Local Storage'dan cache'i yükle
    const cachedLocations = localStorage.getItem('locationCache');
    if (cachedLocations) {
      this.locationCache = JSON.parse(cachedLocations);
    }
  }

  async ngOnInit(): Promise<void> {
    this.currentUser = await this.userService.getCurrentUser();
  }

  async ngAfterViewInit(): Promise<void> {
    this.initializeMap();
    await this.loadMoodEntries();
    await this.updateMapMarkers();
  }

  private getCacheKey(lat: number, lon: number): string {
    // Koordinatları 4 decimal noktasına yuvarla (yaklaşık 11m hassasiyet)
    return `${lat.toFixed(4)},${lon.toFixed(4)}`;
  }

  private async getLocationName(lat: number, lon: number): Promise<string> {
    const cacheKey = this.getCacheKey(lat, lon);
    
    // Cache'den kontrol et
    if (this.locationCache[cacheKey]) {
      return this.locationCache[cacheKey];
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Location service error');
      }

      const data = await response.json();
      
      // Adres bileşenlerini al
      const suburb = data.address.suburb || data.address.neighbourhood || '';
      const district = data.address.district || data.address.city_district || '';
      const city = data.address.city || data.address.town || '';
      
      // Anlamlı bir adres dizisi oluştur
      const addressParts = [suburb, district, city].filter(part => part);
      
      // En az iki bileşen olsun
      if (addressParts.length < 2 && city) {
        addressParts.unshift(district || suburb || data.address.road || '');
      }

      const locationName = addressParts.join(', ');
      
      // Cache'e kaydet
      this.locationCache[cacheKey] = locationName;
      localStorage.setItem('locationCache', JSON.stringify(this.locationCache));
      
      return locationName;
    } catch (error) {
      console.error('Error getting location name:', error);
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
  }

  private async loadMoodEntries(): Promise<void> {
    try {
      const entries = await this.moodEntryService.getMoodEntries();
      
      // Benzersiz koordinatları bul
      const uniqueLocations = new Set(
        entries.map(entry => this.getCacheKey(entry.latitude, entry.longitude))
      );

      // Cache'de olmayan lokasyonlar için paralel istekler yap
      const locationPromises = Array.from(uniqueLocations)
        .filter(cacheKey => !this.locationCache[cacheKey])
        .map(async cacheKey => {
          const [lat, lon] = cacheKey.split(',').map(Number);
          const locationName = await this.getLocationName(lat, lon);
          return { cacheKey, locationName };
        });

      // Her 5 istek için bir grup oluştur ve sırayla çalıştır
      const chunkSize = 5;
      for (let i = 0; i < locationPromises.length; i += chunkSize) {
        const chunk = locationPromises.slice(i, i + chunkSize);
        await Promise.all(chunk);
      }

      // Entry'leri oluştur ve fotoğrafları yükle
      this.moodEntries = await Promise.all(entries.map(async entry => {
        const cacheKey = this.getCacheKey(entry.latitude, entry.longitude);
        const locationPhotos = await this.loadLocationPhotos(entry.latitude, entry.longitude);
        
        return {
          ...entry,
          user: entry.userId === this.currentUser?.id ? this.currentUser : undefined,
          locationName: this.locationCache[cacheKey] || `${entry.latitude.toFixed(6)}, ${entry.longitude.toFixed(6)}`,
          locationPhotos
        };
      }));

      // Tarihe göre sırala (en yeni en üstte)
      this.moodEntries.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      this.calculateStats(this.moodEntries);
    } catch (error) {
      console.error('Error loading mood entries:', error);
    }
  }

  private async updateMapMarkers(): Promise<void> {
    this.clearMarkers();
    
    // Group entries by location
    const groupedEntries = this.moodEntries.reduce((groups, entry) => {
      if (!entry.latitude || !entry.longitude) return groups;
      const key = `${entry.latitude.toFixed(6)},${entry.longitude.toFixed(6)}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
      return groups;
    }, {} as { [key: string]: MoodEntryWithUser[] });

    for (const [locationKey, entries] of Object.entries(groupedEntries)) {
      const [lat, lng] = locationKey.split(',').map(Number);
      const isMultiple = entries.length > 1;

      if (isMultiple) {
        // Create a cluster marker for multiple entries
        const clusterIcon = L.divIcon({
          className: 'mood-marker-cluster',
          html: `<div class="cluster-container" style="
            width: 40px; 
            height: 40px; 
            background-color: #fff;
            border-radius: 50%;
            border: 2px solid #3388ff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
            <span style="font-size: 14px; font-weight: bold; color: #3388ff;">${entries.length}</span>
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const clusterMarker = L.marker([lat, lng], {
          icon: clusterIcon
        });

        // Create individual markers for hover state
        const spreadMarkers = await Promise.all(entries.map(async (entry, index) => {
          const angle = (2 * Math.PI * index) / entries.length;
          const spread = 0.0003;
          const spreadLat = lat + spread * Math.cos(angle);
          const spreadLng = lng + spread * Math.sin(angle);

          const markerIcon = L.divIcon({
            className: 'mood-marker',
            html: `<div style="
              width: 30px; 
              height: 30px; 
              background-color: ${this.getMoodColor(entry.moodType)};
              border-radius: 50%;
              border: 2px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
              <span style="font-size: 16px;">${this.getMoodEmoji(entry.moodType)}</span>
            </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          const marker = L.marker([spreadLat, spreadLng], {
            icon: markerIcon,
            opacity: 0
          });

          const popupContent = await this.createPopupContent(entry);
          marker.bindPopup(popupContent, {
            maxWidth: 300,
            minWidth: 200,
            className: 'mood-popup-container'
          });

          return marker;
        }));

        // Add hover interactions
        clusterMarker.on('mouseover', () => {
          spreadMarkers.forEach(marker => {
            marker.addTo(this.map).setOpacity(1);
          });
          clusterMarker.setOpacity(0);
        });

        const mouseoutHandler = () => {
          spreadMarkers.forEach(marker => {
            marker.remove();
          });
          clusterMarker.setOpacity(1);
        };

        clusterMarker.on('mouseout', () => {
          // Add a small delay to check if the mouse is over any spread markers
          setTimeout(() => {
            const isOverSpreadMarker = spreadMarkers.some(marker => 
              marker.getElement()?.matches(':hover')
            );
            if (!isOverSpreadMarker) {
              mouseoutHandler();
            }
          }, 50);
        });

        spreadMarkers.forEach(marker => {
          marker.on('mouseout', () => {
            setTimeout(() => {
              const isOverCluster = clusterMarker.getElement()?.matches(':hover');
              const isOverAnySpread = spreadMarkers.some(m => 
                m.getElement()?.matches(':hover')
              );
              if (!isOverCluster && !isOverAnySpread) {
                mouseoutHandler();
              }
            }, 50);
          });
        });

        clusterMarker.addTo(this.map);
        this.markers.push(clusterMarker);
        this.markers.push(...spreadMarkers);

      } else {
        const entry = entries[0];
        const markerIcon = L.divIcon({
          className: 'mood-marker',
          html: `<div style="
            width: 30px; 
            height: 30px; 
            background-color: ${this.getMoodColor(entry.moodType)};
            border-radius: 50%;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
            <span style="font-size: 16px;">${this.getMoodEmoji(entry.moodType)}</span>
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const marker = L.marker([lat, lng], {
          icon: markerIcon
        });

        const popupContent = await this.createPopupContent(entry);
        marker.bindPopup(popupContent, {
          maxWidth: 300,
          minWidth: 200,
          className: 'mood-popup-container'
        });

        marker.on('mouseover', function(e) {
          const markerDiv = e.target.getElement().querySelector('.mood-marker div');
          if (markerDiv) {
            markerDiv.style.transform = 'scale(1.1)';
            markerDiv.style.transition = 'transform 0.2s';
          }
        });

        marker.on('mouseout', function(e) {
          const markerDiv = e.target.getElement().querySelector('.mood-marker div');
          if (markerDiv) {
            markerDiv.style.transform = 'scale(1)';
          }
        });

        const isRecent = new Date().getTime() - new Date(entry.createdAt).getTime() < 24 * 60 * 60 * 1000;
        if (isRecent) {
          this.addPulseAnimation(marker);
        }

        marker.addTo(this.map);
        this.markers.push(marker);
      }
    }
  }

  private initializeMap(): void {
    // Modern dark theme map style
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap, ©CartoDB',
      subdomains: 'abcd',
      maxZoom: 19
    });

    // Light theme map style
    const lightMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap, ©CartoDB',
      subdomains: 'abcd',
      maxZoom: 19
    });

    this.map = L.map('map', {
      center: [41.0082, 28.9784], // Istanbul coordinates
      zoom: 13,
      layers: [lightMap], // Default to light theme
      zoomControl: false // We'll add zoom control on the right side
    });

    // Add zoom control to the right side
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.map);

    // Add layer control
    const baseMaps = {
      "Light Mode": lightMap,
      "Dark Mode": darkMap
    };

    L.control.layers(baseMaps).addTo(this.map);
  }

  private addPulseAnimation(marker: L.Marker): void {
    const pulseIcon = L.divIcon({
      className: 'pulse-icon',
      html: '<div class="pulse-ring"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    L.marker(marker.getLatLng(), { 
      icon: pulseIcon,
      zIndexOffset: -1
    }).addTo(this.map);
  }

  private calculateStats(entries: MoodEntry[]): void {
    this.totalMoods = entries.length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.todayMoods = entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    }).length;
    
    // Ruh hali dağılımını hesapla
    const moodCounts = entries.reduce((acc, entry) => {
      // String veya number olarak gelen MoodType'ı handle et
      const moodType = typeof entry.moodType === 'string' 
        ? MoodType[entry.moodType as keyof typeof MoodType]
        : entry.moodType;
      
      acc[moodType] = (acc[moodType] || 0) + 1;
      return acc;
    }, {} as { [key in MoodType]: number });
    
    // En yaygın ruh halini bul
    const mostCommonEntry = Object.entries(moodCounts).reduce((a, b) => 
      a[1] > b[1] ? a : b
    );
    
    this.mostCommonMood = Number(mostCommonEntry[0]) as MoodType;

    // Son 5 girişi al
    this.recentMoodEntries = [...entries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // Chart'ı güncelle
    this.updateMoodChart(moodCounts);
  }

  private updateMoodChart(moodCounts: { [key in MoodType]: number }): void {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.moodChart?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const labels = {
      [MoodType.VeryGood]: 'Çok İyi',
      [MoodType.Good]: 'İyi',
      [MoodType.Neutral]: 'Normal',
      [MoodType.Bad]: 'Kötü',
      [MoodType.VeryBad]: 'Çok Kötü'
    };

    const colors = {
      [MoodType.VeryGood]: '#4CAF50',
      [MoodType.Good]: '#8BC34A',
      [MoodType.Neutral]: '#FFC107',
      [MoodType.Bad]: '#FF9800',
      [MoodType.VeryBad]: '#F44336'
    };

    // Tüm ruh hali tiplerini manuel olarak tanımla
    const allMoodTypes = [
      MoodType.VeryGood,
      MoodType.Good,
      MoodType.Neutral,
      MoodType.Bad,
      MoodType.VeryBad
    ];
    
    // Her ruh hali tipi için veri oluştur (count 0 olsa bile)
    const data = allMoodTypes.map(type => ({
      type: type,
      count: moodCounts[type] || 0,
      label: labels[type],
      color: colors[type]
    }));

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => d.color),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 11
              }
            }
          }
        },
        cutout: '70%',
        animation: {
          animateScale: true,
          animateRotate: true
        }
      }
    });
  }

  private clearMarkers(): void {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
  }

  private getMoodColor(moodType: MoodType): string {
    const colors: { [key in MoodType]: string } = {
      [MoodType.VeryGood]: '#00C853',  // Bright green
      [MoodType.Good]: '#64DD17',      // Light green
      [MoodType.Neutral]: '#FFD600',   // Yellow
      [MoodType.Bad]: '#FF6D00',       // Orange
      [MoodType.VeryBad]: '#D50000'    // Red
    };
    return colors[moodType] || '#607D8B';
  }

  getMoodEmoji(moodType: MoodType | null): string {
    if (moodType === null) return '😐';
    
    const emojis: { [key in MoodType]: string } = {
      [MoodType.VeryGood]: '😄',
      [MoodType.Good]: '🙂',
      [MoodType.Neutral]: '😐',
      [MoodType.Bad]: '🙁',
      [MoodType.VeryBad]: '😢'
    };
    return emojis[moodType] || '😐';
  }

  private async createPopupContent(entry: MoodEntryWithUser): Promise<string> {
    const username = entry.user?.username || 'Anonim';
    const isCurrentUser = entry.userId === this.currentUser?.id;
    const profilePic = entry.user?.profilePictureUrl || 'assets/images/default-avatar.png';
    const timeAgo = this.getTimeAgo(new Date(entry.createdAt));
    const moodEmoji = this.getMoodEmoji(entry.moodType);
    const sanitizedNote = entry.note ? this.sanitizeHtml(entry.note) : '';
    
    // Load location photos
    const photos = await this.loadLocationPhotos(entry.latitude, entry.longitude);
    const photoHtml = photos.length > 0 
      ? `<div class="location-photos">
           <img src="${photos[0]}" alt="Location photo" class="location-photo">
         </div>`
      : '';
    
    return `
      <div class="mood-popup">
        <div class="mood-header">
          <img src="${profilePic}" alt="Profil fotoğrafı" class="mood-profile-pic" onerror="this.src='assets/images/default-avatar.png'">
          <div class="mood-user-info">
            <div class="mood-username">${isCurrentUser ? 'Siz' : username}</div>
            <div class="mood-time">${timeAgo}</div>
          </div>
        </div>
        <div class="mood-content">
          <div class="mood-type">
            <span class="mood-emoji">${moodEmoji}</span>
          </div>
          ${sanitizedNote ? `
            <div class="mood-note">
              <i class="fas fa-quote-left"></i>
              <p>${sanitizedNote}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private sanitizeHtml(html: string): string {
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
  }

  getTimeAgo(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((new Date().getTime() - dateObj.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' yıl önce';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' ay önce';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' gün önce';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' saat önce';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' dakika önce';
    
    return Math.floor(seconds) + ' saniye önce';
  }

  navigateToMoodEntry(): void {
    this.router.navigate(['/mood/entry']);
  }

  async centerOnUserLocation(): Promise<void> {
    try {
      const location = await this.locationService.getCurrentLocation();
      
      // Remove previous location marker if exists
      if (this.locationMarker) {
        this.locationMarker.remove();
      }

      // Create a custom icon for current location
      const locationIcon = L.divIcon({
        className: 'current-location-marker',
        html: '<div class="current-location-dot"></div>',
        iconSize: [24, 24]
      });

      // Add marker for current location
      this.locationMarker = L.marker([location.latitude, location.longitude], {
        icon: locationIcon,
        zIndexOffset: 1000 // Make sure it's above other markers
      }).addTo(this.map);

      // Center map on location with animation
      this.map.flyTo([location.latitude, location.longitude], 15, {
        duration: 1.5
      });

    } catch (error) {
      console.error('Error getting location:', error);
    }
  }

  private async loadLocationPhotos(lat: number, lon: number): Promise<string[]> {
    const cacheKey = this.getCacheKey(lat, lon);
    if (this.locationPhotos[cacheKey]) {
      return this.locationPhotos[cacheKey];
    }

    try {
      const photos = await firstValueFrom(this.unsplashService.getLocationPhotos(lat, lon));
      this.locationPhotos[cacheKey] = photos;
      return photos;
    } catch (error) {
      console.error('Error loading location photos:', error);
      return [];
    }
  }

  centerOnLocation(latitude: number, longitude: number): void {
    // Önceki marker'ı kaldır
    if (this.locationMarker) {
      this.locationMarker.remove();
    }

    // Haritayı konuma taşı
    this.map.flyTo([latitude, longitude], 15, {
      duration: 1.5,
      easeLinearity: 0.25
    });

    // Geçici bir highlight marker ekle
    const highlightIcon = L.divIcon({
      className: 'highlight-marker',
      html: '<div class="highlight-dot"></div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    this.locationMarker = L.marker([latitude, longitude], {
      icon: highlightIcon,
      zIndexOffset: 1000
    }).addTo(this.map);

    // 3 saniye sonra highlight marker'ı kaldır
    setTimeout(() => {
      if (this.locationMarker) {
        this.locationMarker.remove();
        this.locationMarker = null;
      }
    }, 3000);
  }

  async searchLocation(): Promise<void> {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}&limit=5`
      );

      if (!response.ok) {
        throw new Error('Search service error');
      }

      const results = await response.json();
      this.searchResults = results;

      if (results.length > 0) {
        const firstResult = results[0];
        this.centerOnLocation(parseFloat(firstResult.lat), parseFloat(firstResult.lon));
      }
    } catch (error) {
      console.error('Error searching location:', error);
      this.searchResults = [];
    }
  }
}

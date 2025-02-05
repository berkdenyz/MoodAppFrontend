import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FlickrService {
  private readonly apiKey = '94e7fecf5ee310298373faad4877862d';
  private readonly baseUrl = 'https://www.flickr.com/services/rest';

  constructor(private http: HttpClient) {}

  getLocationPhotos(latitude: number, longitude: number, radius: number = 0.1): Observable<string[]> {
    // Flickr API URL'ini oluştur
    const flickrUrl = new URL(this.baseUrl);
    const params = {
      method: 'flickr.photos.search',
      api_key: this.apiKey,
      lat: latitude.toString(),
      lon: longitude.toString(),
      radius: radius.toString(),
      radius_units: 'km',
      per_page: '5',
      format: 'json',
      nojsoncallback: '1',
      extras: 'url_m,url_l,url_o',
      sort: 'relevance',
      content_type: '1',
      privacy_filter: '1',
      safe_search: '1',
      media: 'photos'
    };

    // Parametreleri URL'e ekle
    Object.entries(params).forEach(([key, value]) => {
      flickrUrl.searchParams.append(key, value);
    });

    // CORS proxy URL'ini oluştur
    const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(flickrUrl.toString());

    return this.http.get(proxyUrl).pipe(
      map((response: any) => {
        console.log('Flickr response:', response);
        if (response?.photos?.photo) {
          return response.photos.photo
            .filter((photo: any) => photo.url_m || photo.url_l || photo.url_o)
            .map((photo: any) => {
              return photo.url_m || photo.url_l || photo.url_o || 
                     `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_m.jpg`;
            });
        }
        return [];
      })
    );
  }
} 
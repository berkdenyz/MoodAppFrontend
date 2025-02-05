import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { MoodEntry, MoodStats } from '../models/mood-entry.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MoodEntryService {
  private apiUrl = `${environment.apiUrl}/api/MoodEntries`;

  constructor(private http: HttpClient) {}

  async getMoodEntries(): Promise<MoodEntry[]> {
    const response = this.http.get<MoodEntry[]>(this.apiUrl);
    return await lastValueFrom(response);
  }

  async getMoodEntry(id: string): Promise<MoodEntry> {
    const response = this.http.get<MoodEntry>(`${this.apiUrl}/${id}`);
    return await lastValueFrom(response);
  }

  async submitMood(moodEntry: Omit<MoodEntry, 'id' | 'userId' | 'createdAt'>): Promise<MoodEntry> {
    const response = this.http.post<MoodEntry>(this.apiUrl, moodEntry);
    return await lastValueFrom(response);
  }

  async updateMood(id: string, moodEntry: Omit<MoodEntry, 'id' | 'userId' | 'createdAt'>): Promise<MoodEntry> {
    const response = this.http.put<MoodEntry>(`${this.apiUrl}/${id}`, moodEntry);
    return await lastValueFrom(response);
  }

  async deleteMood(id: string): Promise<void> {
    const response = this.http.delete<void>(`${this.apiUrl}/${id}`);
    return await lastValueFrom(response);
  }

  async getMoodsByRegion(): Promise<MoodEntry[]> {
    const response = this.http.get<MoodEntry[]>(`${this.apiUrl}/region`);
    return await lastValueFrom(response);
  }

  // Stats endpoint'i olmadığı için bu metodu kaldırıyorum
  // async getMoodStats(): Promise<MoodStats> {
  //   const response = this.http.get<MoodStats>(`${this.apiUrl}/stats`);
  //   return await lastValueFrom(response);
  // }
}

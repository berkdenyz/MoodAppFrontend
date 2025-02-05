import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/api`;
  private currentUser: User | null = null;

  constructor(private http: HttpClient) {}

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const response = this.http.get<User>(`${this.apiUrl}/Profile`);
      this.currentUser = await lastValueFrom(response);
      return this.currentUser;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async updateProfile(profile: Partial<User>): Promise<User> {
    console.log('Profile update input:', profile);

    const requestBody = {
      username: profile.username,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio ?? null,
      profilePictureUrl: profile.profilePictureUrl ?? null
    };

    console.log('Request body:', requestBody);

    const response = this.http.put<User>(`${this.apiUrl}/Profile`, requestBody);
    const updatedUser = await lastValueFrom(response);
    this.currentUser = updatedUser;
    return updatedUser;
  }

  async deleteProfile(): Promise<void> {
    const response = this.http.delete<void>(`${this.apiUrl}/Profile`);
    await lastValueFrom(response);
    this.clearCurrentUser();
  }

  clearCurrentUser(): void {
    this.currentUser = null;
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

interface User {
  email: string;
  id: string;
  username: string;
}

interface AuthResponse {
  token: string;
  refreshToken: string | null;
  expiration: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private apiUrl = 'https://localhost:44345/api/auth';

  constructor(private http: HttpClient) {
    let currentUser = null;
    const storedUser = localStorage.getItem('currentUser');
    
    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
      try {
        currentUser = JSON.parse(storedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    
    this.currentUserSubject = new BehaviorSubject<User | null>(currentUser);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get token(): string | null {
    return localStorage.getItem('token');
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await lastValueFrom(
        this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      );

      if (response && response.token) {
        // JWT'den user bilgilerini çıkar
        const tokenPayload = JSON.parse(atob(response.token.split('.')[1]));
        
        const user: User = {
          email: tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
          id: tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
          username: tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
        };

        // Token ve user bilgilerini kaydet
        localStorage.setItem('token', response.token);
        localStorage.setItem('tokenExpiration', response.expiration);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error in service:', error);
      throw error;
    }
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiration');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    const token = this.token;
    const user = this.currentUserValue;
    const expiration = localStorage.getItem('tokenExpiration');

    if (!token || !user || !expiration) {
      return false;
    }

    // Token süresinin geçip geçmediğini kontrol et
    const expirationDate = new Date(expiration);
    if (expirationDate < new Date()) {
      this.logout(); // Token süresi geçmişse logout yap
      return false;
    }

    return true;
  }

  register(registerData: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, registerData);
  }
}

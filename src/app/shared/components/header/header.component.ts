import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  currentUser: User | null = null;

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {
    this.loadUserProfile();
  }

  private async loadUserProfile(): Promise<void> {
    if (this.authService.isAuthenticated()) {
      this.currentUser = await this.userService.getCurrentUser();
    }

  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
} 

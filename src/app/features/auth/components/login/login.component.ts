import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

interface LoginForm {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: LoginForm = {
    email: '',
    password: ''
  };

  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.loginForm.email || !this.loginForm.password) {
      this.errorMessage = 'Lütfen tüm alanları doldurun';
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = '';
      
      const loginSuccess = await this.authService.login(this.loginForm.email, this.loginForm.password);
      
      if (loginSuccess) {
        console.log('Login successful, navigating to home...');
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.router.navigate(['/home'], { replaceUrl: true });
      } else {
        this.errorMessage = 'Giriş başarısız oldu. Token alınamadı.';
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage = error.error?.message || 'Giriş yapılırken bir hata oluştu';
    } finally {
      this.isLoading = false;
    }
  }
}

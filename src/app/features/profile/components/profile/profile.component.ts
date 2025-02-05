import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = false;
  currentUser: User | null = null;
  isEditingPhoto = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      bio: [''],
      profilePictureUrl: ['']
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.isLoading = true;
      this.currentUser = await this.userService.getCurrentUser();
      if (this.currentUser) {
        console.log('Current user:', this.currentUser);
        this.profileForm.patchValue({
          username: this.currentUser.username,
          email: this.currentUser.email,
          firstName: this.currentUser.firstName,
          lastName: this.currentUser.lastName,
          bio: this.currentUser.bio,
          profilePictureUrl: this.currentUser.profilePictureUrl
        });
      }
    } catch (error) {
      this.showError('Failed to load profile data');
    } finally {
      this.isLoading = false;
    }
  }

  togglePhotoEdit(): void {
    this.isEditingPhoto = !this.isEditingPhoto;
    if (this.isEditingPhoto) {
      const currentUrl = this.profileForm.get('profilePictureUrl')?.value;
      if (!currentUrl) {
        this.profileForm.patchValue({
          profilePictureUrl: this.currentUser?.profilePictureUrl || ''
        });
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      return;
    }

    try {
      this.isLoading = true;
      console.log('Form values before submit:', this.profileForm.value);
      
      const formData = {
        ...this.profileForm.value
      };
      
      console.log('Form data to be sent:', formData);
      
      await this.userService.updateProfile(formData);
      this.showSuccess('Profile updated successfully');
      this.isEditingPhoto = false;
    } catch (error) {
      console.error('Update error:', error);
      this.showError('Failed to update profile');
    } finally {
      this.isLoading = false;
    }
  }

  async deleteProfile(): Promise<void> {
    if (confirm('Are you sure you want to delete your profile? This action cannot be undone.')) {
      try {
        this.isLoading = true;
        await this.userService.deleteProfile();
        this.authService.logout();
        await this.router.navigate(['/auth/login']);
        this.showSuccess('Profile deleted successfully');
      } catch (error) {
        this.showError('Failed to delete profile');
      } finally {
        this.isLoading = false;
      }
    }
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
  }
}

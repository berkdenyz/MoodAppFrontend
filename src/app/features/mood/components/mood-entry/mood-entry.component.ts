import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MoodEntryService } from '../../../../core/services/mood-entry.service';
import { LocationService, LocationError } from '../../../../core/services/location.service';
import { MoodType } from '../../../../core/models/mood-entry.model';

@Component({
  selector: 'app-mood-entry',
  templateUrl: './mood-entry.component.html',
  styleUrls: ['./mood-entry.component.scss']
})
export class MoodEntryComponent implements OnInit {
  moodForm: FormGroup;
  isLoading = false;
  error: string | null = null;
  isGettingLocation = false;
  locationPermissionGranted = false;
  
  moodTypes = [
    { value: MoodType.VeryGood, label: 'Çok İyi', icon: '😄', color: '#4CAF50' },
    { value: MoodType.Good, label: 'İyi', icon: '🙂', color: '#8BC34A' },
    { value: MoodType.Neutral, label: 'Normal', icon: '😐', color: '#FFC107' },
    { value: MoodType.Bad, label: 'Kötü', icon: '🙁', color: '#FF9800' },
    { value: MoodType.VeryBad, label: 'Çok Kötü', icon: '😢', color: '#F44336' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private moodEntryService: MoodEntryService,
    private locationService: LocationService
  ) {
    this.moodForm = this.fb.group({
      moodType: [null, Validators.required],
      note: [''],
      latitude: [null, Validators.required],
      longitude: [null, Validators.required]
    });
  }

  async ngOnInit(): Promise<void> {
    this.locationPermissionGranted = await this.locationService.requestLocationPermission();
    if (this.locationPermissionGranted) {
      await this.getCurrentLocation();

      // Konum değişikliklerini dinle
      this.locationService.getLocation$().subscribe(location => {
        if (location) {
          this.moodForm.patchValue({
            latitude: location.latitude,
            longitude: location.longitude
          });
        }
      });
    } else {
      this.error = 'Please enable location services to share your mood with location.';
    }
  }

  async getCurrentLocation(): Promise<void> {
    this.isGettingLocation = true;
    this.error = null;

    try {
      const location = await this.locationService.getCurrentLocation();
      this.moodForm.patchValue({
        latitude: location.latitude,
        longitude: location.longitude
      });
      this.locationPermissionGranted = true;
    } catch (error) {
      const locationError = error as LocationError;
      this.error = locationError.message;
      this.locationPermissionGranted = false;
    } finally {
      this.isGettingLocation = false;
    }
  }

  async retryLocation(): Promise<void> {
    this.locationService.clearLocation();
    await this.getCurrentLocation();
  }

  async onSubmit(): Promise<void> {
    if (this.moodForm.invalid) {
      if (!this.locationPermissionGranted) {
        this.error = 'Location permission is required to share your mood. Please enable location services and try again.';
      }
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      await this.moodEntryService.submitMood(this.moodForm.value);
      this.router.navigate(['/map']);
    } catch (error) {
      console.error('Error submitting mood:', error);
      this.error = 'Could not save your mood. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/map']);
  }

  getMoodColor(moodType: MoodType): string {
    const mood = this.moodTypes.find(m => m.value === moodType);
    return mood?.color || '#607D8B';
  }
}

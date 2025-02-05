import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MoodEntryComponent } from './components/mood-entry/mood-entry.component';

@NgModule({
  declarations: [
    MoodEntryComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      { path: 'entry', component: MoodEntryComponent }
    ])
  ],
  exports: [
    MoodEntryComponent
  ]
})
export class MoodModule { }

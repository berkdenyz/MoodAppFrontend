import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MoodMapComponent } from './components/mood-map/mood-map.component';

const routes: Routes = [
  { path: '', component: MoodMapComponent }
];

@NgModule({
  declarations: [
    MoodMapComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class MapModule { }

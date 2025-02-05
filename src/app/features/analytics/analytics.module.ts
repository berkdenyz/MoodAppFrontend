import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';
import { AnalyticsComponent } from './components/analytics/analytics.component';

@NgModule({
  declarations: [
    AnalyticsComponent
  ],
  imports: [
    CommonModule,
    NgChartsModule,
    RouterModule.forChild([
      { path: '', component: AnalyticsComponent }
    ])
  ]
})
export class AnalyticsModule { }

import { Component, OnInit } from '@angular/core';
import { ChartConfiguration, ChartData, ChartEvent } from 'chart.js';
import { MoodEntryService } from '../../../../core/services/mood-entry.service';
import { MoodEntry, MoodType } from '../../../../core/models/mood-entry.model';

interface DistrictAnalytics {
  name: string;
  moodCounts: { [key in MoodType]: number };
  totalMoods: number;
}

interface MoodTypeInfo {
  type: MoodType;
  label: string;
  emoji: string;
  color: string;
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit {
  isLoading = true;
  districtAnalytics: DistrictAnalytics[] = [];
  selectedDistrict: string | null = null;
  totalMoods = 0;
  mostCommonMood: MoodType | null = null;

  moodTypes: MoodTypeInfo[] = [
    { type: MoodType.VeryGood, label: 'Çok İyi', emoji: '😄', color: '#4CAF50' },
    { type: MoodType.Good, label: 'İyi', emoji: '🙂', color: '#8BC34A' },
    { type: MoodType.Neutral, label: 'Normal', emoji: '😐', color: '#FFC107' },
    { type: MoodType.Bad, label: 'Kötü', emoji: '🙁', color: '#FF9800' },
    { type: MoodType.VeryBad, label: 'Çok Kötü', emoji: '😢', color: '#F44336' }
  ];

  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context: any) => {
            const label = this.moodTypes[context.dataIndex].emoji + ' ' + 
                         this.moodTypes[context.dataIndex].label;
            const value = context.raw as number;
            const percentage = Math.round((value / this.totalMoods) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  pieChartData: ChartData<'pie'> = {
    labels: this.moodTypes.map(mood => `${mood.emoji} ${mood.label}`),
    datasets: [{
      data: [],
      backgroundColor: this.moodTypes.map(mood => mood.color),
      hoverBackgroundColor: this.moodTypes.map(mood => mood.color)
    }]
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
      easing: 'easeInOutQuad'
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const value = context.raw as number;
            return `${context.dataset.label}: ${value}`;
          }
        }
      }
    }
  };

  barChartData: ChartData<'bar'> = {
    labels: this.moodTypes.map(mood => `${mood.emoji} ${mood.label}`),
    datasets: []
  };

  constructor(private moodEntryService: MoodEntryService) {}

  async ngOnInit(): Promise<void> {
    await this.loadAnalytics();
  }

  private async loadAnalytics(): Promise<void> {
    try {
      const entries = await this.moodEntryService.getMoodEntries();
      if (entries && entries.length > 0) {
        this.processAnalytics(entries);
        this.updateCharts();
      } else {
        console.log('No mood entries found');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private processAnalytics(entries: MoodEntry[]): void {
    const districtGroups = this.groupByDistrict(entries);

    this.districtAnalytics = Object.entries(districtGroups).map(([district, districtEntries]) => {
      const moodCounts = this.countMoods(districtEntries);
      return {
        name: district,
        moodCounts,
        totalMoods: districtEntries.length
      };
    });

    this.districtAnalytics.sort((a, b) => b.totalMoods - a.totalMoods);
    this.totalMoods = entries.length;

    const moodCounts = this.countMoods(entries);
    const [mostCommonMoodType] = Object.entries(moodCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b);
    this.mostCommonMood = (mostCommonMoodType as unknown) as MoodType;
  }

  private groupByDistrict(entries: MoodEntry[]): { [district: string]: MoodEntry[] } {
    return entries.reduce((groups: { [key: string]: MoodEntry[] }, entry) => {
      const district = entry.district || 'Unknown';
      if (!groups[district]) {
        groups[district] = [];
      }
      groups[district].push(entry);
      return groups;
    }, {});
  }

  private countMoods(entries: MoodEntry[]): { [key in MoodType]: number } {
    const initial = Object.values(MoodType).reduce((acc, type) => {
      acc[type as MoodType] = 0;
      return acc;
    }, {} as { [key in MoodType]: number });

    return entries.reduce((counts, entry) => {
      if (entry.moodType) {
        counts[entry.moodType]++;
      }
      return counts;
    }, initial);
  }

  private updateCharts(): void {
    this.updateMoodPieChart();
    this.updateDistrictBarChart();
  }

  private updateMoodPieChart(): void {
    const moodCounts = Object.values(MoodType).map(moodType => {
      return this.districtAnalytics.reduce((total, district) => {
        return total + (district.moodCounts[moodType as MoodType] || 0);
      }, 0);
    });

    this.pieChartData = {
      labels: this.moodTypes.map(mood => `${mood.emoji} ${mood.label}`),
      datasets: [{
        data: moodCounts,
        backgroundColor: this.moodTypes.map(mood => mood.color),
        hoverBackgroundColor: this.moodTypes.map(mood => mood.color)
      }]
    };
  }

  private updateDistrictBarChart(): void {
    if (this.selectedDistrict) {
      const district = this.districtAnalytics.find(d => d.name === this.selectedDistrict);
      if (district) {
        this.barChartData = {
          labels: this.moodTypes.map(mood => `${mood.emoji} ${mood.label}`),
          datasets: [{
            label: district.name,
            data: Object.values(MoodType).map(moodType => district.moodCounts[moodType as MoodType] || 0),
            backgroundColor: this.moodTypes.map(mood => mood.color)
          }]
        };
      }
    } else {
      this.barChartData = {
        labels: this.moodTypes.map(mood => `${mood.emoji} ${mood.label}`),
        datasets: this.districtAnalytics.map((district, index) => ({
          label: district.name,
          data: Object.values(MoodType).map(moodType => district.moodCounts[moodType as MoodType] || 0),
          backgroundColor: this.moodTypes[index % this.moodTypes.length].color
        }))
      };
    }
  }

  onDistrictSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedDistrict = select.value || null;
    this.updateCharts();
  }

  getMoodInfo(type: MoodType): MoodTypeInfo {
    return this.moodTypes.find(mood => mood.type === type) || this.moodTypes[2];
  }
} 
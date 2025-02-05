export enum MoodType {
  VeryGood,
  Good,
  Neutral,
  Bad,
  VeryBad
}

export interface MoodEntry {
  id: string;
  userId: string;
  moodType: MoodType;
  note?: string;
  latitude: number;
  longitude: number;
  district: string;
  neighborhood: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoodStats {
  totalMoods: number;
  todayMoods: number;
  mostCommonMood: string;
} 
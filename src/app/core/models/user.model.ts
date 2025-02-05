export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  bio?: string;
  createdAt: Date;
  lastLoginAt: Date;
  profilePhotoUrl?: string;
  profilePictureUrl?: string;
  personalGoals?: string;
}

export interface UserProfile extends User {
  totalMoods: number;
  moodHistory: {
    date: Date;
    moodType: string;
    note?: string;
  }[];
  mostFrequentMood: string;
  averageMoodByDay: {
    [key: string]: number;
  };
} 
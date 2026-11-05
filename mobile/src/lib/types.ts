export type Sex = 'male' | 'female' | 'other';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'lose_weight' | 'gain_muscle' | 'endurance' | 'flexibility';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type WorkoutCategory = 'gym' | 'outdoors' | 'home';

export interface Profile {
  sex: Sex | null;
  birthDate: string | null; // YYYY-MM-DD
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  fitnessLevel: FitnessLevel | null;
  goal: Goal | null;
  activityLevel: ActivityLevel | null;
  workoutsPerWeek: number | null;
  equipment: string[];
  dietPreferences: string[];
  targetKcal: number | null;
  targetProteinG: number | null;
  targetCarbsG: number | null;
  targetFatG: number | null;
  onboarded: boolean;
}

export interface User {
  id: number;
  email: string;
  name: string;
  profile: Profile;
}

export interface MealLog {
  id: number;
  name: string;
  mealType: MealType;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: 'scan' | 'barcode' | 'suggestion' | 'manual';
  eatenAt: string;
}

export interface ScanResult {
  isFood: boolean;
  name: string;
  items: { name: string; grams: number; calories: number }[];
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
}

export interface MealSuggestion {
  id: string;
  title: string;
  description: string;
  mealType: MealType;
  prepMinutes: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  tags: string[];
  ingredients: { name: string; quantity: string; inFridge: boolean }[];
  steps: string[];
  why: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  instructions: string;
}

export interface Workout {
  id: string;
  title: string;
  category: WorkoutCategory;
  type: 'strength' | 'cardio' | 'hiit' | 'mobility';
  durationMin: number;
  intensity: 'low' | 'moderate' | 'intense';
  estimatedKcal: number;
  muscleGroups: string[];
  description: string;
  exercises: Exercise[];
  favorite?: boolean;
  builtIn?: boolean;
  createdAt?: string;
}

export interface FridgeItem {
  id: number;
  name: string;
}

export interface Dashboard {
  user: User;
  date: string;
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number; entries: number };
  training: { sessions: number; minutes: number; calories: number };
  latestWorkout: Workout | null;
}

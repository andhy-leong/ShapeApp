// Petit cache en mémoire partagé entre écrans (suggestions IA non encore enregistrées)
import type { MealSuggestion, Workout } from './types';
import { BUILT_IN_WORKOUTS } from './workouts';

const meals = new Map<string, MealSuggestion>();
const workouts = new Map<string, Workout>(BUILT_IN_WORKOUTS.map((w) => [w.id, w]));

export const memoryStore = {
  putMeals(list: MealSuggestion[]) {
    list.forEach((m) => meals.set(m.id, m));
  },
  getMeal(id: string) {
    return meals.get(id);
  },
  putWorkouts(list: Workout[]) {
    list.forEach((w) => workouts.set(w.id, w));
  },
  getWorkout(id: string) {
    return workouts.get(id);
  },
};

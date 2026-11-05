import type { ActivityLevel, Goal, Sex } from './types';

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function ageFromBirthDate(birthDate: string | null) {
  if (!birthDate) return 30;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return Math.max(14, Math.min(100, age));
}

/**
 * Objectifs journaliers à partir du métabolisme de base (Mifflin-St Jeor)
 * et de l'objectif. Les valeurs restent modifiables dans le profil.
 */
export function computeTargets(input: {
  sex: Sex | null;
  birthDate: string | null;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}) {
  const age = ageFromBirthDate(input.birthDate);
  const sexOffset = input.sex === 'male' ? 5 : input.sex === 'female' ? -161 : -78;
  const bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * age + sexOffset;
  const tdee = bmr * ACTIVITY_FACTOR[input.activityLevel];

  const adjust: Record<Goal, number> = {
    lose_weight: -0.2,
    gain_muscle: 0.1,
    endurance: 0.05,
    flexibility: 0,
  };
  const minKcal = input.sex === 'male' ? 1500 : 1200;
  const kcal = Math.max(minKcal, Math.round((tdee * (1 + adjust[input.goal])) / 10) * 10);

  const proteinPerKg: Record<Goal, number> = { lose_weight: 2.0, gain_muscle: 2.0, endurance: 1.6, flexibility: 1.4 };
  const fatPct: Record<Goal, number> = { lose_weight: 0.3, gain_muscle: 0.25, endurance: 0.25, flexibility: 0.3 };

  const protein = Math.round(proteinPerKg[input.goal] * input.weightKg);
  const fat = Math.round((kcal * fatPct[input.goal]) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return { targetKcal: kcal, targetProteinG: protein, targetCarbsG: carbs, targetFatG: fat };
}

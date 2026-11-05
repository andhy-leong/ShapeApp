import type { MealType } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale au format YYYY-MM-DD */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date-heure locale au format YYYY-MM-DD HH:MM:SS (stockée telle quelle côté serveur) */
export function localDateTime(d = new Date()) {
  return `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function localTime(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Type de repas déduit de l'heure */
export function mealTypeForNow(d = new Date()): MealType {
  const h = d.getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 18 && h < 23) return 'dinner';
  return 'snack';
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déj',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

/** Parse "YYYY-MM-DD HH:MM:SS" en Date locale */
export function parseLocalDateTime(s: string) {
  const [d, t = '00:00:00'] = s.split(' ');
  const [y, m, day] = d.split('-').map(Number);
  const [h, min, sec = 0] = t.split(':').map(Number);
  return new Date(y, m - 1, day, h, min, sec);
}

// Connexion à l'app Santé d'Apple (HealthKit).
// Le module natif n'existe que dans un "development build" iOS (pas dans Expo Go) :
// il est chargé à la demande et toutes les fonctions échouent silencieusement s'il est absent.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type * as HK from '@kingstinct/react-native-healthkit';

type HealthKit = typeof HK;

let hk: HealthKit | null | undefined;

function kit(): HealthKit | null {
  if (hk !== undefined) return hk;
  // Pas de HealthKit sur Android, ni si l'app a été compilée sans (FITVISION_NO_HEALTHKIT=1)
  if (Platform.OS !== 'ios' || Constants.expoConfig?.extra?.healthKit === false) return (hk = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    hk = require('@kingstinct/react-native-healthkit') as HealthKit;
    if (!hk.isHealthDataAvailable()) hk = null;
  } catch {
    hk = null;
  }
  return hk;
}

export function isHealthAvailable() {
  return kit() !== null;
}

const READ = [
  'HKCharacteristicTypeIdentifierBiologicalSex',
  'HKCharacteristicTypeIdentifierDateOfBirth',
  'HKQuantityTypeIdentifierHeight',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKWorkoutTypeIdentifier',
] as const;

const WRITE = [
  'HKCorrelationTypeIdentifierFood',
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKWorkoutTypeIdentifier',
] as const;

let authorized = false;

/** Affiche la feuille d'autorisation Santé (une seule fois, iOS mémorise le choix). */
export async function requestHealthPermissions(): Promise<boolean> {
  const k = kit();
  if (!k) return false;
  try {
    await k.requestAuthorization({ toRead: READ, toShare: WRITE });
    authorized = true;
    return true;
  } catch {
    return false;
  }
}

async function ensureAuth() {
  if (!authorized) await requestHealthPermissions();
  return kit();
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Infos de base pour préremplir l'onboarding. */
export async function readBodyBasics() {
  const k = await ensureAuth();
  if (!k) return null;
  const out: { sex?: 'male' | 'female' | 'other'; birthDate?: string; heightCm?: number; weightKg?: number } = {};
  try {
    const sex = await k.getBiologicalSexAsync();
    if (sex === k.BiologicalSex.male) out.sex = 'male';
    else if (sex === k.BiologicalSex.female) out.sex = 'female';
    else if (sex === k.BiologicalSex.other) out.sex = 'other';
  } catch {}
  try {
    const dob = await k.getDateOfBirthAsync();
    if (dob) out.birthDate = new Date(dob).toISOString().slice(0, 10);
  } catch {}
  try {
    const h = await k.getMostRecentQuantitySample('HKQuantityTypeIdentifierHeight', 'cm');
    if (h) out.heightCm = Math.round(h.quantity);
  } catch {}
  try {
    const w = await k.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg');
    if (w) out.weightKg = Math.round(w.quantity * 10) / 10;
  } catch {}
  return out;
}

export interface TodayHealth {
  steps: number;
  activeKcal: number;
  heartRate: number | null; // dernier BPM mesuré
  heartRateAt: Date | null;
  restingHeartRate: number | null;
  hourlyHeartRate: number[]; // moyennes des 6 dernières heures (0 = pas de mesure)
}

export async function readTodayHealth(): Promise<TodayHealth | null> {
  const k = await ensureAuth();
  if (!k) return null;
  const filter = { date: { startDate: startOfToday(), endDate: new Date() } };
  const result: TodayHealth = {
    steps: 0,
    activeKcal: 0,
    heartRate: null,
    heartRateAt: null,
    restingHeartRate: null,
    hourlyHeartRate: [0, 0, 0, 0, 0, 0],
  };

  try {
    const s = await k.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], { filter, unit: 'count' });
    result.steps = Math.round(s.sumQuantity?.quantity ?? 0);
  } catch {}
  try {
    const e = await k.queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], { filter, unit: 'kcal' });
    result.activeKcal = Math.round(e.sumQuantity?.quantity ?? 0);
  } catch {}
  try {
    const r = await k.getMostRecentQuantitySample('HKQuantityTypeIdentifierRestingHeartRate', 'count/min');
    if (r) result.restingHeartRate = Math.round(r.quantity);
  } catch {}
  try {
    const since = new Date(Date.now() - 6 * 3600 * 1000);
    const samples = await k.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
      limit: 0,
      ascending: true,
      unit: 'count/min',
      filter: { date: { startDate: since, endDate: new Date() } },
    });
    const sums = [0, 0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0, 0];
    for (const smp of samples) {
      const t = new Date(smp.startDate).getTime();
      const idx = Math.min(5, Math.max(0, Math.floor((t - since.getTime()) / 3600000)));
      sums[idx] += smp.quantity;
      counts[idx]++;
    }
    result.hourlyHeartRate = sums.map((s, i) => (counts[i] ? Math.round(s / counts[i]) : 0));
    const last = samples[samples.length - 1];
    if (last) {
      result.heartRate = Math.round(last.quantity);
      result.heartRateAt = new Date(last.startDate);
    }
  } catch {}
  return result;
}

/** Enregistre un repas dans Santé (énergie + macros, regroupés en un "aliment"). */
export async function saveMealToHealth(meal: { name: string; calories: number; proteinG: number; carbsG: number; fatG: number; date?: Date }) {
  const k = await ensureAuth();
  if (!k) return;
  const date = meal.date ?? new Date();
  const metadata = { HKFoodType: meal.name };
  const q = (quantityType: HK.QuantityTypeIdentifier, unit: string, quantity: number) => ({
    quantityType,
    unit,
    quantity,
    startDate: date,
    endDate: date,
    metadata,
  });
  try {
    await k.saveCorrelationSample(
      'HKCorrelationTypeIdentifierFood',
      [
        q('HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal', meal.calories),
        q('HKQuantityTypeIdentifierDietaryProtein', 'g', meal.proteinG),
        q('HKQuantityTypeIdentifierDietaryCarbohydrates', 'g', meal.carbsG),
        q('HKQuantityTypeIdentifierDietaryFatTotal', 'g', meal.fatG),
      ],
      date,
      date,
      metadata,
    );
  } catch (e) {
    console.warn('HealthKit saveMeal', e);
  }
}

/** Enregistre une séance terminée dans Santé (apparaît dans Forme / Activité). */
export async function saveWorkoutToHealth(w: { type: 'strength' | 'cardio' | 'hiit' | 'mobility'; start: Date; end: Date; kcal: number }) {
  const k = await ensureAuth();
  if (!k) return;
  const activity = {
    strength: k.WorkoutActivityType.traditionalStrengthTraining,
    cardio: k.WorkoutActivityType.running,
    hiit: k.WorkoutActivityType.highIntensityIntervalTraining,
    mobility: k.WorkoutActivityType.flexibility,
  }[w.type];
  try {
    await k.saveWorkoutSample(
      activity,
      [
        {
          quantityType: 'HKQuantityTypeIdentifierActiveEnergyBurned',
          unit: 'kcal',
          quantity: w.kcal,
          startDate: w.start,
          endDate: w.end,
        },
      ],
      w.start,
      w.end,
      { energyBurned: w.kcal },
    );
  } catch (e) {
    console.warn('HealthKit saveWorkout', e);
  }
}

export async function saveWeightToHealth(kg: number) {
  const k = await ensureAuth();
  if (!k) return;
  try {
    await k.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', kg, new Date(), new Date());
  } catch {}
}

import * as SecureStore from 'expo-secure-store';
import type { Dashboard, FridgeItem, MealLog, Profile, User, Workout } from './types';

// URL de l'API PHP hébergée sur IONOS (fichier .env : EXPO_PUBLIC_API_URL=https://api.mondomaine.fr)
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'fitvision.token';

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export async function loadToken() {
  token = await SecureStore.getItemAsync(TOKEN_KEY);
  return token;
}

export async function setToken(value: string | null) {
  token = value;
  if (value) await SecureStore.setItemAsync(TOKEN_KEY, value);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 30000): Promise<T> {
  if (!API_URL) throw new ApiError(0, "L'URL de l'API n'est pas configurée (EXPO_PUBLIC_API_URL).");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}`, 'X-Auth-Token': `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(0, controller.signal.aborted ? 'La requête a pris trop de temps.' : 'Pas de connexion au serveur.');
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, data?.error ?? `Erreur ${res.status}`);
  }
  return data as T;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: User }>('POST', '/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('POST', '/auth/login', { email, password }),

  me: () => request<{ user: User }>('GET', '/me'),
  updateProfile: (data: Partial<Profile> & { name?: string }) =>
    request<{ user: User }>('PUT', '/me/profile', data),
  deleteAccount: () => request<{ ok: true }>('DELETE', '/me'),
  dashboard: (date: string) => request<Dashboard>('GET', `/dashboard?date=${date}`),

  meals: (date: string) => request<{ meals: MealLog[] }>('GET', `/meals?date=${date}`),
  logMeal: (meal: Omit<MealLog, 'id'>) => request<{ meal: MealLog }>('POST', '/meals', meal),
  deleteMeal: (id: number) => request<{ ok: true }>('DELETE', `/meals/${id}`),

  fridge: () => request<{ items: FridgeItem[] }>('GET', '/fridge'),
  addFridge: (names: string[]) => request<{ items: FridgeItem[] }>('POST', '/fridge', { names }),
  deleteFridge: (id: number) => request<{ items: FridgeItem[] }>('DELETE', `/fridge/${id}`),
  clearFridge: () => request<{ items: FridgeItem[] }>('DELETE', '/fridge'),

  workouts: () => request<{ workouts: Workout[] }>('GET', '/workouts'),
  saveWorkout: (w: Workout) => request<{ workout: Workout }>('POST', '/workouts', w),
  toggleFavorite: (id: string) => request<{ workout: Workout }>('POST', `/workouts/${id}/favorite`),
  deleteWorkout: (id: string) => request<{ ok: true }>('DELETE', `/workouts/${id}`),
  logSession: (s: {
    workoutRef: string;
    title: string;
    durationMin: number;
    calories: number;
    startedAt: string;
    endedAt: string;
  }) => request<{ ok: true }>('POST', '/sessions', s),
  sessions: (days: number) =>
    request<{ sessions: { title: string; durationMin: number; calories: number; startedAt: string }[] }>('GET', `/sessions?days=${days}`),
};
// Les fonctions IA sont dans src/lib/ai : elles appellent directement Claude, ChatGPT ou Gemini avec la clé de l'utilisateur.

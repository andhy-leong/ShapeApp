// Choix de l'IA par l'utilisateur : fournisseur + clé API personnelle + modèle.
// La clé est stockée dans le trousseau sécurisé du téléphone (Keychain iOS / Keystore Android)
// et n'est envoyée qu'au fournisseur choisi — jamais au serveur FitVision.

import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

export type AiProvider = 'anthropic' | 'openai' | 'gemini';

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

export const PROVIDERS: Record<
  AiProvider,
  { name: string; company: string; defaultModel: string; presets: string[]; keyUrl: string; keyHint: string; note: string }
> = {
  anthropic: {
    name: 'Claude',
    company: 'Anthropic',
    defaultModel: 'claude-opus-5-5',
    presets: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
    keyUrl: 'https://platform.claude.com',
    keyHint: 'sk-ant-…',
    note: 'Crée une clé dans la console Claude (rubrique API Keys) et ajoute du crédit. Opus est le plus précis, Haiku le moins cher.',
  },
  openai: {
    name: 'ChatGPT',
    company: 'OpenAI',
    defaultModel: 'gpt-6-astra',
    presets: ['gpt-6-astra'],
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'sk-…',
    note: "Crée une clé sur la plateforme OpenAI et ajoute du crédit. L'abonnement ChatGPT Plus n'inclut pas l'accès API.",
  },
  gemini: {
    name: 'Gemini',
    company: 'Google',
    defaultModel: 'gemini-3.8-flash',
    presets: ['gemini-3.8-flash'],
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'AIza…',
    note: 'Crée une clé dans Google AI Studio. Google propose en général une offre gratuite (avec des limites) : idéal pour tester.',
  },
};

const STORE_KEY = 'fitvision.ai';

let current: AiSettings | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadAiSettings() {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    current = raw ? (JSON.parse(raw) as AiSettings) : null;
  } catch {
    current = null;
  }
  emit();
  return current;
}

export async function saveAiSettings(s: AiSettings | null) {
  if (s) await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(s));
  else await SecureStore.deleteItemAsync(STORE_KEY);
  current = s;
  emit();
}

export function getAiSettings() {
  return current;
}

export function useAiSettings() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

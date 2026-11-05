import { Alert } from 'react-native';
import { router } from 'expo-router';
import { getAiSettings } from './settings';
import { AiError } from './providers';

/** Renvoie true si une IA est configurée ; sinon propose d'aller la configurer. */
export function ensureAi(): boolean {
  if (getAiSettings()?.apiKey) return true;
  promptSetup();
  return false;
}

function promptSetup() {
  Alert.alert(
    'Choisis ton IA',
    "FitVision utilise ta propre clé Claude, ChatGPT ou Gemini pour analyser tes plats et créer tes repas et séances.",
    [
      { text: 'Plus tard', style: 'cancel' },
      { text: 'Configurer', onPress: () => router.push('/ai-settings') },
    ],
  );
}

/** Message d'erreur à afficher ; redirige vers les réglages si la clé est absente ou invalide. */
export function aiErrorMessage(e: unknown): string {
  if (e instanceof AiError && (e.code === 'not_configured' || e.code === 'auth')) {
    if (e.code === 'not_configured') promptSetup();
  }
  return (e as Error)?.message ?? "L'IA n'a pas pu répondre.";
}

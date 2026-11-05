import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Redimensionne une photo (1024 px de large) et la renvoie en JPEG base64.
 * Une image plus petite = envoi plus rapide et appel IA moins cher, sans perte de précision utile.
 */
export async function toJpegBase64(uri: string, width = 1024): Promise<string> {
  const out = await manipulateAsync(uri, [{ resize: { width } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!out.base64) throw new Error("Impossible de préparer l'image.");
  return out.base64;
}

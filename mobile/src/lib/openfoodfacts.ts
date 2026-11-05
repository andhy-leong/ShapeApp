// Recherche d'un produit emballé par code-barres dans Open Food Facts (base ouverte et gratuite).
import type { ScanResult } from './types';

export interface BarcodeProduct {
  code: string;
  brand: string;
  servingGrams: number | null;
  per100: ScanResult; // valeurs pour 100 g
}

export async function lookupBarcode(code: string): Promise<BarcodeProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_fr,brands,nutriments,serving_quantity`;
  const res = await fetch(url, { headers: { 'User-Agent': 'FitVision-iOS/1.0' } });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;

  const p = json.product;
  const n = p.nutriments ?? {};
  const kcal = Number(n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0));
  const serving = Number(p.serving_quantity);

  return {
    code,
    brand: String(p.brands ?? '').split(',')[0].trim(),
    servingGrams: serving > 0 ? Math.round(serving) : null,
    per100: {
      isFood: true,
      name: p.product_name_fr || p.product_name || `Produit ${code}`,
      items: [],
      calories: Math.round(kcal),
      proteinG: Number(n.proteins_100g ?? 0),
      carbsG: Number(n.carbohydrates_100g ?? 0),
      fatG: Number(n.fat_100g ?? 0),
      fiberG: Number(n.fiber_100g ?? 0),
      confidence: 'high',
      notes: '',
    },
  };
}

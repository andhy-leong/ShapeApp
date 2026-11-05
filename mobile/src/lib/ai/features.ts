// Fonctions IA de FitVision. Les données de contexte (profil, journal du jour, frigo, séances)
// viennent du serveur FitVision ; l'appel à l'IA part du téléphone avec la clé de l'utilisateur.

import { api } from '../api';
import { localDate, localTime } from '../dates';
import type { FridgeItem, MealSuggestion, MealType, Profile, ScanResult, User, Workout, WorkoutCategory } from '../types';
import { generateJson } from './providers';

// --- Petits constructeurs de JSON Schema strict (compatibles Claude, OpenAI et Gemini) ---
type Schema = Record<string, unknown>;
const S: Schema = { type: 'string' };
const N: Schema = { type: 'number' };
const I: Schema = { type: 'integer' };
const B: Schema = { type: 'boolean' };
const E = (values: string[]): Schema => ({ type: 'string', enum: values });
const A = (items: Schema): Schema => ({ type: 'array', items });
const O = (props: Record<string, Schema>): Schema => ({
  type: 'object',
  properties: props,
  required: Object.keys(props),
  additionalProperties: false,
});

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'perte de poids (déficit calorique, préserver le muscle)',
  gain_muscle: 'prise de muscle (léger surplus, protéines élevées)',
  endurance: 'endurance (glucides suffisants, récupération)',
  flexibility: 'souplesse et mobilité (alimentation équilibrée)',
};

function profileContext(p: Profile) {
  const age = p.birthDate ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 86400000)) : null;
  return [
    `Objectif : ${p.goal ? GOAL_LABELS[p.goal] : 'non précisé'}`,
    `Niveau sportif : ${p.fitnessLevel ?? 'non précisé'}`,
    `Sexe : ${p.sex ?? 'non précisé'}${age ? `, âge : ${age} ans` : ''}`,
    `Taille : ${p.heightCm ?? '?'} cm, poids : ${p.weightKg ?? '?'} kg, poids visé : ${p.targetWeightKg ?? '?'} kg`,
    `Séances par semaine : ${p.workoutsPerWeek ?? '?'}`,
    `Matériel disponible : ${p.equipment.length ? p.equipment.join(', ') : 'non précisé'}`,
    `Préférences alimentaires : ${p.dietPreferences.length ? p.dietPreferences.join(', ') : 'aucune'}`,
    `Objectifs journaliers : ${p.targetKcal ?? '?'} kcal, ${p.targetProteinG ?? '?'} g protéines, ${p.targetCarbsG ?? '?'} g glucides, ${p.targetFatG ?? '?'} g lipides`,
  ].join('\n');
}

const round1 = (n: number) => Math.round(Number(n) * 10) / 10;
const uid = (prefix: string, i: number) => `${prefix}${Date.now()}${i}`;

// ---------------------------------------------------------------------------
// Scan d'un plat
// ---------------------------------------------------------------------------

export async function scanMeal(imageBase64: string, hint?: string): Promise<ScanResult> {
  const schema = O({
    is_food: B,
    name: S,
    items: A(O({ name: S, estimated_grams: N, calories: N })),
    calories: N,
    protein_g: N,
    carbs_g: N,
    fat_g: N,
    fiber_g: N,
    confidence: E(['low', 'medium', 'high']),
    notes: S,
  });

  const r: any = await generateJson({
    effort: 'low',
    schema,
    imageBase64,
    system: `Tu es un nutritionniste expert en estimation visuelle des portions.
On te montre la photo d'un plat. Identifie chaque aliment visible, estime son poids en grammes
(en te servant de l'assiette, des couverts et des proportions comme repères), puis calcule
les calories et macronutriments de l'ensemble à partir de valeurs nutritionnelles de référence (type Ciqual/USDA).
Tiens compte des matières grasses de cuisson et des sauces visibles.
Réponds en français. "name" est un nom de plat court et appétissant.
"notes" : une phrase utile (ex: hypothèse faite sur la sauce), ou une chaîne vide.
Si l'image ne montre pas de nourriture, mets is_food à false, les valeurs à 0 et explique dans notes.`,
    prompt: hint ? `Précision de l'utilisateur : ${hint}` : 'Analyse ce plat.',
  });

  return {
    isFood: !!r.is_food,
    name: r.name,
    items: (r.items ?? []).map((i: any) => ({ name: i.name, grams: Math.round(i.estimated_grams), calories: Math.round(i.calories) })),
    calories: Math.round(r.calories),
    proteinG: round1(r.protein_g),
    carbsG: round1(r.carbs_g),
    fatG: round1(r.fat_g),
    fiberG: round1(r.fiber_g),
    confidence: r.confidence,
    notes: r.notes ?? '',
  };
}

// ---------------------------------------------------------------------------
// Scan du frigo → ingrédients ajoutés à la liste du frigo
// ---------------------------------------------------------------------------

export async function scanFridge(imageBase64: string): Promise<{ detected: string[]; items: FridgeItem[] }> {
  const r: any = await generateJson({
    effort: 'low',
    schema: O({ ingredients: A(S) }),
    imageBase64,
    system:
      "Tu identifies les aliments et ingrédients visibles sur une photo de frigo, de placard ou de courses. " +
      'Liste chaque ingrédient utilisable en cuisine, au singulier, en français, en minuscules, sans quantité ' +
      '(ex: "poulet", "épinards", "yaourt grec"). Ignore ce qui n\'est pas comestible. Pas de doublons.',
    prompt: 'Quels ingrédients vois-tu ?',
  });
  const detected = [...new Set<string>((r.ingredients ?? []).map((s: string) => s.trim().toLowerCase()).filter(Boolean))].slice(0, 40);
  const { items } = detected.length ? await api.addFridge(detected) : await api.fridge();
  return { detected, items };
}

// ---------------------------------------------------------------------------
// Suggestions de repas
// ---------------------------------------------------------------------------

export async function suggestMeals(opts: { filters: string[]; mealType?: MealType; onlyFridge?: boolean }) {
  const [dash, fridgeRes] = await Promise.all([api.dashboard(localDate()), api.fridge()]);
  const t = dash.totals;
  const fridge = fridgeRes.items.map((i) => i.name);

  const ingredient = O({ name: S, quantity: S, in_fridge: B });
  const meal = O({
    title: S,
    description: S,
    meal_type: E(MEAL_TYPES),
    prep_minutes: I,
    calories: N,
    protein_g: N,
    carbs_g: N,
    fat_g: N,
    tags: A(S),
    ingredients: A(ingredient),
    steps: A(S),
    why: S,
  });

  const prompt = [
    profileContext(dash.user.profile),
    `Déjà consommé aujourd'hui : ${t.calories} kcal, ${Math.round(t.proteinG)} g protéines, ${Math.round(t.carbsG)} g glucides, ${Math.round(t.fatG)} g lipides.`,
    `Ingrédients dans le frigo : ${fridge.length ? fridge.join(', ') : 'aucun renseigné'}`,
    opts.onlyFridge ? "N'utilise QUE les ingrédients du frigo (plus les basiques)." : '',
    opts.mealType ? `Type de repas souhaité : ${opts.mealType}` : `Heure actuelle chez l'utilisateur : ${localTime()}`,
    opts.filters.length ? `Critères demandés : ${opts.filters.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const r: any = await generateJson({
    effort: 'medium',
    schema: O({ meals: A(meal), coach_note: S }),
    system: `Tu es un coach en nutrition sportive. Tu proposes des recettes réalistes, savoureuses et faciles à cuisiner à la maison,
adaptées à l'objectif de l'utilisateur et à ce qu'il lui reste à manger aujourd'hui.
Règles :
- Propose exactement 4 recettes différentes, classées de la plus adaptée à la moins adaptée.
- Valeurs nutritionnelles par portion, calculées à partir des quantités d'ingrédients indiquées.
- Utilise en priorité les ingrédients du frigo ; marque in_fridge=true pour ceux qui y sont.
  Les basiques (sel, poivre, huile, épices) sont supposés disponibles.
- Respecte strictement les préférences alimentaires.
- "tags" : 1 à 3 étiquettes courtes en français (ex: "Riche en protéines", "Rapide", "Récupération").
- "why" : une phrase qui explique pourquoi ce plat aide l'utilisateur aujourd'hui (chiffres à l'appui).
- "coach_note" : une phrase de conseil pour la journée.
- Tout en français.`,
    prompt,
  });

  const meals: MealSuggestion[] = (r.meals ?? []).map((m: any, i: number) => ({
    id: uid('m', i),
    title: m.title,
    description: m.description,
    mealType: MEAL_TYPES.includes(m.meal_type) ? m.meal_type : 'snack',
    prepMinutes: Math.round(m.prep_minutes),
    calories: Math.round(m.calories),
    proteinG: Math.round(m.protein_g),
    carbsG: Math.round(m.carbs_g),
    fatG: Math.round(m.fat_g),
    tags: m.tags ?? [],
    ingredients: (m.ingredients ?? []).map((x: any) => ({ name: x.name, quantity: x.quantity, inFridge: !!x.in_fridge })),
    steps: m.steps ?? [],
    why: m.why ?? '',
  }));
  return { meals, coachNote: (r.coach_note as string) ?? '', user: dash.user as User };
}

// ---------------------------------------------------------------------------
// Suggestions d'entraînements
// ---------------------------------------------------------------------------

export async function suggestWorkouts(opts: { location?: WorkoutCategory; durationMin?: number; focus?: string; count?: number }) {
  const count = opts.count ?? 3;
  const [{ user }, { sessions }] = await Promise.all([api.me(), api.sessions(7)]);
  const recent = sessions.map((s) => `${s.startedAt.slice(0, 10)} : ${s.title}`);

  const exercise = O({ name: S, sets: I, reps: S, rest_seconds: I, instructions: S });
  const workout = O({
    title: S,
    category: E(['gym', 'outdoors', 'home']),
    type: E(['strength', 'cardio', 'hiit', 'mobility']),
    duration_min: I,
    intensity: E(['low', 'moderate', 'intense']),
    estimated_kcal: I,
    muscle_groups: A(S),
    description: S,
    exercises: A(exercise),
  });

  const prompt = [
    profileContext(user.profile),
    `Séances des 7 derniers jours : ${recent.length ? recent.join(' ; ') : 'aucune'}`,
    opts.location ? `Lieu souhaité : ${opts.location}` : '',
    opts.durationMin ? `Durée souhaitée : ${opts.durationMin} min` : '',
    opts.focus ? `Demande particulière : ${opts.focus}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const r: any = await generateJson({
    effort: 'medium',
    schema: O({ workouts: A(workout) }),
    system: `Tu es un préparateur physique diplômé. Tu crées des séances d'entraînement sûres, structurées
(échauffement → corps de séance → retour au calme) et adaptées au niveau, à l'objectif et au matériel de l'utilisateur.
Règles :
- Propose exactement ${count} séances différentes.
- "reps" peut être un nombre de répétitions ("10-12") ou une durée ("40 s", "5 min").
- "instructions" : 1 à 2 phrases sur l'exécution et la sécurité.
- Le titre est court et motivant, en majuscules (ex: "POWER ASCENT").
- Évite de solliciter fortement les mêmes muscles que les séances des dernières 48 h.
- "estimated_kcal" : estimation réaliste pour le poids de l'utilisateur.
- Tout en français.`,
    prompt,
  });

  const workouts: Workout[] = (r.workouts ?? []).map((w: any, i: number) => ({
    id: uid('ai', i),
    title: w.title,
    category: w.category,
    type: w.type,
    durationMin: Math.round(w.duration_min),
    intensity: w.intensity,
    estimatedKcal: Math.round(w.estimated_kcal),
    muscleGroups: w.muscle_groups ?? [],
    description: w.description ?? '',
    exercises: (w.exercises ?? []).map((e: any) => ({
      name: e.name,
      sets: Math.max(1, Math.round(e.sets)),
      reps: e.reps,
      restSeconds: Math.max(0, Math.round(e.rest_seconds)),
      instructions: e.instructions ?? '',
    })),
  }));
  return workouts;
}

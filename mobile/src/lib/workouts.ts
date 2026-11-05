// Routines intégrées : la bibliothèque n'est jamais vide, même avant le premier appel à l'IA.
import type { Workout } from './types';

export const BUILT_IN_WORKOUTS: Workout[] = [
  {
    id: 'builtin-metabolic-fire',
    builtIn: true,
    title: 'METABOLIC FIRE',
    category: 'outdoors',
    type: 'hiit',
    durationMin: 45,
    intensity: 'intense',
    estimatedKcal: 620,
    muscleGroups: ['Corps entier', 'Cardio'],
    description: 'Circuit HIIT en extérieur pour faire grimper la dépense calorique.',
    exercises: [
      { name: 'Footing d’échauffement', sets: 1, reps: '5 min', restSeconds: 30, instructions: 'Allure facile, respiration nasale.' },
      { name: 'Burpees', sets: 4, reps: '40 s', restSeconds: 20, instructions: 'Poitrine au sol, saut explosif, gainage constant.' },
      { name: 'Sprints 30 m', sets: 6, reps: '1 sprint', restSeconds: 45, instructions: 'Départ dynamique, retour en marchant.' },
      { name: 'Fentes sautées', sets: 4, reps: '30 s', restSeconds: 20, instructions: 'Genou avant au-dessus de la cheville, réception douce.' },
      { name: 'Mountain climbers', sets: 4, reps: '40 s', restSeconds: 20, instructions: 'Hanches basses, genoux vers la poitrine.' },
      { name: 'Retour au calme', sets: 1, reps: '5 min', restSeconds: 0, instructions: 'Marche puis étirements des jambes.' },
    ],
  },
  {
    id: 'builtin-power-ascent',
    builtIn: true,
    title: 'POWER ASCENT',
    category: 'gym',
    type: 'strength',
    durationMin: 35,
    intensity: 'moderate',
    estimatedKcal: 280,
    muscleGroups: ['Pectoraux', 'Épaules', 'Triceps'],
    description: 'Séance « push » en salle orientée hypertrophie.',
    exercises: [
      { name: 'Développé couché', sets: 4, reps: '8-10', restSeconds: 90, instructions: 'Omoplates serrées, barre au niveau des pectoraux.' },
      { name: 'Développé militaire haltères', sets: 3, reps: '10-12', restSeconds: 75, instructions: 'Gainage fort, ne cambre pas le dos.' },
      { name: 'Écarté poulie', sets: 3, reps: '12-15', restSeconds: 60, instructions: 'Coudes légèrement fléchis, contraction en fin de mouvement.' },
      { name: 'Élévations latérales', sets: 3, reps: '15', restSeconds: 45, instructions: 'Montée jusqu’à l’horizontale, sans élan.' },
      { name: 'Dips', sets: 3, reps: '8-12', restSeconds: 75, instructions: 'Buste droit pour cibler les triceps.' },
    ],
  },
  {
    id: 'builtin-urban-sprint',
    builtIn: true,
    title: 'URBAN SPRINT',
    category: 'outdoors',
    type: 'cardio',
    durationMin: 20,
    intensity: 'intense',
    estimatedKcal: 260,
    muscleGroups: ['Jambes', 'Cardio'],
    description: 'Fractionné court pour développer la VMA.',
    exercises: [
      { name: 'Échauffement progressif', sets: 1, reps: '5 min', restSeconds: 0, instructions: 'Footing puis gammes (talons-fesses, montées de genoux).' },
      { name: 'Fractionné 30/30', sets: 10, reps: '30 s vite', restSeconds: 30, instructions: 'Allure soutenue mais tenue jusqu’au bout.' },
      { name: 'Retour au calme', sets: 1, reps: '5 min', restSeconds: 0, instructions: 'Footing très lent puis marche.' },
    ],
  },
  {
    id: 'builtin-iron-core',
    builtIn: true,
    title: 'IRON CORE',
    category: 'home',
    type: 'strength',
    durationMin: 25,
    intensity: 'moderate',
    estimatedKcal: 180,
    muscleGroups: ['Abdominaux', 'Lombaires'],
    description: 'Gainage complet, sans matériel.',
    exercises: [
      { name: 'Planche', sets: 3, reps: '45 s', restSeconds: 30, instructions: 'Corps aligné, fessiers serrés.' },
      { name: 'Dead bug', sets: 3, reps: '12 par côté', restSeconds: 30, instructions: 'Bas du dos plaqué au sol.' },
      { name: 'Planche latérale', sets: 3, reps: '30 s par côté', restSeconds: 30, instructions: 'Hanches hautes, épaule au-dessus du coude.' },
      { name: 'Hollow hold', sets: 3, reps: '30 s', restSeconds: 30, instructions: 'Bras et jambes tendus, lombaires au sol.' },
      { name: 'Superman', sets: 3, reps: '15', restSeconds: 30, instructions: 'Montée contrôlée, regard vers le sol.' },
    ],
  },
  {
    id: 'builtin-flow-mobility',
    builtIn: true,
    title: 'FLOW MOBILITY',
    category: 'home',
    type: 'mobility',
    durationMin: 20,
    intensity: 'low',
    estimatedKcal: 90,
    muscleGroups: ['Hanches', 'Épaules', 'Dos'],
    description: 'Mobilité articulaire pour récupérer et gagner en souplesse.',
    exercises: [
      { name: 'Cat-cow', sets: 2, reps: '10', restSeconds: 15, instructions: 'Mouvement lent synchronisé avec la respiration.' },
      { name: 'World’s greatest stretch', sets: 2, reps: '5 par côté', restSeconds: 15, instructions: 'Fente profonde, rotation du buste vers le ciel.' },
      { name: '90/90 hanches', sets: 2, reps: '8 par côté', restSeconds: 15, instructions: 'Buste droit, rotation contrôlée.' },
      { name: 'Passage d’épaules au bâton', sets: 2, reps: '10', restSeconds: 15, instructions: 'Bras tendus, élargir la prise si besoin.' },
      { name: 'Posture de l’enfant', sets: 1, reps: '1 min', restSeconds: 0, instructions: 'Relâche le dos, respire profondément.' },
    ],
  },
];

export const CATEGORY_LABELS = { gym: 'Salle', outdoors: 'Extérieur', home: 'Maison' } as const;
export const TYPE_LABELS = { strength: 'Force', cardio: 'Cardio', hiit: 'HIIT', mobility: 'Mobilité' } as const;
export const INTENSITY_BARS = { low: 1, moderate: 2, intense: 3 } as const;

/** Routine du jour : tourne chaque jour parmi la liste donnée. */
export function dailyPick<T>(list: T[]): T | undefined {
  if (!list.length) return undefined;
  const day = Math.floor(Date.now() / 86400000);
  return list[day % list.length];
}

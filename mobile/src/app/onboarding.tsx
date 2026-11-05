import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { isHealthAvailable, readBodyBasics, saveWeightToHealth } from '../lib/health';
import { computeTargets } from '../lib/nutrition';
import type { ActivityLevel, FitnessLevel, Goal, Sex } from '../lib/types';
import { Avatar, Button, Card, Chip, ErrorText, Input, Label, Logo, ProgressBar, type IconName } from '../components/ui';
import { colors, fonts, radius, space, type } from '../lib/theme';

const STEP_NAMES = ['Ton corps', 'Objectifs', 'Métriques'];

const LEVELS: { key: FitnessLevel; title: string; desc: string; icon: IconName }[] = [
  { key: 'beginner', title: 'Débutant', desc: 'Nouveau dans l’entraînement régulier. Priorité à la technique et aux bases.', icon: 'lightning-bolt-outline' },
  { key: 'intermediate', title: 'Intermédiaire', desc: '6 à 12 mois d’entraînement. Prêt pour plus d’intensité.', icon: 'dumbbell' },
  { key: 'advanced', title: 'Avancé', desc: 'Athlète régulier. À la recherche de performance maximale.', icon: 'medal-outline' },
];

const GOALS: { key: Goal; label: string }[] = [
  { key: 'lose_weight', label: 'Perdre du poids' },
  { key: 'gain_muscle', label: 'Prendre du muscle' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'flexibility', label: 'Souplesse' },
];

const ACTIVITY: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary', label: 'Sédentaire' },
  { key: 'light', label: 'Peu actif' },
  { key: 'moderate', label: 'Actif' },
  { key: 'active', label: 'Très actif' },
  { key: 'very_active', label: 'Athlète' },
];

const EQUIPMENT = [
  { key: 'gym', label: 'Salle de sport' },
  { key: 'dumbbells', label: 'Haltères' },
  { key: 'bands', label: 'Élastiques' },
  { key: 'pullup_bar', label: 'Barre de traction' },
  { key: 'none', label: 'Aucun' },
];

const DIETS = [
  { key: 'vegetarian', label: 'Végétarien' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'pescatarian', label: 'Pescétarien' },
  { key: 'gluten_free', label: 'Sans gluten' },
  { key: 'lactose_free', label: 'Sans lactose' },
  { key: 'halal', label: 'Halal' },
];

const toggle = (list: string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

/** "JJ/MM/AAAA" → "AAAA-MM-JJ" */
function parseFrDate(s: string) {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return isNaN(new Date(iso).getTime()) ? null : iso;
}

export default function Onboarding() {
  const { user, setUser, logout } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthLinked, setHealthLinked] = useState(false);

  // Étape 1
  const [sex, setSex] = useState<Sex | null>(user?.profile.sex ?? null);
  const [birth, setBirth] = useState('');
  const [height, setHeight] = useState(user?.profile.heightCm ? String(user.profile.heightCm) : '');
  const [weight, setWeight] = useState(user?.profile.weightKg ? String(user.profile.weightKg) : '');
  // Étape 2
  const [name, setName] = useState(user?.name ?? '');
  const [level, setLevel] = useState<FitnessLevel>('beginner');
  const [goal, setGoal] = useState<Goal>('gain_muscle');
  // Étape 3
  const [targetWeight, setTargetWeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [perWeek, setPerWeek] = useState(3);
  const [equipment, setEquipment] = useState<string[]>(['gym']);
  const [diets, setDiets] = useState<string[]>([]);

  const heightNum = parseFloat(height.replace(',', '.'));
  const weightNum = parseFloat(weight.replace(',', '.'));
  const birthIso = parseFrDate(birth);

  const targets = useMemo(() => {
    if (!heightNum || !weightNum) return null;
    return computeTargets({ sex, birthDate: birthIso, heightCm: heightNum, weightKg: weightNum, activityLevel: activity, goal });
  }, [sex, birthIso, heightNum, weightNum, activity, goal]);

  const linkHealth = async () => {
    setHealthLoading(true);
    try {
      const b = await readBodyBasics();
      if (!b) {
        setError("L'app Santé n'est pas disponible sur cet appareil.");
        return;
      }
      setHealthLinked(true);
      if (b.sex) setSex(b.sex);
      if (b.birthDate) {
        const [y, m, d] = b.birthDate.split('-');
        setBirth(`${d}/${m}/${y}`);
      }
      if (b.heightCm) setHeight(String(b.heightCm));
      if (b.weightKg) setWeight(String(b.weightKg));
    } finally {
      setHealthLoading(false);
    }
  };

  const next = async () => {
    setError(null);
    if (step === 0) {
      if (!sex) return setError('Sélectionne ton sexe (utilisé pour le calcul du métabolisme).');
      if (birth && !birthIso) return setError('Date de naissance au format JJ/MM/AAAA.');
      if (!(heightNum >= 100 && heightNum <= 250)) return setError('Taille invalide (en cm).');
      if (!(weightNum >= 30 && weightNum <= 300)) return setError('Poids invalide (en kg).');
      return setStep(1);
    }
    if (step === 1) {
      if (!name.trim()) return setError('Indique ton nom.');
      return setStep(2);
    }
    // Fin : enregistrement du profil
    if (!targets) return;
    const tw = parseFloat(targetWeight.replace(',', '.'));
    setSaving(true);
    try {
      const { user: updated } = await api.updateProfile({
        name: name.trim(),
        sex,
        birthDate: birthIso,
        heightCm: heightNum,
        weightKg: weightNum,
        targetWeightKg: tw > 0 ? tw : null,
        fitnessLevel: level,
        goal,
        activityLevel: activity,
        workoutsPerWeek: perWeek,
        equipment,
        dietPreferences: diets,
        ...targets,
        onboarded: true,
      });
      if (healthLinked) saveWeightToHealth(weightNum).catch(() => {});
      setUser(updated);
    } catch (e: any) {
      setError(e?.message ?? 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.topBar}>
        <Logo />
        <Pressable onLongPress={logout}>
          <Avatar name={name || user?.name} />
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Label color={colors.lime}>Étape {step + 1} sur 3</Label>
              <Label>{STEP_NAMES[step]}</Label>
            </View>
            <ProgressBar progress={(step + 1) / 3} height={4} />
          </View>

          {step === 0 && (
            <>
              <Title first="CONNAIS" accent="TON CORPS" />
              {isHealthAvailable() && (
                <Card active={healthLinked} style={styles.row}>
                  <MaterialCommunityIcons name="heart-pulse" size={32} color={colors.lime} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.cardTitle}>APP SANTÉ</Text>
                    <Text style={styles.cardDesc}>
                      {healthLinked ? 'Connectée — données importées.' : 'Importe ta taille, ton poids et ton âge, et synchronise tes repas et séances.'}
                    </Text>
                  </View>
                  {!healthLinked && <Button title="Lier" onPress={linkHealth} loading={healthLoading} style={{ minHeight: 44 }} />}
                </Card>
              )}
              <View style={{ gap: space.sm }}>
                <Label>Sexe</Label>
                <View style={styles.wrap}>
                  <Chip label="Homme" active={sex === 'male'} onPress={() => setSex('male')} />
                  <Chip label="Femme" active={sex === 'female'} onPress={() => setSex('female')} />
                  <Chip label="Autre" active={sex === 'other'} onPress={() => setSex('other')} />
                </View>
              </View>
              <Input label="Date de naissance" value={birth} onChangeText={setBirth} placeholder="JJ/MM/AAAA" keyboardType="numbers-and-punctuation" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="Taille" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="178" suffix="cm" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Poids" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="75" suffix="kg" />
                </View>
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Title first="DÉFINIS TON" accent="HÉRITAGE" />
              <Input label="Nom complet" value={name} onChangeText={setName} placeholder="CHRIS MILLER" autoCapitalize="words" />
              <View style={{ gap: space.md }}>
                <Label>Niveau sportif</Label>
                {LEVELS.map((l) => {
                  const active = level === l.key;
                  return (
                    <Pressable key={l.key} onPress={() => setLevel(l.key)} style={[styles.levelCard, active && styles.levelActive]}>
                      <MaterialCommunityIcons name={l.icon} size={26} color={active ? colors.lime : colors.textMuted} />
                      <Text style={[styles.cardTitle, active && { color: colors.lime }]}>{l.title.toUpperCase()}</Text>
                      <Text style={styles.cardDesc}>{l.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ gap: space.md }}>
                <Label>Objectif principal</Label>
                <View style={styles.wrap}>
                  {GOALS.map((g) => (
                    <Chip key={g.key} label={g.label} active={goal === g.key} onPress={() => setGoal(g.key)} />
                  ))}
                </View>
              </View>
              <Card style={styles.row}>
                <View style={styles.aiIcon}>
                  <MaterialCommunityIcons name="head-cog-outline" size={26} color={colors.lime} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.cardTitle}>PLAN ADAPTATIF IA</Text>
                  <Text style={styles.cardDesc}>
                    Notre IA construit ton parcours sur mesure pour l’objectif « {GOALS.find((g) => g.key === goal)?.label} ».
                  </Text>
                </View>
              </Card>
            </>
          )}

          {step === 2 && (
            <>
              <Title first="TES" accent="MÉTRIQUES" />
              <Input label="Poids visé (optionnel)" value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" placeholder={weight || '70'} suffix="kg" />
              <View style={{ gap: space.sm }}>
                <Label>Activité quotidienne (hors sport)</Label>
                <View style={styles.wrap}>
                  {ACTIVITY.map((a) => (
                    <Chip key={a.key} label={a.label} active={activity === a.key} onPress={() => setActivity(a.key)} />
                  ))}
                </View>
              </View>
              <View style={{ gap: space.sm }}>
                <Label>Séances par semaine</Label>
                <View style={styles.wrap}>
                  {[2, 3, 4, 5, 6].map((n) => (
                    <Chip key={n} label={String(n)} active={perWeek === n} onPress={() => setPerWeek(n)} />
                  ))}
                </View>
              </View>
              <View style={{ gap: space.sm }}>
                <Label>Matériel disponible</Label>
                <View style={styles.wrap}>
                  {EQUIPMENT.map((e) => (
                    <Chip key={e.key} label={e.label} active={equipment.includes(e.key)} onPress={() => setEquipment(toggle(equipment, e.key))} />
                  ))}
                </View>
              </View>
              <View style={{ gap: space.sm }}>
                <Label>Régime alimentaire</Label>
                <View style={styles.wrap}>
                  {DIETS.map((d) => (
                    <Chip key={d.key} label={d.label} active={diets.includes(d.key)} onPress={() => setDiets(toggle(diets, d.key))} />
                  ))}
                </View>
              </View>
              {targets && (
                <Card active style={{ gap: space.md }}>
                  <Label color={colors.lime}>Tes objectifs journaliers</Label>
                  <Text style={[type.stat, { color: colors.text }]}>
                    {targets.targetKcal}
                    <Text style={[type.bodyMd, { color: colors.textMuted }]}> kcal</Text>
                  </Text>
                  <View style={styles.row}>
                    <Macro label="Protéines" value={targets.targetProteinG} />
                    <Macro label="Glucides" value={targets.targetCarbsG} />
                    <Macro label="Lipides" value={targets.targetFatG} />
                  </View>
                  <Text style={styles.cardDesc}>Calculés avec la formule de Mifflin-St Jeor. Modifiables plus tard dans ton profil.</Text>
                </Card>
              )}
            </>
          )}

          <ErrorText message={error} />

          <View style={{ gap: space.sm }}>
            <Button
              title={step === 0 ? 'Continuer vers les objectifs' : step === 1 ? 'Continuer vers les métriques' : 'Lancer mon plan'}
              icon="arrow-right"
              onPress={next}
              loading={saving}
            />
            {step > 0 && (
              <Pressable onPress={() => setStep(step - 1)} style={{ alignItems: 'center', padding: space.md }}>
                <Text style={[type.label, { color: colors.textMuted }]}>Retour à l’étape {step}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Title({ first, accent }: { first: string; accent: string }) {
  return (
    <Text style={[type.displayXl, { color: colors.text, fontSize: 44 }]}>
      {first}
      {'\n'}
      <Text style={styles.accent}>{accent}</Text>
    </Text>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: colors.lime }}>{value} g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.margin,
    paddingVertical: space.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  content: { padding: space.margin, gap: space.lg, paddingBottom: 60 },
  accent: { color: colors.lime, fontFamily: fonts.displayXBold, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  levelCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    padding: space.lg,
    gap: space.sm,
  },
  levelActive: { borderColor: colors.lime },
  cardTitle: { fontFamily: fonts.displaySemi, fontSize: 16, letterSpacing: 1, color: colors.text },
  cardDesc: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  aiIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md + 4,
    backgroundColor: '#1F2608',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

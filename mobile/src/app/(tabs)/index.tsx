import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { suggestMeals } from '../../lib/ai/features';
import { aiErrorMessage, ensureAi } from '../../lib/ai/guard';
import { PROVIDERS, useAiSettings } from '../../lib/ai/settings';
import { localDate } from '../../lib/dates';
import { readTodayHealth, type TodayHealth } from '../../lib/health';
import { memoryStore } from '../../lib/store';
import { BUILT_IN_WORKOUTS, CATEGORY_LABELS, TYPE_LABELS, dailyPick } from '../../lib/workouts';
import type { Dashboard, MealSuggestion, Workout } from '../../lib/types';
import { Button, Card, ErrorText, Label, MediaPlaceholder, ProgressRing, PulseDot, Screen, SectionHeader } from '../../components/ui';
import { colors, fonts, radius, space, type } from '../../lib/theme';

function heartZone(bpm: number, age = 30) {
  const pct = bpm / (220 - age);
  if (pct < 0.6) return 'Zone 1 • Repos';
  if (pct < 0.7) return 'Zone 2 • Endurance';
  if (pct < 0.8) return 'Zone 3 • Aérobie';
  if (pct < 0.9) return 'Zone 4 • Seuil';
  return 'Zone 5 • Maximum';
}

export default function Home() {
  const { setUser } = useAuth();
  const ai = useAiSettings();
  const [data, setData] = useState<Dashboard | null>(null);
  const [health, setHealth] = useState<TodayHealth | null>(null);
  const [nextMeal, setNextMeal] = useState<MealSuggestion | null>(null);
  const [mealLoading, setMealLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [d, h] = await Promise.all([api.dashboard(localDate()), readTodayHealth()]);
      setData(d);
      setUser(d.user);
      setHealth(h);
    } catch (e: any) {
      setError(e?.message ?? 'Chargement impossible.');
    }
  }, [setUser]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const suggestNextMeal = async () => {
    if (!ensureAi()) return;
    setMealLoading(true);
    try {
      const res = await suggestMeals({ filters: ['Rapide'] });
      memoryStore.putMeals(res.meals);
      setNextMeal(res.meals[0] ?? null);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setMealLoading(false);
    }
  };

  const p = data?.user.profile;
  const target = p?.targetKcal ?? 2000;
  const eaten = data?.totals.calories ?? 0;
  const current: Workout | undefined = data?.latestWorkout ?? dailyPick(BUILT_IN_WORKOUTS);
  const drills = BUILT_IN_WORKOUTS.filter((w) => w.id !== current?.id);
  const maxBpm = Math.max(1, ...(health?.hourlyHeartRate ?? [1]));

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.lime} />}>
      <ErrorText message={error} />

      {/* IA non configurée */}
      {!ai && (
        <Card active onPress={() => router.push('/ai-settings')} style={{ gap: space.sm }}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="creation" size={22} color={colors.lime} />
            <Label color={colors.lime}>Active ton IA</Label>
          </View>
          <Text style={[type.bodyMd, { color: colors.text }]}>
            Connecte ta clé {Object.values(PROVIDERS).map((p) => p.name).join(', ')} pour scanner tes plats et recevoir tes repas et séances sur mesure.
          </Text>
        </Card>
      )}

      {/* Séance en cours */}
      {current && (
        <Pressable onPress={() => { memoryStore.putWorkouts([current]); router.push(`/workout/${current.id}`); }}>
          <LinearGradient colors={['#2A3510', '#0B0D05']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.hero}>
            <MaterialCommunityIcons name="weight-lifter" size={150} color="rgba(195,244,0,0.12)" style={styles.heroIcon} />
            <View style={styles.row}>
              <PulseDot />
              <Label color={colors.lime}>Séance du moment</Label>
            </View>
            <Text style={[type.headlineLg, { color: colors.text }]}>{current.title}</Text>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={[type.bodyMd, { color: colors.textMuted, flex: 1 }]}>
                {current.muscleGroups.slice(0, 3).join(', ')} • {current.durationMin} min
              </Text>
              <Button
                title="Démarrer"
                onPress={() => { memoryStore.putWorkouts([current]); router.push({ pathname: '/workout/player', params: { id: current.id } }); }}
                style={{ minHeight: 44, borderRadius: radius.full }}
              />
            </View>
          </LinearGradient>
        </Pressable>
      )}

      {/* Calories */}
      <Card onPress={() => router.push('/journal')}>
        <View style={[styles.row, { alignItems: 'flex-start' }]}>
          <View style={{ flex: 1, gap: space.md }}>
            <Label>Calories du jour</Label>
            <Text style={styles.bigStat}>
              {eaten.toLocaleString('fr-FR')}
              <Text style={styles.bigStatSub}> / {target.toLocaleString('fr-FR')}{'\n'}kcal</Text>
            </Text>
            <View style={[styles.row, { gap: space.lg }]}>
              <MacroMini label="Protéines" value={data?.totals.proteinG ?? 0} target={p?.targetProteinG} highlight />
              <MacroMini label="Glucides" value={data?.totals.carbsG ?? 0} target={p?.targetCarbsG} />
              <MacroMini label="Lipides" value={data?.totals.fatG ?? 0} target={p?.targetFatG} />
            </View>
          </View>
          <ProgressRing progress={eaten / target} size={112}>
            <MaterialCommunityIcons name="fire" size={30} color={colors.lime} />
          </ProgressRing>
        </View>
        {health && (
          <View style={styles.healthRow}>
            <HealthStat icon="walk" value={health.steps.toLocaleString('fr-FR')} label="pas" />
            <HealthStat icon="lightning-bolt" value={String(health.activeKcal)} label="kcal brûlées" />
            <HealthStat icon="timer-outline" value={String(data?.training.minutes ?? 0)} label="min de sport" />
          </View>
        )}
      </Card>

      {/* Fréquence cardiaque (Apple Santé) */}
      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Label>Fréquence cardiaque</Label>
          <MaterialCommunityIcons name="heart-pulse" size={22} color="#FF8A80" />
        </View>
        {health?.heartRate ? (
          <>
            <View style={{ marginVertical: space.md }}>
              <Text style={styles.bigStat}>{health.heartRate}<Text style={styles.bigStatSub}> BPM</Text></Text>
              <Text style={[type.bodySm, { color: colors.textMuted }]}>
                {heartZone(health.heartRate)}
                {health.restingHeartRate ? ` • Repos ${health.restingHeartRate}` : ''}
              </Text>
            </View>
            <View style={styles.bars}>
              {health.hourlyHeartRate.map((v, i) => (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    { height: 12 + (v / maxBpm) * 40, backgroundColor: v >= maxBpm * 0.85 ? colors.lime : v ? '#5A6A1A' : colors.cardHigh },
                  ]}
                />
              ))}
            </View>
            <Text style={[type.bodySm, { color: colors.textDim, marginTop: space.sm }]}>Moyennes horaires sur les 6 dernières heures</Text>
          </>
        ) : (
          <Text style={[type.bodyMd, { color: colors.textMuted, marginTop: space.md }]}>
            Aucune mesure aujourd'hui. Porte ton Apple Watch ou autorise l'accès à Santé dans Réglages › Santé › Accès aux données.
          </Text>
        )}
      </Card>

      {/* Prochain repas */}
      <Card style={{ padding: 0 }} onPress={nextMeal ? () => router.push(`/meal/${nextMeal.id}`) : undefined}>
        <MediaPlaceholder icon="food-drumstick-outline" height={150} label={nextMeal ? nextMeal.mealType === 'breakfast' ? 'Petit-déj' : nextMeal.mealType === 'lunch' ? 'Déjeuner' : nextMeal.mealType === 'dinner' ? 'Dîner' : 'Collation' : 'IA'} />
        <View style={{ padding: space.lg, gap: space.sm }}>
          <Label color={colors.lime}>Prochain carburant</Label>
          {nextMeal ? (
            <>
              <Text style={[type.headlineMd, { color: colors.text }]}>{nextMeal.title}</Text>
              <View style={[styles.row, { gap: space.lg }]}>
                <Meta icon="clock-outline" text={`${nextMeal.prepMinutes} min`} />
                <Meta icon="lightning-bolt-outline" text={`${nextMeal.calories} kcal`} />
                <Meta icon="food-steak" text={`${nextMeal.proteinG} g prot.`} />
              </View>
            </>
          ) : (
            <>
              <Text style={[type.bodyMd, { color: colors.textMuted }]}>
                L'IA te propose le repas idéal selon ce qu'il te reste à manger aujourd'hui et le contenu de ton frigo.
              </Text>
              <Button title="Suggérer mon repas" icon="creation" variant="secondary" onPress={suggestNextMeal} loading={mealLoading} />
            </>
          )}
        </View>
      </Card>

      {/* Scan rapide */}
      <Pressable onPress={() => router.navigate('/scan')} style={({ pressed }) => [styles.quickScan, pressed && { opacity: 0.9 }]}>
        <View style={styles.quickScanIcon}>
          <MaterialCommunityIcons name="barcode-scan" size={30} color={colors.lime} />
        </View>
        <Text style={[type.label, { color: colors.onLime, fontSize: 16 }]}>Scan rapide</Text>
        <Text style={[type.labelSm, { color: '#3C4D00' }]}>Enregistrer un repas</Text>
      </Pressable>

      {/* Entraînements recommandés */}
      <SectionHeader title="Entraînements" action="Tout voir" onAction={() => router.navigate('/library')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }} style={{ marginHorizontal: -space.margin }}>
        <View style={{ width: space.margin - space.md }} />
        {drills.map((w) => (
          <Card key={w.id} style={styles.drill} onPress={() => { memoryStore.putWorkouts([w]); router.push(`/workout/${w.id}`); }}>
            <View style={styles.drillMedia}>
              <MaterialCommunityIcons name={w.type === 'cardio' ? 'run-fast' : w.type === 'mobility' ? 'yoga' : w.type === 'hiit' ? 'fire' : 'kettlebell'} size={56} color={colors.lime} />
              <View style={styles.drillBadge}>
                <Text style={[type.labelSm, { color: colors.text }]}>{w.durationMin} min</Text>
              </View>
            </View>
            <View style={{ padding: space.md, gap: 4 }}>
              <Text style={[type.labelSm, { color: colors.textMuted }]}>{CATEGORY_LABELS[w.category]} • {TYPE_LABELS[w.type]}</Text>
              <Text style={{ fontFamily: fonts.bodySemi, color: colors.text, fontSize: 15 }} numberOfLines={1}>{w.title}</Text>
            </View>
          </Card>
        ))}
        <View style={{ width: space.margin - space.md }} />
      </ScrollView>
    </Screen>
  );
}

function MacroMini({ label, value, target, highlight }: { label: string; value: number; target?: number | null; highlight?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[type.bodySm, { color: colors.textMuted }]}>{label}</Text>
      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18, color: highlight ? colors.lime : colors.text }}>
        {Math.round(value)}g
      </Text>
      {target ? <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDim }}>/ {target}g</Text> : null}
    </View>
  );
}

function HealthStat({ icon, value, label }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.lime} />
      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 16, color: colors.text }}>{value}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDim }}>{label}</Text>
    </View>
  );
}

function Meta({ icon, text }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; text: string }) {
  return (
    <View style={[styles.row, { gap: 4 }]}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.textMuted} />
      <Text style={[type.bodySm, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  hero: { borderRadius: radius.card, padding: space.lg, gap: space.sm, minHeight: 220, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  heroIcon: { position: 'absolute', right: -10, top: -10 },
  bigStat: { fontFamily: fonts.displayBold, fontSize: 40, color: colors.text, lineHeight: 46 },
  bigStatSub: { fontFamily: fonts.body, fontSize: 16, color: colors.textMuted },
  healthRow: { flexDirection: 'row', marginTop: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 56, backgroundColor: '#141414', borderRadius: radius.md, padding: 6 },
  bar: { flex: 1, borderRadius: 4 },
  quickScan: { backgroundColor: colors.lime, borderRadius: radius.card, padding: space.lg, alignItems: 'center', gap: space.sm },
  quickScanIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1F2608', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  drill: { width: 190, padding: 0 },
  drillMedia: { height: 110, backgroundColor: '#0F1208', alignItems: 'center', justifyContent: 'center' },
  drillBadge: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
});

import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';
import { localDateTime } from '../../lib/dates';
import { saveWorkoutToHealth } from '../../lib/health';
import { memoryStore } from '../../lib/store';
import { Button, Label, ProgressBar, PulseDot } from '../../components/ui';
import { colors, fonts, radius, space, type } from '../../lib/theme';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Player() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = memoryStore.getWorkout(id);
  const startedAt = useRef(new Date()).current;

  const [exIndex, setExIndex] = useState(0);
  const [setNum, setSetNum] = useState(1);
  const [rest, setRest] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
      setRest((r) => {
        if (r === 1) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return r > 0 ? r - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  if (!workout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: space.margin, gap: space.lg, justifyContent: 'center' }}>
        <Text style={[type.bodyMd, { color: colors.textMuted, textAlign: 'center' }]}>Séance introuvable.</Text>
        <Button title="Retour" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const ex = workout.exercises[exIndex];
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets, 0);
  const doneSets = workout.exercises.slice(0, exIndex).reduce((s, e) => s + e.sets, 0) + (setNum - 1);
  const isLastSet = exIndex === workout.exercises.length - 1 && setNum === ex.sets;

  const completeSet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (isLastSet) return finish();
    if (setNum < ex.sets) {
      setSetNum(setNum + 1);
    } else {
      setExIndex(exIndex + 1);
      setSetNum(1);
    }
    if (ex.restSeconds > 0) setRest(ex.restSeconds);
  };

  const finish = async () => {
    setFinishing(true);
    const end = new Date();
    const minutes = Math.max(1, Math.round((end.getTime() - startedAt.getTime()) / 60000));
    // Estimation proportionnelle au temps réellement passé, bornée
    const ratio = Math.min(1.5, Math.max(0.3, minutes / Math.max(1, workout.durationMin)));
    const kcal = Math.round(workout.estimatedKcal * ratio);
    try {
      await api.logSession({
        workoutRef: workout.id,
        title: workout.title,
        durationMin: minutes,
        calories: kcal,
        startedAt: localDateTime(startedAt),
        endedAt: localDateTime(end),
      });
      await saveWorkoutToHealth({ type: workout.type, start: startedAt, end, kcal });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Séance terminée 💪', `${minutes} min • ~${kcal} kcal. Enregistrée dans ton historique et dans Santé.`, [
        { text: 'OK', onPress: () => router.dismissAll() },
      ]);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Enregistrement impossible.');
      setFinishing(false);
    }
  };

  const quit = () =>
    Alert.alert('Arrêter la séance ?', 'Tu peux la terminer maintenant pour l’enregistrer, ou abandonner.', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Abandonner', style: 'destructive', onPress: () => router.back() },
      { text: 'Terminer', onPress: finish },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.top}>
        <Pressable onPress={quit} hitSlop={12} accessibilityLabel="Arrêter">
          <MaterialCommunityIcons name="close" size={28} color={colors.text} />
        </Pressable>
        <View style={styles.row}>
          <PulseDot />
          <Text style={[type.label, { color: colors.text }]}>{fmt(elapsed)}</Text>
        </View>
        <Text style={[type.label, { color: colors.textMuted }]}>{doneSets}/{totalSets}</Text>
      </View>
      <View style={{ paddingHorizontal: space.margin }}>
        <ProgressBar progress={doneSets / totalSets} height={4} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.margin, gap: space.lg, paddingBottom: 200 }}>
        <Label color={colors.lime}>{workout.title}</Label>

        <View style={styles.current}>
          <Label>Exercice {exIndex + 1} sur {workout.exercises.length}</Label>
          <Text style={[type.headlineLg, { color: colors.text }]}>{ex.name}</Text>
          <View style={[styles.row, { gap: space.xl }]}>
            <View>
              <Label>Série</Label>
              <Text style={styles.stat}>{setNum}<Text style={styles.statSub}>/{ex.sets}</Text></Text>
            </View>
            <View>
              <Label>Répétitions</Label>
              <Text style={styles.stat}>{ex.reps}</Text>
            </View>
          </View>
          <Text style={[type.bodyMd, { color: colors.textMuted }]}>{ex.instructions}</Text>
        </View>

        {workout.exercises[exIndex + 1] && (
          <View style={{ gap: space.sm }}>
            <Label>À suivre</Label>
            {workout.exercises.slice(exIndex + 1, exIndex + 3).map((n, i) => (
              <View key={i} style={styles.nextItem}>
                <Text style={[type.bodyMd, { color: colors.text, flex: 1 }]}>{n.name}</Text>
                <Text style={[type.bodySm, { color: colors.textMuted }]}>{n.sets} × {n.reps}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          title={isLastSet ? 'Terminer la séance' : 'Série terminée'}
          icon={isLastSet ? 'flag-checkered' : 'check'}
          onPress={completeSet}
          loading={finishing}
        />
      </View>

      {/* Minuteur de repos plein écran */}
      {rest > 0 && (
        <View style={styles.restOverlay}>
          <Label color={colors.lime}>Repos</Label>
          <Text style={styles.restTime}>{fmt(rest)}</Text>
          <Text style={[type.bodyMd, { color: colors.textMuted }]}>
            Ensuite : {ex.name} — série {setNum}/{ex.sets}
          </Text>
          <View style={[styles.row, { gap: space.md, marginTop: space.lg }]}>
            <Button title="+15 s" variant="secondary" onPress={() => setRest(rest + 15)} style={{ minWidth: 110 }} />
            <Button title="Passer" onPress={() => setRest(0)} style={{ minWidth: 110 }} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.margin },
  current: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.lime,
    padding: space.lg,
    gap: space.md,
  },
  stat: { fontFamily: fonts.displayBold, fontSize: 40, color: colors.lime },
  statSub: { fontFamily: fonts.displaySemi, fontSize: 20, color: colors.textDim },
  nextItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  bottom: { position: 'absolute', left: space.margin, right: space.margin, bottom: 40 },
  restOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.xl,
  },
  restTime: { fontFamily: fonts.displayXBold, fontSize: 112, color: colors.text, letterSpacing: -3 },
});

import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { memoryStore } from '../../lib/store';
import { CATEGORY_LABELS, TYPE_LABELS } from '../../lib/workouts';
import { Button, Card, Label, Screen, StatBox, Tag } from '../../components/ui';
import { colors, fonts, space, type } from '../../lib/theme';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState(() => memoryStore.getWorkout(id));
  const [saving, setSaving] = useState(false);

  if (!workout) {
    return (
      <Screen>
        <Text style={[type.bodyMd, { color: colors.textMuted }]}>Séance introuvable.</Text>
        <Button title="Retour" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  // Les séances générées par l'IA ont un id temporaire tant qu'elles ne sont pas enregistrées
  const isUnsaved = !workout.builtIn && !/^\d+$/.test(workout.id);
  const isSavedServer = /^\d+$/.test(workout.id);

  const save = async () => {
    setSaving(true);
    try {
      const { workout: w } = await api.saveWorkout(workout);
      memoryStore.putWorkouts([w]);
      setWorkout(w);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Supprimer la séance ?', workout.title, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await api.deleteWorkout(workout.id).catch(() => {});
          router.back();
        },
      },
    ]);
  };

  const totalSets = workout.exercises.reduce((s, e) => s + e.sets, 0);

  return (
    <Screen header={false}>
      <View style={[styles.row, { justifyContent: 'space-between', marginTop: space.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </Pressable>
        {isSavedServer && (
          <Pressable onPress={remove} hitSlop={12}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.textDim} />
          </Pressable>
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <Label color={colors.lime}>{CATEGORY_LABELS[workout.category]} • {TYPE_LABELS[workout.type]}</Label>
        <Text style={[type.headlineLg, { color: colors.text }]}>{workout.title}</Text>
        <Text style={[type.bodyMd, { color: colors.textMuted }]}>{workout.description}</Text>
        <View style={styles.wrap}>
          {workout.muscleGroups.map((m) => <Tag key={m} label={m} />)}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <StatBox label="Durée" value={workout.durationMin} unit="min" highlight />
        <StatBox label="Séries" value={totalSets} />
        <StatBox label="Kcal" value={workout.estimatedKcal} />
      </View>

      <View style={{ gap: space.md }}>
        {workout.exercises.map((e, i) => (
          <Card key={i} style={{ gap: space.sm, padding: space.md }}>
            <View style={styles.row}>
              <Text style={styles.num}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={[styles.exName, { flex: 1 }]}>{e.name}</Text>
            </View>
            <Text style={[type.label, { color: colors.lime }]}>
              {e.sets} × {e.reps}{e.restSeconds ? `  •  repos ${e.restSeconds} s` : ''}
            </Text>
            <Text style={[type.bodySm, { color: colors.textMuted }]}>{e.instructions}</Text>
          </Card>
        ))}
      </View>

      <Button title="Démarrer la séance" icon="play" onPress={() => router.push({ pathname: '/workout/player', params: { id: workout.id } })} />
      {isUnsaved && <Button title="Enregistrer dans ma bibliothèque" variant="secondary" icon="bookmark-plus-outline" onPress={save} loading={saving} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  num: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.textDim },
  exName: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.text },
});

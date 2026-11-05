import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { suggestWorkouts } from '../../lib/ai/features';
import { aiErrorMessage, ensureAi } from '../../lib/ai/guard';
import { memoryStore } from '../../lib/store';
import { BUILT_IN_WORKOUTS, CATEGORY_LABELS, INTENSITY_BARS, TYPE_LABELS, dailyPick } from '../../lib/workouts';
import type { Workout, WorkoutCategory } from '../../lib/types';
import { Button, Chip, ErrorText, Input, Label, PulseDot, Screen, type IconName } from '../../components/ui';
import { colors, fonts, radius, space, type } from '../../lib/theme';

type Filter = 'all' | WorkoutCategory | 'fav';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'gym', label: 'Salle' },
  { key: 'outdoors', label: 'Extérieur' },
  { key: 'home', label: 'Maison' },
  { key: 'fav', label: 'Favoris' },
];

const typeIcon = (w: Workout): IconName =>
  w.type === 'cardio' ? 'run-fast' : w.type === 'mobility' ? 'yoga' : w.type === 'hiit' ? 'fire' : w.category === 'home' ? 'kettlebell' : 'dumbbell';

export default function Library() {
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState<Workout[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [genOpen, setGenOpen] = useState(false);

  const load = useCallback(() => {
    api.workouts().then((r) => { memoryStore.putWorkouts(r.workouts); setSaved(r.workouts); }).catch(() => {});
  }, []);
  useFocusEffect(load);

  const all = useMemo(() => [...saved, ...BUILT_IN_WORKOUTS], [saved]);
  const visible = all.filter((w) => {
    if (filter === 'fav' && !w.favorite) return false;
    if (filter !== 'all' && filter !== 'fav' && w.category !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || w.title.toLowerCase().includes(q) || w.muscleGroups.some((m) => m.toLowerCase().includes(q)) || TYPE_LABELS[w.type].toLowerCase().includes(q);
  });
  const challenge = dailyPick(all.filter((w) => w.intensity === 'intense')) ?? all[0];

  const open = (w: Workout) => {
    memoryStore.putWorkouts([w]);
    router.push(`/workout/${w.id}`);
  };

  const toggleFav = async (w: Workout) => {
    setSaved((list) => list.map((x) => (x.id === w.id ? { ...x, favorite: !x.favorite } : x)));
    api.toggleFavorite(w.id).catch(load);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={24} color={colors.textDim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="RECHERCHER UNE SÉANCE"
            placeholderTextColor={colors.textDim}
            selectionColor={colors.lime}
            style={styles.searchText}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.margin }} style={{ marginHorizontal: -space.margin }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>

        {challenge && filter === 'all' && !query && (
          <View style={{ gap: space.md }}>
            <Text style={[type.label, { color: colors.lime, fontSize: 16 }]}>Défi du jour</Text>
            <Pressable onPress={() => open(challenge)}>
              <LinearGradient colors={['#3A2A12', '#0E0B05']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.challenge}>
                <MaterialCommunityIcons name={typeIcon(challenge)} size={140} color="rgba(195,244,0,0.12)" style={{ position: 'absolute', right: 10, top: 0 }} />
                <View style={styles.row}>
                  <PulseDot />
                  <Label color={colors.lime}>En ce moment</Label>
                </View>
                <Text style={[type.headlineMd, { color: colors.text }]}>{challenge.title}</Text>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <View style={[styles.row, { gap: space.md }]}>
                    <Meta icon="clock-outline" text={`${challenge.durationMin} min`} />
                    <Meta icon="lightning-bolt-outline" text={challenge.intensity === 'intense' ? 'Intense' : 'Modéré'} />
                    <Meta icon="fire" text={`${challenge.estimatedKcal} kcal`} />
                  </View>
                  <Pressable
                    style={styles.play}
                    onPress={() => { memoryStore.putWorkouts([challenge]); router.push({ pathname: '/workout/player', params: { id: challenge.id } }); }}
                    accessibilityLabel="Démarrer le défi"
                  >
                    <MaterialCommunityIcons name="play" size={30} color={colors.onLime} />
                  </Pressable>
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        <View style={[styles.row, { justifyContent: 'space-between', marginTop: space.md }]}>
          <Text style={[type.label, { color: colors.text, fontSize: 16 }]}>Ta bibliothèque</Text>
          <Text style={[type.label, { color: colors.lime }]}>{visible.length} séances</Text>
        </View>

        {visible.map((w, i) => (
          <Pressable key={w.id} onPress={() => open(w)} style={[styles.item, i === 0 && styles.itemActive]}>
            <View style={styles.thumb}>
              <MaterialCommunityIcons name={typeIcon(w)} size={48} color={colors.lime} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[type.labelSm, { color: colors.textMuted }]}>
                {CATEGORY_LABELS[w.category]} • {TYPE_LABELS[w.type]}{w.builtIn ? '' : ' • IA'}
              </Text>
              <Text style={styles.itemTitle} numberOfLines={2}>{w.title}</Text>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, color: colors.lime }}>
                  {w.durationMin} <Text style={[type.labelSm, { color: colors.textMuted }]}>MIN</Text>
                </Text>
                <View style={styles.bars}>
                  {[1, 2, 3].map((n) => (
                    <View key={n} style={[styles.intBar, { backgroundColor: n <= INTENSITY_BARS[w.intensity] ? colors.lime : colors.cardHigh }]} />
                  ))}
                </View>
              </View>
            </View>
            {!w.builtIn && (
              <Pressable onPress={() => toggleFav(w)} hitSlop={10} style={styles.heart}>
                <MaterialCommunityIcons name={w.favorite ? 'heart' : 'heart-outline'} size={22} color={w.favorite ? colors.lime : colors.textDim} />
              </Pressable>
            )}
          </Pressable>
        ))}
      </Screen>

      <Pressable style={[styles.fab, { bottom: 110 + insets.bottom }]} onPress={() => setGenOpen(true)} accessibilityLabel="Créer une séance avec l'IA">
        <MaterialCommunityIcons name="plus" size={32} color={colors.onLime} />
      </Pressable>

      <GeneratorModal
        visible={genOpen}
        onClose={() => setGenOpen(false)}
        onSaved={(w) => { setSaved((s) => [w, ...s]); memoryStore.putWorkouts([w]); }}
      />
    </View>
  );
}

function GeneratorModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: (w: Workout) => void }) {
  const [location, setLocation] = useState<WorkoutCategory>('gym');
  const [duration, setDuration] = useState(45);
  const [focus, setFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Workout[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const generate = async () => {
    if (!ensureAi()) return;
    setLoading(true);
    setError(null);
    try {
      const workouts = await suggestWorkouts({ location, durationMin: duration, focus: focus.trim() || undefined, count: 3 });
      memoryStore.putWorkouts(workouts);
      setResults(workouts);
      setSavedIds([]);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const save = async (w: Workout) => {
    try {
      const { workout } = await api.saveWorkout(w);
      setSavedIds((s) => [...s, w.id]);
      onSaved(workout);
    } catch (e: any) {
      setError(e?.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: space.margin, gap: space.lg, paddingBottom: 60 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={[type.headlineMd, { color: colors.text }]}>Coach IA</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <Text style={[type.bodyMd, { color: colors.textMuted }]}>
          Des séances créées pour ton objectif, ton niveau, ton matériel et tes dernières séances.
        </Text>

        <View style={{ gap: space.sm }}>
          <Label>Où ?</Label>
          <View style={styles.wrap}>
            {(['gym', 'home', 'outdoors'] as WorkoutCategory[]).map((l) => (
              <Chip key={l} label={CATEGORY_LABELS[l]} active={location === l} onPress={() => setLocation(l)} />
            ))}
          </View>
        </View>
        <View style={{ gap: space.sm }}>
          <Label>Durée</Label>
          <View style={styles.wrap}>
            {[20, 30, 45, 60, 75].map((d) => (
              <Chip key={d} label={`${d} min`} active={duration === d} onPress={() => setDuration(d)} />
            ))}
          </View>
        </View>
        <Input label="Envie particulière (optionnel)" value={focus} onChangeText={setFocus} placeholder="Ex : dos et biceps, genou sensible…" />
        <Button title="Générer 3 séances" icon="creation" onPress={generate} loading={loading} />
        <ErrorText message={error} />

        {results.map((w) => {
          const isSaved = savedIds.includes(w.id);
          return (
            <View key={w.id} style={[styles.item, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <Text style={[type.labelSm, { color: colors.textMuted }]}>
                {CATEGORY_LABELS[w.category]} • {TYPE_LABELS[w.type]} • {w.durationMin} min • {w.estimatedKcal} kcal
              </Text>
              <Text style={styles.itemTitle}>{w.title}</Text>
              <Text style={[type.bodySm, { color: colors.textMuted }]}>{w.description}</Text>
              <Text style={[type.bodySm, { color: colors.textDim }]}>{w.exercises.map((e) => e.name).join(' • ')}</Text>
              <View style={[styles.row, { marginTop: space.sm }]}>
                <Button
                  title="Voir"
                  variant="secondary"
                  style={{ flex: 1, minHeight: 46 }}
                  onPress={() => { onClose(); router.push(`/workout/${w.id}`); }}
                />
                <Button
                  title={isSaved ? 'Enregistrée' : 'Enregistrer'}
                  icon={isSaved ? 'check' : 'bookmark-plus-outline'}
                  disabled={isSaved}
                  style={{ flex: 1, minHeight: 46 }}
                  onPress={() => save(w)}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Modal>
  );
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={[styles.row, { gap: 4 }]}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.text} />
      <Text style={[type.labelSm, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md + 4,
    paddingHorizontal: space.md,
    minHeight: 56,
    backgroundColor: '#0B0B0B',
  },
  searchText: { flex: 1, color: colors.text, fontFamily: fonts.displaySemi, fontSize: 15, letterSpacing: 0.8 },
  challenge: { borderRadius: radius.card, padding: space.lg, gap: space.sm, minHeight: 200, justifyContent: 'flex-end', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  play: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  itemActive: { borderLeftWidth: 4, borderLeftColor: colors.lime },
  thumb: { width: 96, height: 96, borderRadius: radius.md + 4, backgroundColor: '#0F1208', alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.text, letterSpacing: 0.5 },
  bars: { flexDirection: 'row', gap: 3, marginRight: space.sm },
  intBar: { width: 5, height: 16, borderRadius: 2 },
  heart: { position: 'absolute', top: space.md, right: space.md },
  fab: {
    position: 'absolute',
    right: space.margin,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.lime,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});

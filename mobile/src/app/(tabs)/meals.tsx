import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { scanFridge, suggestMeals } from '../../lib/ai/features';
import { aiErrorMessage, ensureAi } from '../../lib/ai/guard';
import { localDate } from '../../lib/dates';
import { toJpegBase64 } from '../../lib/image';
import { memoryStore } from '../../lib/store';
import type { Dashboard, FridgeItem, MealSuggestion } from '../../lib/types';
import { Button, Card, Chip, ErrorText, Label, MediaPlaceholder, ProgressBar, Screen } from '../../components/ui';
import { colors, fonts, radius, space, type } from '../../lib/theme';

const FILTERS = ['Riche en protéines', 'Rapide', 'Petit budget', 'Faible en glucides', 'Récupération', 'Végétarien'];

export default function Meals() {
  const { user } = useAuth();
  const [fridge, setFridge] = useState<FridgeItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [filters, setFilters] = useState<string[]>(['Riche en protéines']);
  const [onlyFridge, setOnlyFridge] = useState(false);
  const [meals, setMeals] = useState<MealSuggestion[]>([]);
  const [coachNote, setCoachNote] = useState('');
  const [today, setToday] = useState<Dashboard['totals'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.fridge().then((r) => setFridge(r.items)).catch(() => {});
      api.dashboard(localDate()).then((d) => setToday(d.totals)).catch(() => {});
    }, []),
  );

  const addItems = async () => {
    const names = newItem.split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setNewItem('');
    try {
      setFridge((await api.addFridge(names)).items);
    } catch (e: any) {
      setError(e?.message);
    }
  };

  const removeItem = async (id: number) => {
    setFridge((f) => f.filter((i) => i.id !== id));
    api.deleteFridge(id).then((r) => setFridge(r.items)).catch(() => {});
  };

  const onScanFridge = async () => {
    if (!ensureAi()) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return setError("Autorise l'accès à la caméra dans Réglages.");
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    setScanning(true);
    setError(null);
    try {
      const r = await scanFridge(await toJpegBase64(res.assets[0].uri));
      setFridge(r.items);
      if (!r.detected.length) setError('Aucun ingrédient reconnu sur la photo.');
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setScanning(false);
    }
  };

  const generate = async () => {
    if (!ensureAi()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await suggestMeals({ filters, onlyFridge });
      memoryStore.putMeals(res.meals);
      setMeals(res.meals);
      setCoachNote(res.coachNote);
      setToday((await api.dashboard(localDate())).totals);
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const p = user?.profile;
  const proteinTarget = p?.targetProteinG ?? 0;
  const proteinNow = today?.proteinG ?? 0;
  const best = meals[0];
  const proteinAfter = best ? proteinNow + best.proteinG : proteinNow;

  return (
    <Screen>
      <View style={{ gap: space.sm }}>
        <Text style={[type.displayXl, { color: colors.text }]}>SMART{'\n'}FUELING</Text>
        <Text style={[type.bodyMd, { color: colors.textMuted }]}>Une nutrition de précision, calculée pour ton objectif du jour.</Text>
      </View>

      {/* Frigo */}
      <Card style={{ gap: space.md }}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="fridge-outline" size={24} color={colors.lime} />
          <Text style={[type.headlineMd, { color: colors.text, fontSize: 20 }]}>Qu'y a-t-il dans ton frigo ?</Text>
        </View>
        <View style={styles.fridgeInput}>
          <TextInput
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={addItems}
            placeholder="Poulet, épinards, patate douce…"
            placeholderTextColor={colors.textDim}
            selectionColor={colors.lime}
            returnKeyType="done"
            style={styles.fridgeText}
          />
          {newItem ? (
            <Pressable onPress={addItems} style={styles.scanBtn}>
              <Text style={styles.scanBtnText}>AJOUTER</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onScanFridge} style={styles.scanBtn} disabled={scanning}>
              {scanning ? <ActivityIndicator color={colors.onLime} size="small" /> : <Text style={styles.scanBtnText}>SCAN</Text>}
            </Pressable>
          )}
        </View>
        {fridge.length > 0 ? (
          <View style={styles.wrap}>
            {fridge.map((i) => (
              <View key={i.id} style={styles.fridgeTag}>
                <Text style={styles.fridgeTagText}>{i.name}</Text>
                <Pressable onPress={() => removeItem(i.id)} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={12} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[type.bodySm, { color: colors.textDim }]}>Ajoute tes ingrédients ou prends ton frigo en photo avec SCAN.</Text>
        )}
        {fridge.length > 0 && (
          <Pressable onPress={() => setOnlyFridge(!onlyFridge)} style={styles.row}>
            <MaterialCommunityIcons name={onlyFridge ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={onlyFridge ? colors.lime : colors.textMuted} />
            <Text style={[type.bodySm, { color: colors.textMuted }]}>Uniquement avec ce que j'ai</Text>
          </Pressable>
        )}
      </Card>

      {/* Filtres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.margin }} style={{ marginHorizontal: -space.margin }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f} active={filters.includes(f)} onPress={() => setFilters(filters.includes(f) ? filters.filter((x) => x !== f) : [...filters, f])} />
        ))}
      </ScrollView>

      <Button title={meals.length ? 'Nouvelles idées' : 'Générer mes repas'} icon="creation" onPress={generate} loading={loading} />
      <ErrorText message={error} />

      {loading && (
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Text style={[type.bodySm, { color: colors.textMuted }]}>L'IA compose tes repas selon tes macros restantes…</Text>
        </View>
      )}

      {coachNote ? (
        <View style={styles.row}>
          <MaterialCommunityIcons name="whistle-outline" size={18} color={colors.lime} />
          <Text style={[type.bodySm, { color: colors.textMuted, flex: 1 }]}>{coachNote}</Text>
        </View>
      ) : null}

      {/* Suggestions */}
      {meals.map((m, i) => {
        const fromFridge = m.ingredients.filter((x) => x.inFridge).length;
        return (
          <Card key={m.id} active={i === 0} style={{ padding: 0 }} onPress={() => router.push(`/meal/${m.id}`)}>
            <MediaPlaceholder icon={m.mealType === 'breakfast' ? 'coffee-outline' : 'food-variant'} height={140} label={m.tags[0]} />
            <View style={{ padding: space.lg, gap: space.md }}>
              <View style={[styles.row, { alignItems: 'flex-start' }]}>
                <Text style={[styles.mealTitle, { flex: 1 }]}>{m.title.toUpperCase()}</Text>
                {i === 0 && (
                  <View style={[styles.row, { gap: 4, marginTop: 4 }]}>
                    <View style={styles.dot} />
                    <Text style={[type.labelSm, { color: colors.lime }]}>Optimal</Text>
                  </View>
                )}
              </View>
              {i === 0 ? (
                <View style={styles.statsRow}>
                  <BigStat label="Protéines" value={`${m.proteinG}G`} lime />
                  <BigStat label="Glucides" value={`${m.carbsG}G`} />
                  <BigStat label="Calories" value={String(m.calories)} />
                </View>
              ) : (
                <>
                  <Text style={[type.bodyMd, { color: colors.textMuted }]}>
                    {fromFridge > 0 ? `Utilise ${fromFridge} de tes ingrédients. ` : ''}
                    {m.description}
                  </Text>
                  <View style={[styles.row, { justifyContent: 'space-between' }]}>
                    <View style={styles.row}>
                      <MaterialCommunityIcons name="timer-outline" size={20} color={colors.lime} />
                      <Text style={[type.label, { color: colors.text }]}>{m.prepMinutes} min</Text>
                    </View>
                    <Text style={{ fontFamily: fonts.displayBold, color: colors.lime, fontSize: 18 }}>
                      {m.calories} <Text style={[type.labelSm, { color: colors.textMuted }]}>KCAL</Text>
                    </Text>
                  </View>
                </>
              )}
            </View>
          </Card>
        );
      })}

      {/* Objectif protéines */}
      {proteinTarget > 0 && (
        <View style={styles.proteinCard}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={[type.label, { color: colors.onLime }]}>Objectif protéines du jour</Text>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: colors.onLime }}>
              {Math.round((proteinNow / proteinTarget) * 100)}%
            </Text>
          </View>
          <ProgressBar progress={proteinNow / proteinTarget} color={colors.onLime} track="rgba(22,30,0,0.2)" />
          <Text style={[type.bodySm, { color: colors.onLime }]}>
            {best
              ? proteinAfter >= proteinTarget
                ? `Manger « ${best.title} » te fera atteindre ton objectif du jour.`
                : `Avec « ${best.title} », tu seras à ${Math.round((proteinAfter / proteinTarget) * 100)}% de ton objectif.`
              : `${Math.round(proteinNow)} g sur ${proteinTarget} g consommés aujourd'hui.`}
          </Text>
        </View>
      )}
    </Screen>
  );
}

function BigStat({ label, value, lime }: { label: string; value: string; lime?: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      <Label>{label}</Label>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 30, color: lime ? colors.lime : colors.text }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  fridgeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardHigh,
    borderRadius: radius.md,
    paddingLeft: space.md,
    paddingRight: 6,
    minHeight: 56,
  },
  fridgeText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15, paddingVertical: 12 },
  scanBtn: { backgroundColor: colors.lime, borderRadius: radius.md, paddingHorizontal: space.md, height: 40, justifyContent: 'center', minWidth: 76, alignItems: 'center' },
  scanBtnText: { fontFamily: fonts.displaySemi, color: colors.onLime, letterSpacing: 1, fontSize: 13 },
  fridgeTag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 5 },
  fridgeTagText: { fontFamily: fonts.displaySemi, fontSize: 11, letterSpacing: 0.6, color: colors.textMuted, textTransform: 'uppercase' },
  mealTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.text, letterSpacing: 0.3 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  proteinCard: { backgroundColor: colors.lime, borderRadius: radius.card, padding: space.lg, gap: space.md },
});

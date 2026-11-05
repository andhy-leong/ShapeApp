import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { localDate, MEAL_LABELS, parseLocalDateTime } from '../lib/dates';
import type { MealLog, MealType } from '../lib/types';
import { Card, ErrorText, Label, ProgressBar, Screen } from '../components/ui';
import { colors, fonts, space, type } from '../lib/theme';

const ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
const SOURCE_ICON = { scan: 'camera-outline', barcode: 'barcode', suggestion: 'creation', manual: 'pencil-outline' } as const;

export default function Journal() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.meals(localDate(date)).then((r) => setMeals(r.meals)).catch((e) => setError(e?.message));
  }, [date]);
  useFocusEffect(load);

  const shift = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    if (d <= new Date()) setDate(d);
  };

  const remove = (m: MealLog) =>
    Alert.alert('Supprimer ?', `${m.name} (${m.calories} kcal)`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setMeals((list) => list.filter((x) => x.id !== m.id));
          api.deleteMeal(m.id).catch(load);
        },
      },
    ]);

  const p = user?.profile;
  const total = meals.reduce(
    (t, m) => ({ kcal: t.kcal + m.calories, p: t.p + m.proteinG, c: t.c + m.carbsG, f: t.f + m.fatG }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
  const isToday = localDate(date) === localDate();

  return (
    <Screen header={false}>
      <View style={[styles.row, { marginTop: space.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </Pressable>
        <Text style={[type.headlineMd, { color: colors.text, flex: 1 }]}>Journal</Text>
      </View>

      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Pressable onPress={() => shift(-1)} hitSlop={12}>
          <MaterialCommunityIcons name="chevron-left" size={30} color={colors.lime} />
        </Pressable>
        <Text style={[type.label, { color: colors.text }]}>
          {isToday ? "Aujourd'hui" : date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        <Pressable onPress={() => shift(1)} hitSlop={12} disabled={isToday}>
          <MaterialCommunityIcons name="chevron-right" size={30} color={isToday ? colors.cardHigh : colors.lime} />
        </Pressable>
      </View>

      <Card style={{ gap: space.md }}>
        <Bar label="Calories" value={total.kcal} target={p?.targetKcal} unit="kcal" />
        <Bar label="Protéines" value={total.p} target={p?.targetProteinG} unit="g" />
        <Bar label="Glucides" value={total.c} target={p?.targetCarbsG} unit="g" />
        <Bar label="Lipides" value={total.f} target={p?.targetFatG} unit="g" />
      </Card>

      <ErrorText message={error} />

      {meals.length === 0 && (
        <Text style={[type.bodyMd, { color: colors.textMuted, textAlign: 'center' }]}>
          Rien d'enregistré pour ce jour. Scanne un plat ou choisis une suggestion de repas.
        </Text>
      )}

      {ORDER.map((mt) => {
        const list = meals.filter((m) => m.mealType === mt);
        if (!list.length) return null;
        return (
          <View key={mt} style={{ gap: space.sm }}>
            <Label color={colors.lime}>{MEAL_LABELS[mt]} • {list.reduce((s, m) => s + m.calories, 0)} kcal</Label>
            {list.map((m) => (
              <Pressable key={m.id} onLongPress={() => remove(m)} style={styles.entry}>
                <MaterialCommunityIcons name={SOURCE_ICON[m.source]} size={20} color={colors.textDim} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodyMd, { color: colors.text }]}>{m.name}</Text>
                  <Text style={[type.bodySm, { color: colors.textDim }]}>
                    {parseLocalDateTime(m.eatenAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • P {Math.round(m.proteinG)} • G {Math.round(m.carbsG)} • L {Math.round(m.fatG)}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.displayBold, color: colors.text, fontSize: 16 }}>{m.calories}</Text>
                <Pressable onPress={() => remove(m)} hitSlop={10}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textDim} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        );
      })}
    </Screen>
  );
}

function Bar({ label, value, target, unit }: { label: string; value: number; target?: number | null; unit: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label>{label}</Label>
        <Text style={[type.bodySm, { color: colors.text }]}>
          {Math.round(value)}{target ? ` / ${target}` : ''} {unit}
        </Text>
      </View>
      <ProgressBar progress={target ? value / target : 0} color={target && value > target * 1.05 ? colors.warning : colors.lime} height={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
});

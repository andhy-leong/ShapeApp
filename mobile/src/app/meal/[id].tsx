import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { localDateTime, MEAL_LABELS } from '../../lib/dates';
import { saveMealToHealth } from '../../lib/health';
import { memoryStore } from '../../lib/store';
import { Button, Card, Label, Screen, StatBox, Tag } from '../../components/ui';
import { colors, fonts, space, type } from '../../lib/theme';

export default function MealDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meal = memoryStore.getMeal(id);
  const [saving, setSaving] = useState(false);

  if (!meal) {
    return (
      <Screen>
        <Text style={[type.bodyMd, { color: colors.textMuted }]}>Cette suggestion n'est plus disponible.</Text>
        <Button title="Retour" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const logIt = async () => {
    setSaving(true);
    const values = { calories: meal.calories, proteinG: meal.proteinG, carbsG: meal.carbsG, fatG: meal.fatG };
    try {
      await api.logMeal({ name: meal.title, mealType: meal.mealType, source: 'suggestion', eatenAt: localDateTime(), ...values });
      saveMealToHealth({ name: meal.title, ...values }).catch(() => {});
      Alert.alert('Bon appétit ✓', `${meal.title} a été ajouté à ton journal.`);
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header={false}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <MaterialCommunityIcons name="chevron-down" size={30} color={colors.text} />
      </Pressable>

      <View style={{ gap: space.sm }}>
        <Label color={colors.lime}>{MEAL_LABELS[meal.mealType]} • {meal.prepMinutes} min</Label>
        <Text style={[type.headlineLg, { color: colors.text }]}>{meal.title}</Text>
        <Text style={[type.bodyMd, { color: colors.textMuted }]}>{meal.description}</Text>
        <View style={styles.wrap}>
          {meal.tags.map((t) => <Tag key={t} label={t} />)}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <StatBox label="Kcal" value={meal.calories} />
        <StatBox label="Prot." value={meal.proteinG} unit="g" highlight />
        <StatBox label="Gluc." value={meal.carbsG} unit="g" />
        <StatBox label="Lip." value={meal.fatG} unit="g" />
      </View>

      <Card active style={{ flexDirection: 'row', gap: space.md }}>
        <MaterialCommunityIcons name="head-lightbulb-outline" size={24} color={colors.lime} />
        <Text style={[type.bodySm, { color: colors.text, flex: 1 }]}>{meal.why}</Text>
      </Card>

      <View style={{ gap: space.md }}>
        <Text style={[type.headlineMd, { color: colors.text }]}>Ingrédients</Text>
        {meal.ingredients.map((ing, i) => (
          <View key={i} style={styles.ingredient}>
            <MaterialCommunityIcons
              name={ing.inFridge ? 'check-circle' : 'cart-outline'}
              size={20}
              color={ing.inFridge ? colors.lime : colors.textDim}
            />
            <Text style={[type.bodyMd, { color: colors.text, flex: 1 }]}>{ing.name}</Text>
            <Text style={[type.bodySm, { color: colors.textMuted }]}>{ing.quantity}</Text>
          </View>
        ))}
        <Text style={[type.bodySm, { color: colors.textDim }]}>
          <MaterialCommunityIcons name="check-circle" size={12} color={colors.lime} /> dans ton frigo   <MaterialCommunityIcons name="cart-outline" size={12} color={colors.textDim} /> à acheter
        </Text>
      </View>

      <View style={{ gap: space.md }}>
        <Text style={[type.headlineMd, { color: colors.text }]}>Préparation</Text>
        {meal.steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
            <Text style={styles.stepNum}>{i + 1}</Text>
            <Text style={[type.bodyMd, { color: colors.text, flex: 1 }]}>{s}</Text>
          </View>
        ))}
      </View>

      <Button title="J'ai mangé ce plat" icon="plus-circle-outline" onPress={logIt} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', marginTop: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stepNum: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.lime, width: 24 },
});

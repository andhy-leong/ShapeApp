import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PROVIDERS, useAiSettings } from '../lib/ai/settings';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { isHealthAvailable, requestHealthPermissions, saveWeightToHealth } from '../lib/health';
import { computeTargets } from '../lib/nutrition';
import { Avatar, Button, Card, ErrorText, Input, Label, Screen } from '../components/ui';
import { colors, space, type } from '../lib/theme';

const GOAL_LABEL = { lose_weight: 'Perdre du poids', gain_muscle: 'Prendre du muscle', endurance: 'Endurance', flexibility: 'Souplesse' } as const;
const LEVEL_LABEL = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' } as const;

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const ai = useAiSettings();
  const p = user!.profile;
  const [weight, setWeight] = useState(p.weightKg ? String(p.weightKg) : '');
  const [kcal, setKcal] = useState(String(p.targetKcal ?? ''));
  const [protein, setProtein] = useState(String(p.targetProteinG ?? ''));
  const [carbs, setCarbs] = useState(String(p.targetCarbsG ?? ''));
  const [fat, setFat] = useState(String(p.targetFatG ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => parseFloat(s.replace(',', '.'));

  const recompute = () => {
    const w = num(weight);
    if (!w || !p.heightCm || !p.activityLevel || !p.goal) return;
    const t = computeTargets({ sex: p.sex, birthDate: p.birthDate, heightCm: p.heightCm, weightKg: w, activityLevel: p.activityLevel, goal: p.goal });
    setKcal(String(t.targetKcal));
    setProtein(String(t.targetProteinG));
    setCarbs(String(t.targetCarbsG));
    setFat(String(t.targetFatG));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const w = num(weight);
      const { user: u } = await api.updateProfile({
        weightKg: w || null,
        targetKcal: num(kcal) || null,
        targetProteinG: num(protein) || null,
        targetCarbsG: num(carbs) || null,
        targetFatG: num(fat) || null,
      });
      if (w && w !== p.weightKg) saveWeightToHealth(w).catch(() => {});
      setUser(u);
      Alert.alert('Profil mis à jour ✓');
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = () =>
    Alert.alert('Supprimer ton compte ?', 'Toutes tes données (journal, séances, profil) seront définitivement effacées.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAccount();
            await logout();
          } catch (e: any) {
            Alert.alert('Erreur', e?.message);
          }
        },
      },
    ]);

  return (
    <Screen header={false}>
      <View style={[styles.row, { marginTop: space.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </Pressable>
        <Text style={[type.headlineMd, { color: colors.text }]}>Profil</Text>
      </View>

      <View style={[styles.row, { gap: space.md }]}>
        <Avatar name={user?.name} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={[type.headlineMd, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[type.bodySm, { color: colors.textMuted }]}>{user?.email}</Text>
        </View>
      </View>

      <Card style={{ gap: space.sm }}>
        <Label color={colors.lime}>Ton plan</Label>
        <Text style={[type.bodyMd, { color: colors.text }]}>
          {p.goal ? GOAL_LABEL[p.goal] : '—'} • {p.fitnessLevel ? LEVEL_LABEL[p.fitnessLevel] : '—'} • {p.workoutsPerWeek ?? '?'} séances/sem.
        </Text>
        <Text style={[type.bodySm, { color: colors.textMuted }]}>
          {p.heightCm} cm{p.targetWeightKg ? ` • objectif ${p.targetWeightKg} kg` : ''}
        </Text>
      </Card>

      <View style={{ gap: space.md }}>
        <Input label="Poids actuel" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix="kg" />
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Label>Objectifs journaliers</Label>
          <Pressable onPress={recompute} hitSlop={8}>
            <Text style={[type.label, { color: colors.lime }]}>Recalculer</Text>
          </Pressable>
        </View>
        <Input label="Calories" value={kcal} onChangeText={setKcal} keyboardType="number-pad" suffix="kcal" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}><Input label="Protéines" value={protein} onChangeText={setProtein} keyboardType="number-pad" suffix="g" /></View>
          <View style={{ flex: 1 }}><Input label="Glucides" value={carbs} onChangeText={setCarbs} keyboardType="number-pad" suffix="g" /></View>
          <View style={{ flex: 1 }}><Input label="Lipides" value={fat} onChangeText={setFat} keyboardType="number-pad" suffix="g" /></View>
        </View>
        <ErrorText message={error} />
        <Button title="Enregistrer" onPress={save} loading={saving} />
      </View>

      <Card onPress={() => router.push('/ai-settings')} style={[styles.row, { gap: space.md }]}>
        <MaterialCommunityIcons name="creation" size={24} color={colors.lime} />
        <View style={{ flex: 1 }}>
          <Text style={[type.label, { color: colors.text }]}>Intelligence artificielle</Text>
          <Text style={[type.bodySm, { color: colors.textMuted }]}>
            {ai ? `${PROVIDERS[ai.provider].name} • ${ai.model}` : 'Non configurée — ajoute ta clé Claude, ChatGPT ou Gemini'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textDim} />
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="heart-pulse" size={24} color={colors.lime} />
          <Text style={[type.label, { color: colors.text }]}>Apple Santé</Text>
        </View>
        <Text style={[type.bodySm, { color: colors.textMuted }]}>
          {isHealthAvailable()
            ? 'FitVision lit tes pas, calories actives, fréquence cardiaque et poids, et y enregistre tes repas et séances. Gère les autorisations dans Réglages › Santé › Accès aux données.'
            : Platform.OS === 'android'
              ? "Apple Santé n'existe que sur iPhone. Sur Android, le suivi se fait uniquement dans FitVision."
              : "Santé n'est pas disponible dans cette version de l'app."}
        </Text>
        {isHealthAvailable() && (
          <View style={styles.row}>
            <Button title="Autoriser" variant="secondary" style={{ flex: 1, minHeight: 46 }} onPress={() => requestHealthPermissions()} />
            <Button title="Réglages" variant="secondary" style={{ flex: 1, minHeight: 46 }} onPress={() => Linking.openURL('x-apple-health://')} />
          </View>
        )}
      </Card>

      <Button title="Se déconnecter" variant="secondary" icon="logout" onPress={logout} />
      <Button title="Supprimer mon compte" variant="danger" onPress={deleteAccount} />
      <Text style={[type.bodySm, { color: colors.textDim, textAlign: 'center' }]}>
        Les estimations de l'IA sont indicatives et ne remplacent pas l'avis d'un professionnel de santé.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});

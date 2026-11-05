import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { listModels } from '../lib/ai/providers';
import { PROVIDERS, saveAiSettings, useAiSettings, type AiProvider } from '../lib/ai/settings';
import { Button, Card, Chip, ErrorText, Input, Label, Screen, type IconName } from '../components/ui';
import { colors, fonts, radius, space, type } from '../lib/theme';

const ICONS: Record<AiProvider, IconName> = {
  anthropic: 'asterisk',
  openai: 'chat-processing-outline',
  gemini: 'star-four-points-outline',
};

export default function AiSettingsScreen() {
  const current = useAiSettings();
  const [provider, setProvider] = useState<AiProvider>(current?.provider ?? 'gemini');
  const [apiKey, setApiKey] = useState(current?.apiKey ?? '');
  const [model, setModel] = useState(current?.model ?? PROVIDERS[current?.provider ?? 'gemini'].defaultModel);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const info = PROVIDERS[provider];

  const pickProvider = (p: AiProvider) => {
    setProvider(p);
    setModels([]);
    setError(null);
    if (current?.provider === p) {
      setApiKey(current.apiKey);
      setModel(current.model);
    } else {
      setApiKey('');
      setModel(PROVIDERS[p].defaultModel);
    }
  };

  const testAndSave = async () => {
    const key = apiKey.trim();
    if (!key) return setError('Colle ta clé API.');
    setTesting(true);
    setError(null);
    try {
      const available = await listModels(provider, key);
      setModels(available);
      // Si le modèle choisi n'existe pas sur le compte, on prend le premier modèle recommandé disponible
      let chosen = model.trim() || info.defaultModel;
      if (available.length && !available.includes(chosen)) {
        chosen = info.presets.find((m) => available.includes(m)) ?? available[0];
        setModel(chosen);
      }
      await saveAiSettings({ provider, apiKey: key, model: chosen });
      Alert.alert('IA connectée ✓', `${info.name} (${chosen}) est prêt.`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      setError(e?.message ?? 'Clé invalide.');
    } finally {
      setTesting(false);
    }
  };

  const disconnect = () =>
    Alert.alert('Retirer la clé ?', 'Les fonctions IA seront désactivées jusqu’à ce que tu en ajoutes une.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => { saveAiSettings(null); setApiKey(''); } },
    ]);

  const modelChoices = [...new Set([...info.presets, ...models])].slice(0, 12);

  return (
    <Screen header={false}>
      <View style={[styles.row, { marginTop: space.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </Pressable>
        <Text style={[type.headlineMd, { color: colors.text }]}>Réglages IA</Text>
      </View>

      <Text style={[type.bodyMd, { color: colors.textMuted }]}>
        Choisis l'IA qui analysera tes plats et créera tes repas et séances. Tu utilises <Text style={{ color: colors.text }}>ta propre clé</Text> : la
        consommation est facturée sur ton compte, pas sur celui de FitVision.
      </Text>

      <View style={{ gap: space.sm }}>
        {(Object.keys(PROVIDERS) as AiProvider[]).map((p) => {
          const active = provider === p;
          const connected = current?.provider === p;
          return (
            <Pressable key={p} onPress={() => pickProvider(p)} style={[styles.provider, active && styles.providerActive]}>
              <MaterialCommunityIcons name={ICONS[p]} size={26} color={active ? colors.lime : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.providerName, active && { color: colors.lime }]}>{PROVIDERS[p].name}</Text>
                <Text style={[type.bodySm, { color: colors.textDim }]}>{PROVIDERS[p].company}</Text>
              </View>
              {connected && (
                <View style={styles.badge}>
                  <Text style={[type.labelSm, { color: colors.onLime }]}>Connecté</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Card style={{ gap: space.md }}>
        <Text style={[type.bodySm, { color: colors.textMuted }]}>{info.note}</Text>
        <Pressable onPress={() => Linking.openURL(info.keyUrl)} style={styles.row}>
          <MaterialCommunityIcons name="open-in-new" size={18} color={colors.lime} />
          <Text style={[type.label, { color: colors.lime }]}>Obtenir une clé {info.name}</Text>
        </Pressable>
      </Card>

      <Input
        label={`Clé API ${info.name}`}
        value={apiKey}
        onChangeText={setApiKey}
        placeholder={info.keyHint}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        textContentType="password"
      />

      <View style={{ gap: space.sm }}>
        <Label>Modèle</Label>
        <View style={styles.wrap}>
          {modelChoices.map((m) => (
            <Chip key={m} label={m} active={model === m} onPress={() => setModel(m)} />
          ))}
        </View>
        <Input value={model} onChangeText={setModel} autoCapitalize="none" autoCorrect={false} placeholder={info.defaultModel} />
        <Text style={[type.bodySm, { color: colors.textDim }]}>
          « Tester et enregistrer » vérifie ta clé et affiche les modèles disponibles sur ton compte.
        </Text>
      </View>

      <ErrorText message={error} />
      <Button title="Tester et enregistrer" icon="check-decagram-outline" onPress={testAndSave} loading={testing} />
      {current && <Button title="Retirer ma clé" variant="danger" onPress={disconnect} />}

      <View style={styles.privacy}>
        <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.textMuted} />
        <Text style={[type.bodySm, { color: colors.textMuted, flex: 1 }]}>
          Ta clé est chiffrée dans le trousseau de ton téléphone et n'est envoyée qu'à {info.company}. Le serveur FitVision ne la voit jamais.
          Les photos de tes plats et ton profil sportif sont transmis à {info.company} uniquement quand tu utilises une fonction IA.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.card,
    padding: space.md,
  },
  providerActive: { borderColor: colors.lime },
  providerName: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.text, letterSpacing: 0.5 },
  badge: { backgroundColor: colors.lime, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  privacy: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.card },
});

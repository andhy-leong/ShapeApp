import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { Button, ErrorText, Input, Logo } from '../../components/ui';
import { colors, fonts, space, type } from '../../lib/theme';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (mode === 'register' && !name.trim()) return setError('Indique ton prénom.');
    if (!email.includes('@')) return setError('Adresse e-mail invalide.');
    if (password.length < 8) return setError('Le mot de passe doit faire au moins 8 caractères.');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name);
    } catch (e: any) {
      setError(e?.message ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Logo size={28} />

          <View style={{ gap: space.sm }}>
            <Text style={[type.displayXl, { color: colors.text }]}>
              {mode === 'register' ? 'COMMENCE\n' : 'BON\n'}
              <Text style={styles.accent}>{mode === 'register' ? "L'ASCENSION" : 'RETOUR'}</Text>
            </Text>
            <Text style={[type.bodyMd, { color: colors.textMuted }]}>
              Nutrition calculée par l'IA, entraînements sur mesure et synchronisation avec Santé.
            </Text>
          </View>

          <View style={{ gap: space.md }}>
            {mode === 'register' && (
              <Input label="Prénom" value={name} onChangeText={setName} placeholder="Chris" autoComplete="given-name" textContentType="givenName" />
            )}
            <Input
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="toi@exemple.fr"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="8 caractères minimum"
              secureTextEntry
              textContentType={mode === 'register' ? 'newPassword' : 'password'}
              onSubmitEditing={submit}
            />
          </View>

          <ErrorText message={error} />

          <View style={{ gap: space.md }}>
            <Button title={mode === 'register' ? 'Créer mon compte' : 'Se connecter'} icon="arrow-right" onPress={submit} loading={loading} />
            <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} style={{ alignItems: 'center', padding: space.md }}>
              <Text style={[type.label, { color: colors.textMuted }]}>
                {mode === 'login' ? 'Pas encore de compte ? Inscription' : 'Déjà inscrit ? Connexion'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.margin, gap: space.xl, paddingTop: space.xl, flexGrow: 1 },
  accent: { color: colors.lime, fontFamily: fonts.displayXBold },
});

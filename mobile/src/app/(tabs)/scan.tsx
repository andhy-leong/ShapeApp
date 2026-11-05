import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';
import { scanMeal } from '../../lib/ai/features';
import { aiErrorMessage, ensureAi } from '../../lib/ai/guard';
import { localDateTime, MEAL_LABELS, mealTypeForNow } from '../../lib/dates';
import { saveMealToHealth } from '../../lib/health';
import { toJpegBase64 } from '../../lib/image';
import { lookupBarcode, type BarcodeProduct } from '../../lib/openfoodfacts';
import type { MealType, ScanResult } from '../../lib/types';
import { AppHeader, Button, Chip, ErrorText, Input, Label, StatBox } from '../../components/ui';
import { colors, fonts, radius, space, type } from '../../lib/theme';

type Mode = 'photo' | 'barcode';
type Detection = { source: 'scan' | 'barcode'; result: ScanResult; product?: BarcodeProduct };

const PORTIONS = [0.5, 1, 1.5, 2];

export default function Scan() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [mode, setMode] = useState<Mode>('photo');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [portion, setPortion] = useState(1);
  const [grams, setGrams] = useState('100');
  const [mealType, setMealType] = useState<MealType>(mealTypeForNow());
  const [saving, setSaving] = useState(false);
  const scanLock = useRef(false);

  const reset = () => {
    setDetection(null);
    setError(null);
    setPortion(1);
    scanLock.current = false;
  };

  const analyze = async (uri: string) => {
    if (!ensureAi()) return;
    setBusy(true);
    setError(null);
    try {
      const base64 = await toJpegBase64(uri);
      const result = await scanMeal(base64);
      if (!result.isFood) {
        setError(result.notes || "Aucun aliment détecté. Cadre bien ton assiette.");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setMealType(mealTypeForNow());
      setDetection({ source: 'scan', result });
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    if (!camera.current || busy || !ensureAi()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const photo = await camera.current.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) analyze(photo.uri);
  };

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) analyze(res.assets[0].uri);
  };

  const onBarcode = async ({ data }: BarcodeScanningResult) => {
    if (scanLock.current || detection) return;
    scanLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const product = await lookupBarcode(data);
      if (!product) {
        setError('Produit introuvable dans Open Food Facts.');
        setTimeout(() => (scanLock.current = false), 2500);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setGrams(String(product.servingGrams ?? 100));
      setMealType(mealTypeForNow());
      setDetection({ source: 'barcode', product, result: product.per100 });
    } catch {
      setError('Recherche du produit impossible.');
      setTimeout(() => (scanLock.current = false), 2500);
    } finally {
      setBusy(false);
    }
  };

  // Valeurs ajustées à la portion choisie
  const factor = detection?.source === 'barcode' ? (parseFloat(grams.replace(',', '.')) || 0) / 100 : portion;
  const r = detection?.result;
  const adjusted = r && {
    calories: Math.round(r.calories * factor),
    proteinG: Math.round(r.proteinG * factor * 10) / 10,
    carbsG: Math.round(r.carbsG * factor * 10) / 10,
    fatG: Math.round(r.fatG * factor * 10) / 10,
  };

  const addToLog = async () => {
    if (!r || !adjusted || !detection) return;
    setSaving(true);
    try {
      await api.logMeal({ name: r.name, mealType, source: detection.source, eatenAt: localDateTime(), ...adjusted });
      saveMealToHealth({ name: r.name, ...adjusted }).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Ajouté ✓', `${r.name} — ${adjusted.calories} kcal ajouté à ton journal.`);
      reset();
    } catch (e: any) {
      setError(e?.message ?? 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (!permission) return <View style={styles.fill} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.fill} edges={['top']}>
        <AppHeader />
        <View style={styles.permission}>
          <MaterialCommunityIcons name="camera-outline" size={64} color={colors.lime} />
          <Text style={[type.headlineMd, { color: colors.text, textAlign: 'center' }]}>Accès à la caméra</Text>
          <Text style={[type.bodyMd, { color: colors.textMuted, textAlign: 'center' }]}>
            FitVision a besoin de la caméra pour analyser tes plats et scanner les codes-barres.
          </Text>
          <Button title="Autoriser la caméra" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
      <AppHeader />
      <View style={styles.fill}>
        {isFocused && !detection && (
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={mode === 'barcode' ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] } : undefined}
            onBarcodeScanned={mode === 'barcode' ? onBarcode : undefined}
          />
        )}

        {/* Sélecteur de mode */}
        {!detection && (
          <View style={styles.modeSwitch}>
            <Chip label="Plat (IA)" active={mode === 'photo'} onPress={() => { setMode('photo'); setError(null); }} />
            <Chip label="Code-barres" active={mode === 'barcode'} onPress={() => { setMode('barcode'); setError(null); scanLock.current = false; }} />
          </View>
        )}

        {/* Cadre de visée */}
        {!detection && (
          <View style={styles.frameWrap} pointerEvents="none">
            <View style={[styles.frame, mode === 'barcode' && { height: 160 }]}>
              <View style={[styles.corner, { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 }]} />
              <View style={[styles.corner, { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 }]} />
              <View style={[styles.corner, { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
              <View style={[styles.corner, { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 }]} />
            </View>
            <Text style={styles.hint}>
              {busy ? 'Analyse en cours…' : mode === 'photo' ? 'Cadre ton assiette en entier' : 'Vise le code-barres du produit'}
            </Text>
          </View>
        )}

        {busy && (
          <View style={styles.busy}>
            <ActivityIndicator size="large" color={colors.lime} />
            <Text style={[type.label, { color: colors.lime }]}>{mode === 'photo' ? "L'IA analyse ton plat" : 'Recherche du produit'}</Text>
          </View>
        )}

        {/* Commandes */}
        {!detection && (
          <View style={[styles.controls, { bottom: 100 + insets.bottom }]}>
            {error && <View style={{ alignSelf: 'stretch' }}><ErrorText message={error} /></View>}
            {mode === 'photo' && (
              <View style={styles.shutterRow}>
                <Pressable onPress={pickFromLibrary} style={styles.sideBtn} accessibilityLabel="Choisir une photo">
                  <MaterialCommunityIcons name="image-outline" size={26} color={colors.text} />
                </Pressable>
                <Pressable onPress={takePhoto} disabled={busy} style={styles.shutter} accessibilityLabel="Prendre la photo">
                  <View style={styles.shutterInner} />
                </Pressable>
                <View style={styles.sideBtn} />
              </View>
            )}
          </View>
        )}

        {/* Résultat */}
        {detection && r && adjusted && (
          <ScrollView style={styles.fill} contentContainerStyle={[styles.result, { paddingBottom: 120 + insets.bottom }]}>
            <View style={styles.resultCard}>
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <View style={{ flex: 1, gap: space.sm }}>
                  <Label color={colors.lime}>{detection.source === 'barcode' ? 'Produit' : 'Détection'}</Label>
                  <Text style={[type.headlineLg, { color: colors.text }]}>{r.name}</Text>
                  {detection.product?.brand ? <Text style={[type.bodySm, { color: colors.textMuted }]}>{detection.product.brand}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.kcal}>{adjusted.calories}</Text>
                  <Label>Calories</Label>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <StatBox label="Protéines" value={adjusted.proteinG} unit="g" highlight />
                <StatBox label="Glucides" value={adjusted.carbsG} unit="g" />
                <StatBox label="Lipides" value={adjusted.fatG} unit="g" />
              </View>

              {detection.source === 'scan' ? (
                <>
                  <View style={{ gap: space.sm }}>
                    <Label>Portion</Label>
                    <View style={styles.wrap}>
                      {PORTIONS.map((p) => (
                        <Chip key={p} label={`×${String(p).replace('.', ',')}`} active={portion === p} onPress={() => setPortion(p)} />
                      ))}
                    </View>
                  </View>
                  {r.items.length > 0 && (
                    <View style={{ gap: space.sm }}>
                      <Label>Aliments détectés</Label>
                      {r.items.map((it, i) => (
                        <View key={i} style={styles.itemRow}>
                          <Text style={[type.bodyMd, { color: colors.text, flex: 1 }]}>{it.name}</Text>
                          <Text style={[type.bodySm, { color: colors.textMuted }]}>
                            ~{Math.round(it.grams * portion)} g • {Math.round(it.calories * portion)} kcal
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={[type.bodySm, { color: colors.textDim }]}>
                    Fiabilité : {r.confidence === 'high' ? 'élevée' : r.confidence === 'medium' ? 'moyenne' : 'faible'}
                    {r.notes ? ` — ${r.notes}` : ''}
                  </Text>
                </>
              ) : (
                <Input label="Quantité consommée" value={grams} onChangeText={setGrams} keyboardType="decimal-pad" suffix="g" />
              )}

              <View style={{ gap: space.sm }}>
                <Label>Repas</Label>
                <View style={styles.wrap}>
                  {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => (
                    <Chip key={m} label={MEAL_LABELS[m]} active={mealType === m} onPress={() => setMealType(m)} />
                  ))}
                </View>
              </View>

              <ErrorText message={error} />
              <Button title="Ajouter au journal" icon="plus-circle-outline" onPress={addToLog} loading={saving} />
              <Button title="Rescanner" variant="ghost" onPress={reset} />
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const CORNER = 36;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  permission: { flex: 1, padding: space.xl, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  modeSwitch: { position: 'absolute', top: space.md, alignSelf: 'center', flexDirection: 'row', gap: space.sm, zIndex: 2 },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingBottom: 140 },
  frame: { width: '82%', height: 300, borderRadius: radius.card, borderWidth: 1, borderColor: 'rgba(195,244,0,0.35)' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.lime, borderRadius: 6 },
  hint: { ...type.label, color: colors.text, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, overflow: 'hidden' },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', gap: space.md },
  controls: { position: 'absolute', left: space.margin, right: space.margin, alignItems: 'center', gap: space.md },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: space.xl },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.lime },
  sideBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(38,38,38,0.85)', alignItems: 'center', justifyContent: 'center' },
  result: { padding: space.margin },
  resultCard: { backgroundColor: '#0B0B0B', borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.lg },
  kcal: { fontFamily: fonts.displayXBold, fontSize: 52, color: colors.lime, lineHeight: 58 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});

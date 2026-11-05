import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors, fonts, radius, space, type } from '../lib/theme';
import { useAuth } from '../lib/auth';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// ---------------------------------------------------------------------------

export function Screen({
  children,
  scroll = true,
  header = true,
  contentStyle,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  header?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {header && <AppHeader />}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <Text style={[styles.logo, { fontSize: size }]} accessibilityRole="header">
      FITVISION
    </Text>
  );
}

export function Avatar({ name, size = 40 }: { name?: string; size?: number }) {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

export function AppHeader() {
  const { user } = useAuth();
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.push('/profile')} style={styles.headerLeft} accessibilityLabel="Profil">
        <Avatar name={user?.name} />
        <Logo />
      </Pressable>
      <Pressable onPress={() => router.push('/journal')} hitSlop={12} accessibilityLabel="Journal du jour">
        <MaterialCommunityIcons name="notebook-outline" size={24} color={colors.lime} />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------

export function Card({
  children,
  active,
  style,
  onPress,
}: {
  children: ReactNode;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const content = <View style={[styles.card, active && styles.cardActive, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>
      {content}
    </Pressable>
  );
}

export function Label({ children, color = colors.textMuted, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.labelSm, { color }, style]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = variant === 'primary' ? colors.onLime : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: colors.lime },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.text },
        variant === 'danger' && { borderWidth: 1, borderColor: colors.danger },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon} size={22} color={fg} />}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, onRemove }: { label: string; active?: boolean; onPress?: () => void; onRemove?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.lime, borderColor: colors.lime }]}
    >
      <Text style={[styles.chipText, active && { color: colors.onLime }]}>{label}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel={`Retirer ${label}`}>
          <MaterialCommunityIcons name="close" size={14} color={active ? colors.onLime : colors.textMuted} />
        </Pressable>
      )}
    </Pressable>
  );
}

export function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

export function Input(props: TextInputProps & { label?: string; suffix?: string }) {
  const [focused, setFocused] = useState(false);
  const { label, suffix, style, ...rest } = props;
  return (
    <View style={{ gap: space.sm }}>
      {label && <Label>{label}</Label>}
      <View style={[styles.input, focused && { borderColor: colors.lime }]}>
        <TextInput
          placeholderTextColor={colors.textDim}
          selectionColor={colors.lime}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.inputText, style]}
        />
        {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

export function StatBox({ label, value, unit, highlight }: { label: string; value: string | number; unit?: string; highlight?: boolean }) {
  return (
    <View style={[styles.statBox, highlight && styles.cardActive]}>
      <Label>{label}</Label>
      <Text style={styles.statBoxValue}>
        {value}
        {unit && <Text style={styles.statBoxUnit}> {unit}</Text>}
      </Text>
    </View>
  );
}

export function ProgressRing({
  progress,
  size = 120,
  stroke = 12,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={progress > 1.05 ? colors.warning : colors.lime}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function ProgressBar({ progress, color = colors.lime, track = colors.track, height = 10 }: { progress: number; color?: string; track?: string; height?: number }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${p * 100}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

/** Point lime animé à côté des données en direct */
export function PulseDot({ size = 8 }: { size?: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return <Animated.View style={{ width: size, height: size, borderRadius: size, backgroundColor: colors.lime, opacity: anim }} />;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[type.headlineMd, { color: colors.text, flex: 1 }]}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[type.label, { color: colors.lime }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

/** Bandeau "visuel" utilisé à la place d'une photo (dégradé + icône) */
export function MediaPlaceholder({ icon, height = 160, label }: { icon: IconName; height?: number; label?: string }) {
  return (
    <View style={[styles.media, { height }]}>
      <MaterialCommunityIcons name={icon} size={height * 0.4} color={colors.lime} style={{ opacity: 0.9 }} />
      {label && (
        <View style={styles.mediaLabel}>
          <Text style={[type.labelSm, { color: colors.lime }]}>{label}</Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, paddingBottom: 140, gap: space.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.margin,
    paddingVertical: space.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: {
    fontFamily: fonts.displayXBold,
    color: colors.lime,
    letterSpacing: 0.5,
    transform: [{ skewX: '-12deg' }],
  },
  avatar: {
    borderWidth: 2,
    borderColor: colors.lime,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    overflow: 'hidden',
  },
  cardActive: { borderLeftWidth: 3, borderLeftColor: colors.lime },
  button: {
    minHeight: 56,
    borderRadius: radius.md + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  buttonText: { fontFamily: fonts.displaySemi, fontSize: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md + 4,
    paddingVertical: space.sm + 4,
    borderRadius: radius.full,
    backgroundColor: colors.cardHigh,
    borderWidth: 1,
    borderColor: colors.cardHigh,
  },
  chipText: { fontFamily: fonts.displaySemi, fontSize: 13, letterSpacing: 0.8, color: colors.text, textTransform: 'uppercase' },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.cardHigh },
  tagText: { fontFamily: fonts.displaySemi, fontSize: 10, letterSpacing: 0.8, color: colors.textMuted, textTransform: 'uppercase' },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 54,
  },
  inputText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16, paddingVertical: 14 },
  inputSuffix: { color: colors.textDim, fontFamily: fonts.displaySemi, fontSize: 14, marginLeft: space.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.cardHigh,
    borderRadius: radius.md + 4,
    padding: space.md,
    gap: space.sm,
  },
  statBoxValue: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.text },
  statBoxUnit: { fontFamily: fonts.displaySemi, fontSize: 14, color: colors.textDim },
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
  error: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,59,48,0.12)',
  },
  errorText: { color: '#FFB4AB', fontFamily: fonts.body, fontSize: 14, flex: 1 },
  media: {
    backgroundColor: '#0F1208',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mediaLabel: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
});

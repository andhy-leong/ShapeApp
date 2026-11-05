import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../../lib/theme';
import type { IconName } from '../../components/ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Accueil', icon: 'view-dashboard-outline' },
  library: { label: 'Biblio', icon: 'dumbbell' },
  scan: { label: 'Scan', icon: 'cellphone-screenshot' },
  meals: { label: 'Repas', icon: 'silverware-fork-knife' },
};

function TabBar({ state, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView intensity={40} tint="dark" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? colors.lime : colors.textDim;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              if (!focused) navigateToTab(route.key);
            }}
            style={styles.tab}
          >
            <MaterialCommunityIcons name={tab.icon} size={26} color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="library" />
        <Tabs.Screen name="scan" />
        <Tabs.Screen name="meals" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontFamily: fonts.displaySemi, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
});

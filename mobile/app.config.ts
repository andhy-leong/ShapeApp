import type { ConfigContext, ExpoConfig } from 'expo/config';

// La configuration principale est dans app.json.
// Ce fichier ajoute un interrupteur pour compiler l'app iOS SANS HealthKit :
//   FITVISION_NO_HEALTHKIT=1 npx expo prebuild -p ios --clean
// Utile si Xcode refuse la capacité HealthKit avec un compte Apple gratuit (Personal Team).

export default ({ config }: ConfigContext): ExpoConfig => {
  const healthKit = process.env.FITVISION_NO_HEALTHKIT !== '1';
  const plugins = (config.plugins ?? []).filter(
    (p) => healthKit || (Array.isArray(p) ? p[0] : p) !== '@kingstinct/react-native-healthkit',
  );
  return {
    ...config,
    name: config.name ?? 'FitVision',
    slug: config.slug ?? 'fitvision',
    plugins,
    extra: { ...config.extra, healthKit },
  };
};

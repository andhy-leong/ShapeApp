// HealthKit n'existe que sur iOS : on n'essaie pas de lier ces modules dans la version Android (APK).
module.exports = {
  dependencies: {
    '@kingstinct/react-native-healthkit': { platforms: { android: null } },
    '@react-native-healthkit/core': { platforms: { android: null } },
  },
};

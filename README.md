# FitVision

Application de coaching sportif et nutritionnel avec IA (iPhone + version Android de test), basée sur les maquettes du dossier [maquette/](maquette/) (design « Kinetic Noir »).

- **Scan de plats** : une photo → l'IA identifie les aliments, estime les portions et calcule calories et macros.
- **Code-barres** : produits emballés via Open Food Facts.
- **Repas intelligents** : recettes selon l'objectif, ce qu'il reste à manger aujourd'hui et le contenu du frigo (saisi ou pris en photo).
- **Entraînements** : bibliothèque, défi du jour, séances générées par l'IA, lecteur de séance avec minuteur de repos.
- **Apple Santé** (iPhone) : lecture des pas, calories actives, fréquence cardiaque, taille, poids, âge ; écriture des repas, du poids et des séances.
- **Comptes** : profil, journal, frigo et séances stockés sur la base MySQL IONOS.

## L'IA : chaque utilisateur apporte sa propre clé

FitVision n'utilise **pas** ton abonnement ni ta clé. Dans **Profil › Intelligence artificielle**, chaque utilisateur choisit :

| IA | Où obtenir une clé | Remarque |
|---|---|---|
| **Claude** (Anthropic) | https://platform.claude.com › API Keys | Payant à l'usage (crédit à ajouter) |
| **ChatGPT** (OpenAI) | https://platform.openai.com/api-keys | Payant à l'usage ; ChatGPT Plus n'inclut pas l'API |
| **Gemini** (Google) | https://aistudio.google.com/apikey | Offre gratuite limitée en général : le plus simple pour tester |

- La clé est stockée chiffrée dans le trousseau du téléphone et envoyée **uniquement** au fournisseur choisi. Le serveur FitVision ne la voit jamais.
- L'app appelle directement l'API du fournisseur (sorties JSON structurées) : [mobile/src/lib/ai/](mobile/src/lib/ai/).
- Le bouton « Tester et enregistrer » vérifie la clé et liste les modèles disponibles sur le compte.

> Il n'est pas possible de « se connecter avec son compte Claude / ChatGPT / Gemini » comme avec Google ou Apple : ces fournisseurs ne proposent pas aux applications tierces d'utiliser l'abonnement grand public d'un utilisateur. La clé API personnelle est le moyen prévu pour cela.

## Architecture

```
mobile/    App — Expo SDK 58 (React Native, TypeScript, Expo Router)
backend/   API PHP 8 + MySQL, à déposer sur l'hébergement IONOS (comptes et données)
maquette/  Maquettes d'origine
```

```
Téléphone ──HTTPS──▶ API PHP (IONOS) ──▶ MySQL        (comptes, journal, frigo, séances)
     └─────HTTPS──▶ Claude / ChatGPT / Gemini           (avec la clé de l'utilisateur)
```

---

## 1. Installer le backend sur IONOS

1. **Base de données** : crée une base MySQL dans IONOS, ouvre **phpMyAdmin** › **Importer** › [backend/schema.sql](backend/schema.sql) › Exécuter.
2. **Configuration** : copie `backend/config.example.php` en `backend/config.php` et remplis les identifiants MySQL et `jwt_secret` (64 caractères aléatoires).
3. **Mise en ligne** : envoie le contenu de `backend/` (avec `.htaccess` et `config.php`) par SFTP, idéalement sur un sous-domaine (ex. `api.mondomaine.fr`) **avec SSL**.
4. Choisis **PHP 8.1 ou plus** pour ce domaine.
5. Test : `https://api.mondomaine.fr/health` doit afficher `{"ok":true}`.

Puis indique cette adresse à l'app :
- `mobile/.env` (copie de `.env.example`) pour les compilations faites sur ton ordinateur ;
- `mobile/eas.json` (champ `EXPO_PUBLIC_API_URL`) pour l'APK compilé dans le cloud.

---

## 2. iPhone avec Xcode et un compte Apple gratuit

⚠️ **Xcode ne fonctionne que sur un Mac.** Depuis Windows, il te faut un Mac (le tien, un prêté, ou un Mac loué dans le cloud) pour cette étape.

Limites d'un compte Apple gratuit (« Personal Team ») :
- l'app installée **expire au bout de 7 jours** : il suffit de la relancer depuis Xcode pour la renouveler ;
- 3 apps maximum par appareil, uniquement sur tes propres appareils, pas de TestFlight ni d'App Store ;
- **HealthKit** : la prise en charge avec un compte gratuit n'est pas garantie par Apple. Si Xcode refuse la signature à cause de HealthKit, compile sans (voir plus bas) : tout le reste fonctionne.

Sur le Mac (Node.js et Xcode installés) :

```bash
cd mobile
npm install
cp .env.example .env              # mets l'URL de ton API
npx expo prebuild -p ios --clean  # génère le projet Xcode (dossier ios/)
open ios/FitVision.xcworkspace
```

Dans Xcode :
1. **Xcode › Settings › Accounts** : ajoute ton identifiant Apple.
2. Clique sur le projet **FitVision** › cible **FitVision** › **Signing & Capabilities** › **Team** : choisis « *Ton nom* (Personal Team) ». Si le bundle identifier est déjà pris, change-le (ex. `com.tonnom.fitvision`).
3. Sur l'iPhone : **Réglages › Confidentialité et sécurité › Mode développeur** › activer (redémarrage demandé). Branche l'iPhone au Mac.
4. **Product › Scheme › Edit Scheme › Run › Build Configuration : Release** (l'app embarque alors son code et fonctionne sans le Mac).
5. Choisis ton iPhone en haut et clique sur ▶︎ Run.
6. Au premier lancement : **Réglages › Général › VPN et gestion de l'appareil** › fais confiance à ton profil développeur.

**Sans HealthKit** (si la signature échoue) :

```bash
FITVISION_NO_HEALTHKIT=1 npx expo prebuild -p ios --clean
```

Puis reprends les étapes Xcode. L'app masque alors les fonctions Santé.

---

## 3. APK Android pour un testeur à distance

Apple Santé n'existe pas sur Android : l'APK contient tout le reste (comptes, scan IA, code-barres, repas, séances, journal).

### Option A — Compilation dans le cloud avec EAS (recommandé, fonctionne depuis Windows)

Compte gratuit sur https://expo.dev (quelques compilations gratuites par mois).

```bash
cd mobile
npm install
npx eas-cli@latest login
npm run build:apk                 # = eas build --profile apk --platform android
```

À la fin (~10-20 min), EAS donne un lien de téléchargement du fichier `.apk`. Dépose-le sur ton cloud et partage le lien.

### Option B — Compilation locale sous Windows

Installe Android Studio (il fournit le SDK Android et Java), puis :

```bash
cd mobile
npx expo prebuild -p android --clean
cd android
gradlew.bat assembleRelease
```

L'APK se trouve dans `android/app/build/outputs/apk/release/app-release.apk` (signé avec la clé de debug : suffisant pour des tests, pas pour le Play Store).

### Installation par ton collègue

1. Télécharger l'APK depuis ton lien de cloud sur son téléphone Android.
2. Ouvrir le fichier : Android demande d'**autoriser l'installation d'applications inconnues** pour le navigateur ou l'app de fichiers → autoriser.
3. Installer, créer un compte, puis **Profil › Intelligence artificielle** : coller sa propre clé (Gemini est le plus simple pour commencer).

---

## Vérifier le code

```bash
cd mobile
npm run typecheck
npx expo-doctor
```

## Structure de l'app

```
mobile/src/
  app/                      Écrans (Expo Router)
    (auth)/login.tsx        Connexion / inscription
    onboarding.tsx          3 étapes : corps (import Santé), objectifs, métriques
    (tabs)/index.tsx        Accueil : séance, calories, BPM, prochain repas, scan rapide
    (tabs)/library.tsx      Bibliothèque, défi du jour, générateur IA
    (tabs)/scan.tsx         Scanner plat (IA) et code-barres
    (tabs)/meals.tsx        Smart Fueling : frigo, filtres, suggestions IA
    ai-settings.tsx         Choix de l'IA (Claude / ChatGPT / Gemini) et clé personnelle
    meal/[id].tsx           Recette détaillée
    workout/[id].tsx        Détail d'une séance
    workout/player.tsx      Séance en cours + minuteur de repos
    journal.tsx             Journal alimentaire jour par jour
    profile.tsx             Profil, objectifs, IA, Santé, déconnexion
  components/ui.tsx         Composants du design system
  lib/ai/                   Fournisseurs IA, prompts et schémas JSON
  lib/                      API serveur, authentification, HealthKit, calculs nutritionnels…
```

Les objectifs caloriques sont calculés avec la formule de Mifflin-St Jeor et restent modifiables dans le profil.

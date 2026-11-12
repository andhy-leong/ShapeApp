# Guide : configurer FitVision et l'installer sur ton iPhone avec Xcode

Ce guide te dit **quoi modifier dans le code** (une seule fois), puis **quoi faire sur le Mac** chaque fois que tu récupères le code pour le lancer avec Xcode.

---

## Partie 1 — Ce que tu dois modifier dans le code

Il y a **4 choses à personnaliser**. Tout le reste fonctionne tel quel. Les clés IA (Claude, ChatGPT, Gemini) **ne se mettent pas dans le code** : chaque utilisateur les saisit dans l'app.

### 1. `backend/config.php` — accès à ta base de données (sur le serveur uniquement)

Copie `backend/config.example.php` et renomme la copie `config.php`, puis remplis :

| Champ | Où trouver la valeur |
|---|---|
| `db_host` | IONOS › Hébergement › Bases de données › ta base › *Nom d'hôte* (ex. `db123456789.hosting-data.io`) |
| `db_name` | Même page › *Nom de la base* (ex. `dbs12345678`) |
| `db_user` | Même page › *Nom d'utilisateur* (ex. `dbu1234567`) |
| `db_pass` | Le mot de passe choisi à la création de la base |
| `jwt_secret` | Une suite de 64 caractères au hasard (lettres et chiffres), que tu inventes. Ne la change plus ensuite, sinon tout le monde sera déconnecté. |

> ⚠️ Ce fichier contient tes mots de passe : il est volontairement **ignoré par git**. Ne le mets jamais sur GitHub. Il doit seulement être envoyé sur ton hébergement IONOS (par SFTP), avec le reste du dossier `backend/`.

### 2. `mobile/.env` — l'adresse de ton serveur pour l'app iPhone

Copie `mobile/.env.example`, renomme la copie `.env`, et mets l'adresse où tu as installé le dossier `backend/` :

```
EXPO_PUBLIC_API_URL=https://api.mondomaine.fr
```

- Pas de `/` à la fin.
- Obligatoirement en **https** (iOS bloque le http).
- Vérifie-la dans Safari : `https://api.mondomaine.fr/health` doit afficher `{"ok":true}`.

> Ce fichier est aussi ignoré par git : il faudra **le recréer sur le Mac** après chaque `git clone` (voir Partie 2, étape 4).

### 3. `mobile/eas.json` — la même adresse, pour l'APK Android

Remplace les deux `https://api.mondomaine.fr` par ton adresse. (Ce fichier-là est sur GitHub ; l'adresse n'est pas un secret.)

### 4. `mobile/app.json` — l'identifiant unique de l'app (seulement si besoin)

```json
"ios": { "bundleIdentifier": "com.andhyleong.fitvision", ... },
"android": { "package": "com.andhyleong.fitvision", ... }
```

Un identifiant ne peut être utilisé que par un seul compte Apple au monde. Si Xcode affiche *« Failed to register bundle identifier »*, remplace-le par quelque chose d'unique, par exemple `com.andhyleong.fitvision2`, puis refais l'étape 5 de la Partie 2.

Tu peux aussi changer ici le nom affiché sous l'icône : `"name": "FitVision"`.

### Facultatif — personnalisations courantes

| Tu veux changer… | Fichier |
|---|---|
| Les couleurs, polices, arrondis | `mobile/src/lib/theme.ts` |
| Les séances intégrées (bibliothèque) | `mobile/src/lib/workouts.ts` |
| Les modèles IA proposés par défaut | `mobile/src/lib/ai/settings.ts` (`defaultModel`, `presets`) |
| Les consignes données à l'IA (prompts) | `mobile/src/lib/ai/features.ts` |
| Le calcul des calories cibles | `mobile/src/lib/nutrition.ts` |
| L'icône de l'app | `mobile/assets/icon.png` (1024×1024 px, sans transparence) |

### ❌ Ce que tu ne dois PAS modifier

- **Le dossier `mobile/ios/`** : il est **régénéré automatiquement** par `npx expo prebuild`. Toute modification faite à la main dedans (y compris dans Xcode, sauf la signature) est perdue à la prochaine génération. Les réglages natifs se font dans `mobile/app.json`.
- `mobile/node_modules/` : se recrée avec `npm install`.

Après une modification, pense à l'envoyer sur GitHub (depuis Windows) :

```bash
git add -A
git commit -m "Description de la modification"
git push
```

---

## Partie 2 — Récupérer le code sur le Mac et le lancer avec Xcode

### Étape 0 — Installer les outils (une seule fois par Mac)

1. **Xcode** : depuis l'App Store. Ouvre-le une première fois, accepte la licence, et laisse-le installer la plateforme **iOS** s'il le propose.
2. **Node.js** (version LTS) : https://nodejs.org → télécharge et installe le `.pkg`.
3. **CocoaPods** (gestionnaire de bibliothèques iOS), dans le Terminal :
   ```bash
   brew install cocoapods
   ```
   Si `brew` n'existe pas, installe d'abord Homebrew : https://brew.sh
4. Vérification :
   ```bash
   node -v && pod --version && xcodebuild -version
   ```
   Les trois commandes doivent afficher un numéro de version.

### Étape 1 — Récupérer le code

```bash
cd ~/Documents
git clone https://github.com/andhy-leong/ShapeApp.git
cd ShapeApp/mobile
```

(Si le dépôt est privé, GitHub te demandera ton identifiant et un *Personal Access Token* à la place du mot de passe : GitHub › Settings › Developer settings › Personal access tokens.)

### Étape 2 — Installer les dépendances

```bash
npm install
```

### Étape 3 — Vérifier l'identifiant de l'app

Si tu as déjà modifié `app.json` sur Windows et poussé sur GitHub, rien à faire. Sinon, c'est le moment de changer le `bundleIdentifier` si besoin (Partie 1, point 4).

### Étape 4 — Recréer le fichier `.env`

```bash
cp .env.example .env
open -e .env
```

Remplace l'adresse par celle de ton serveur, enregistre, ferme.

### Étape 5 — Générer le projet Xcode

```bash
npx expo prebuild -p ios --clean
```

Cela crée le dossier `ios/` et installe les bibliothèques natives (quelques minutes la première fois).

**Si tu veux compiler sans Apple Santé** (par exemple parce que Xcode refuse HealthKit avec ton compte gratuit, voir *Problèmes fréquents*) :

```bash
FITVISION_NO_HEALTHKIT=1 npx expo prebuild -p ios --clean
```

### Étape 6 — Ouvrir dans Xcode

```bash
open ios/FitVision.xcworkspace
```

⚠️ Ouvre bien le fichier **`.xcworkspace`** (blanc), **pas** le `.xcodeproj` (bleu), sinon la compilation échoue.

### Étape 7 — Signer l'app avec ton compte Apple gratuit

1. **Xcode › Settings… › Accounts** › bouton **+** › *Apple ID* › connecte-toi.
2. Dans la colonne de gauche, clique sur le projet **FitVision** (icône bleue tout en haut).
3. Sous *TARGETS*, sélectionne **FitVision** › onglet **Signing & Capabilities**.
4. Coche **Automatically manage signing**.
5. **Team** : choisis **« Andhy Leong (Personal Team) »**.
6. S'il y a une erreur rouge sur le *Bundle Identifier*, voir Partie 1, point 4.

### Étape 8 — Préparer l'iPhone

1. Branche l'iPhone au Mac avec un câble, déverrouille-le et touche **« Se fier à cet ordinateur »**.
2. Sur l'iPhone : **Réglages › Confidentialité et sécurité › Mode développeur** › activer › redémarrer › confirmer.
   (Si l'option n'apparaît pas, elle apparaîtra après la première tentative d'installation depuis Xcode.)

### Étape 9 — Compiler en mode « Release »

Pour que l'app fonctionne **seule**, sans le Mac allumé à côté :

**Product › Scheme › Edit Scheme…** › **Run** (à gauche) › onglet **Info** › **Build Configuration : Release** › Close.

### Étape 10 — Installer

1. En haut de Xcode, choisis ton **iPhone** dans la liste des appareils.
2. Clique sur **▶︎** (ou `Cmd + R`). La première compilation prend plusieurs minutes.
3. Au premier lancement, iOS bloque l'app (*« Développeur non approuvé »*) :
   **Réglages › Général › VPN et gestion de l'appareil** › ton identifiant Apple › **Faire confiance**.
4. Relance l'app. 🎉

### Étape 11 — Dans l'app

1. Crée ton compte, fais l'onboarding (et autorise Santé si tu l'as compilé avec).
2. **Profil › Intelligence artificielle** : choisis Claude, ChatGPT ou Gemini et colle ta clé API.

---

## Partie 3 — Les fois suivantes

### Récupérer une nouvelle version du code

```bash
cd ~/Documents/ShapeApp
git pull
cd mobile
npm install
```

Ensuite :

| Ce qui a changé | Ce que tu fais |
|---|---|
| Seulement des fichiers dans `src/` (écrans, textes, couleurs…) | Directement **▶︎ Run** dans Xcode |
| `app.json`, `app.config.ts`, `package.json` (nouvelle bibliothèque), icône | `npx expo prebuild -p ios --clean` puis rouvre le `.xcworkspace`, **refais l'étape 7** (Team) et l'étape 9 (Release), puis **▶︎ Run** |
| Tu ne sais pas | Fais la version longue (prebuild), ça marche toujours |

> Le `--clean` efface le dossier `ios/` : c'est normal, il est recréé. C'est pour ça qu'il faut refaire le choix de la Team.

### Tous les 7 jours

Avec un compte Apple gratuit, l'app **cesse de s'ouvrir au bout de 7 jours**. Rebranche l'iPhone, ouvre le projet dans Xcode et clique sur **▶︎ Run** : elle repart pour 7 jours, sans perdre tes données (elles sont sur ton serveur).

---

## Problèmes fréquents

| Message / symptôme | Solution |
|---|---|
| *« Failed to register bundle identifier »* | L'identifiant est déjà pris : change `bundleIdentifier` dans `app.json` (Partie 1, point 4), puis prebuild. |
| *« Personal development teams… do not support the HealthKit capability »* ou erreur de profil mentionnant HealthKit | Ton compte gratuit n'accepte pas HealthKit : refais l'étape 5 avec `FITVISION_NO_HEALTHKIT=1`. L'app fonctionne sans Santé. |
| *« Développeur non approuvé »* sur l'iPhone | Réglages › Général › VPN et gestion de l'appareil › Faire confiance. |
| *« Developer Mode disabled »* | Étape 8, point 2. |
| *« The maximum number of apps for free development profiles has been reached »* | Compte gratuit = 3 apps max. Supprime une autre app de test de l'iPhone. |
| *« No such module »* / erreurs de *Pods* | Tu as ouvert le `.xcodeproj` : ouvre le **`.xcworkspace`**. Sinon : `cd ios && pod install`. |
| Écran blanc / *« Could not connect to development server »* | Tu as compilé en *Debug* : passe en **Release** (étape 9). |
| *« Pas de connexion au serveur »* dans l'app | Vérifie `mobile/.env` (https, pas de `/` final), teste `/health` dans Safari, puis **recompile** (le `.env` est lu à la compilation). |
| *« L'URL de l'API n'est pas configurée »* | Le fichier `mobile/.env` manque sur le Mac : étape 4, puis recompile. |
| *« Clé … refusée »* dans l'app | La clé IA est fausse ou sans crédit : Profil › Intelligence artificielle. |
| L'app ne s'ouvre plus du tout | Les 7 jours sont passés : **▶︎ Run** dans Xcode. |

---

## Récapitulatif express (à garder sous la main)

```bash
# Première fois
git clone https://github.com/andhy-leong/ShapeApp.git
cd ShapeApp/mobile
npm install
cp .env.example .env && open -e .env        # mettre l'URL du serveur
npx expo prebuild -p ios --clean            # ou FITVISION_NO_HEALTHKIT=1 npx expo prebuild -p ios --clean
open ios/FitVision.xcworkspace
# Xcode : Team = Personal Team › Scheme en Release › choisir l'iPhone › ▶︎

# Mises à jour
git pull && npm install
npx expo prebuild -p ios --clean            # si app.json / package.json ont changé
open ios/FitVision.xcworkspace              # Team + Release › ▶︎
```

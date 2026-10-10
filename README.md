# ♔ Mon Coach Échecs

**Application Desktop d'Entraînement aux Échecs Assistée par IA Locale**  
*Ergonomie 100 % souris • Zéro ligne de commande en jeu • Confidentialité et autonomie totales (100 % hors-ligne & local)*

---

## 📑 Table des Matières

1. [Présentation et Philosophie](#-présentation-et-philosophie)
2. [Architecture Technique](#-architecture-technique)
3. [Fonctionnalités Détaillées](#-fonctionnalités-détaillées)
   - [Échiquier Fluide 60 FPS (Chessground)](#1-échiquier-fluide-60-fps-chessground)
   - [Adversaire Humain Réaliste (Maia Chess)](#2-adversaire-humain-réaliste-maia-chess)
   - [Garde-fou Anti-Gaffe en Temps Réel](#3-garde-fou-anti-gaffe-en-temps-réel)
   - [Coach Pédagogique Local (DeepSeek-R1)](#4-coach-pédagogique-local-deepseek-r1)
   - [Gestion PGN, Navigation & Undo](#5-gestion-pgn-navigation--undo)
   - [Effets Sonores Procéduraux](#6-effets-sonores-procéduraux)
4. [Prérequis Matériels et Logiciels](#-prérequis-matériels-et-logiciels)
5. [Installation Rapide](#-installation-rapide)
6. [Lancement en Mode Développement](#-lancement-en-mode-développement)
7. [Exécution des Tests Unitaires](#-exécution-des-tests-unitaires)
8. [Guide de Compilation et Packaging](#-guide-de-compilation-et-packaging)
   - [Pour Windows (Installateur NSIS .exe)](#-compilation-pour-windows-10--11)
   - [Pour Linux (AppImage & Dépaqueté)](#-compilation-pour-linux-ubuntu-debian-pop_os-etc)
9. [Structure des Dossiers et Binaires Embarqués](#-structure-des-dossiers-et-binaires-embarqués)
10. [Dépannage & FAQ](#-dépannage--faq)

---

## 🎯 Présentation et Philosophie

Les plateformes d'échecs en ligne (Chess.com, etc.) enferment généralement leurs explications pédagogiques textuelles derrière des abonnements récurrents payants. De leur côté, les logiciels open-source traditionnels (Scid vs PC, Arena, En-Croissant) sont souvent austères, complexes à configurer et incapables d'expliquer une erreur en langage naturel compréhensible.

**Mon Coach Échecs** résout ce problème en combinant la puissance du calcul d'échecs open-source et des modèles de raisonnement d'IA modernes exécutés localement :
- **Un adversaire naturel** : les réseaux neuronaux **Maia Chess** reproduisent les erreurs et l'instinct des joueurs humains de club plutôt que le jeu froid et inhumain d'un moteur traditionnel bridé.
- **Un arbitre infaillible** : **Stockfish 19** calcule instantanément en arrière-plan la valeur des positions et les gaffes tactiques.
- **Un coach bienveillant** : **DeepSeek-R1** (via Ollama) traduit la variante calculée par Stockfish en une explication verbale claire (2-3 phrases) sans jamais inventer de coups illégaux.
- **Zéro abonnement, zéro fuite de données** : tout fonctionne sur votre propre ordinateur (CPU + GPU).

---

## 🏛 Architecture Technique

L'application repose sur une architecture découplée assurant une réactivité graphique constante (60 fps) sans jamais bloquer l'interface lors des calculs d'échecs ou des inférences d'IA :

```
┌────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION ELECTRON                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    PROCESSUS RENDERER (UI)                       │  │
│  │  • React 19 + Tailwind CSS (Interface sombre moderne)            │  │
│  │  • Chessground (Moteur officiel Lichess 60 fps, flèches SVG)     │  │
│  │  • chess.js v1.4 (Règles officielles, FEN/PGN, conversion SAN)   │  │
│  │  • Web Audio API (Sons procéduraux zéro latence)                 │  │
│  │  • Modules UI : Bulle Coach, EvalBar, Alerte Gaffe, Historique   │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
│                                    │ IPC (contextBridge / preload.ts)  │
│  ┌─────────────────────────────────▼────────────────────────────────┐  │
│  │                    PROCESSUS MAIN (Node.js)                      │  │
│  │  • Orchestration du cycle de vie de l'application                │  │
│  │  • Pilotage des sous-processus UCI (stdin/stdout)                │  │
│  │  • Gestionnaire de timeouts 5s & auto-restart                    │  │
│  │  • Client HTTP local vers Ollama (127.0.0.1:11434)               │  │
│  │  • Traduction des variantes en français & suppression <think>    │  │
│  │  • Nettoyage des processus zombies à la fermeture (before-quit)  │  │
│  └──────────────┬───────────────────────────────┬───────────────────┘  │
└─────────────────┼───────────────────────────────┼──────────────────────┘
                  │ Child Process (CPU)           │ HTTP (localhost:11434)
                  ▼                               ▼
       ┌──────────────────────┐        ┌──────────────────────┐
       │   MOTEURS D'ÉCHECS   │        │     OLLAMA LOCAL     │
       │                      │        │                      │
       │ • lc0 / lc0.exe      │        │ • DeepSeek-R1 14B    │
       │   (Maia 1100-1500)   │        │   (ou 8B / 7B auto)  │
       │ • stockfish / .exe   │        │   Inférence GPU VRAM │
       │   Calcul CPU 100%    │        │   Raisonnement local │
       └──────────────────────┘        └──────────────────────┘
```

---

## ⚡ Fonctionnalités Détaillées

### 1. Échiquier Fluide 60 FPS (Chessground)
- Moteur d'affichage officiel de **Lichess**, adapté pour Electron.
- Manipulation 100 % souris : clic-par-clic ou glisser-déposer intuitif.
- Surbrillance instantanée des cases de destination légale dès qu'une pièce est touchée.
- Tracé vectoriel SVG de flèches menaçantes (en rouge) et de coups recommandés (en vert).
- Redimensionnement automatique réactif s'adaptant à toutes les tailles d'écran.

### 2. Adversaire Humain Réaliste (Maia Chess)
Les moteurs traditionnels réduits en force se contentent souvent de jouer des coups parfaits puis de donner une pièce au hasard. Maia Chess fonctionne différemment :
- Pilotage de Leela Chess Zero (`lc0.exe` compilé en mode CPU/DNNL pour éliminer tout conflit de pilotes graphiques).
- Poids de réseaux neuronaux entraînés sur des millions de parties réelles Lichess :
  - **Maia 1100** : Niveau *Débutant* (erreurs de vision immédiate, pièces non protégées).
  - **Maia 1300** : Niveau *Amateur* (tactiques de base maîtrisées, erreurs stratégiques).
  - **Maia 1500** : Niveau *Intermédiaire* (solide en club, erreurs en fin de partie).
  - **Stockfish** : Niveau *Maître* sans restriction.
- Mode d'exécution `go nodes 1` : décision quasi instantanée (< 20 ms), reproduisant fidèlement l'instinct humain sans calcul d'arbre artificiel.

### 3. Garde-fou Anti-Gaffe en Temps Réel
1. Dès que vous effectuez un coup sur l'échiquier, Stockfish évalue la position résultante à profondeur rapide `depth 10` (~30 ms).
2. Si votre coup provoque une **chute d'évaluation supérieure à -2.0 pions** (perte d'une pièce mineure ou mat concédé) :
   - Le coup n'est **pas** transmis au bot.
   - Un bandeau d'alerte rouge apparaît avec indication du delta de pions perdu.
   - La case de la pièce gaffée et la flèche de réfutation adverse s'affichent sur l'échiquier.
   - Trois choix immédiats en un clic :
     - **[Reprendre mon coup]** : annule immédiatement le coup sur l'échiquier pour vous laisser rejouer.
     - **[Jouer quand même]** : valide le coup et laisse le bot vous punir.
     - **[Pourquoi ce coup est mauvais ?]** : consulte l'analyse du Coach IA.

### 4. Coach Pédagogique Local (DeepSeek-R1)
- **Zéro Hallucination Échiquéenne** :
  - Le modèle de langage n'invente aucun coup : Stockfish calcule la séquence de réfutation tactique exacte.
  - `chess.js` convertit cette variante en français descriptif clair (ex. : *« Le Fou adverse prend en f7 avec échec au Roi, forçant le Roi en e7, puis la Dame capture la Tour en a8 »*).
  - Le LLM reçoit ce contexte et en explique la raison pédagogique en 2 ou 3 phrases bienveillantes.
- **Deux styles de vocabulaire configurables** :
  - **Grand Débutant** : interdiction du jargon abstrait, explications très visuelles (*« ton fou n'était plus protégé »*, *« la tour adverse vise directement ton roi »*).
  - **Club / Intermédiaire** : utilisation des termes formels (*fourchette*, *clouage*, *déviation*, *tempo*, *case faible*).
- **Post-traitement strict** : suppression automatique des balises `<think>...</think>` générées par DeepSeek-R1 pour ne présenter que le conseil final.

### 5. Gestion PGN, Navigation & Undo
- Enregistrement en direct de chaque demi-coup joué dans la notation standard PGN.
- Tableau historique à 2 colonnes (Blancs et Noirs) avec numéro de coup.
- Barre de navigation temporelle : premier coup (`|<<`), coup précédent (`<`), coup suivant (`>`), dernier coup (`>>`).
- Clic sur n'importe quel coup passé pour explorer la position sur l'échiquier.
- Bouton **« Reprendre » (Undo) illimité**.
- **Export PGN en 1 clic** (copie presse-papier ou sauvegarde dans un fichier `.pgn` sur le disque dur).
- **Import PGN / FEN** : collez n'importe quelle partie externe ou position pour la rejouer ou l'étudier.

### 6. Effets Sonores Procéduraux
- Moteur audio intégré basé sur la **Web Audio API** standard :
  - Clic doux en bois pour le déplacement de pièces.
  - Son d'impact net pour les captures.
  - Double sonnerie d'avertissement pour les échecs au Roi.
  - Son dissonant subtil pour l'alerte gaffe.
  - Carillon majeur pour les réponses du coach.
- Zéro fichier audio externe requis, zéro latence, fonctionne sans connexion.

---

## 💻 Prérequis Matériels et Logiciels

### Matériel Recommandé
- **Système d'exploitation** : Windows 10 / 11 (64 bits) ou Linux (Ubuntu 20.04+, Pop!_OS, Debian, etc.).
- **Processeur (CPU)** : 4 cœurs ou plus (les moteurs Stockfish et Lc0 CPU tournent sur le processeur).
- **Carte Graphique (GPU)** :
  - **Recommandé** : Carte NVIDIA avec 16 Go de VRAM (ex. RTX 4080 / 4090 ou RTX 3090) pour exécuter `deepseek-r1:14b` à pleine vitesse en VRAM (~9 Go d'empreinte).
  - **Compatible** : Carte avec 8 à 12 Go de VRAM avec les modèles `deepseek-r1:8b` ou `deepseek-r1:7b` (auto-détectés automatiquement).
- **Mémoire Vive (RAM)** : 16 Go recommandés.

### Logiciels Prérequis
1. **Node.js** (version 20 LTS ou supérieure) : [https://nodejs.org](https://nodejs.org)
2. **Ollama** : [https://ollama.com](https://ollama.com)
   - Téléchargez et installez Ollama.
   - Téléchargez le modèle DeepSeek-R1 de votre choix :
     ```bash
     # Modèle recommandé (14B, ~9 Go VRAM) :
     ollama run deepseek-r1:14b

     # OU modèle plus léger (8B, ~5 Go VRAM) :
     ollama run deepseek-r1:8b
     ```

---

## 🚀 Installation Rapide

1. **Cloner ou ouvrir le projet** :
   ```bash
   cd /chemin/vers/chess
   ```

2. **Installer les dépendances Node.js** :
   ```bash
   npm install
   ```

3. **Télécharger et configurer les moteurs d'échecs et poids Maia** :
   ```bash
   npm run setup:engines
   ```
   *Ce script vérifie la présence des exécutables officiels Stockfish, Lc0 CPU et télécharge automatiquement les poids neuronaux `maia-1100.pb.gz`, `maia-1300.pb.gz`, `maia-1500.pb.gz` dans `resources/bin/`.*

---

## 🛠 Lancement en Mode Développement

Pour lancer l'application en mode développement avec rechargement à chaud (Hot Module Replacement) :

```bash
npm run dev
```

L'application Electron s'ouvre automatiquement connectée à Ollama et prête pour une partie !

---

## 🧪 Exécution des Tests Unitaires

Le projet inclut une suite complète de **18 tests unitaires automatisés** sous **Vitest**, validant la logique métier sans dépendance extérieure :
- Calcul mathématique des deltas et détection de gaffes ($> 2.0$ pions).
- Parsing complet des flux UCI Stockfish (scores en centipions, scores de mat `+M` / `-M`, variantes PV).
- Traduction automatique des coups en français clair via `chess.js`.
- Élimination rigoureuse des balises de réflexion `<think>...</think>`.
- Règles du jeu d'échecs, légalité des coups, export/import PGN, et annulation de coups.

Lancer la suite de tests :
```bash
npm test
```

Pour lancer les tests en mode écoute continue (watch) :
```bash
npm run test:watch
```

---

## 📦 Guide de Compilation et Packaging

Le projet utilise **Vite** pour le bundling et **electron-builder** pour générer les paquets installables complets incluant les binaires natifs.

### 🖥 Compilation pour Windows (10 / 11)

L'application cible Windows sous deux formes de distribution :
1. **Archive autonome portable (`.zip`)** ou dossier dépaqueté (`win-unpacked/`) générable directement depuis Linux ou Windows sans outil tiers.
2. **Installateur automatique NSIS (`Setup-MonCoachEchecs.exe`)** avec raccourcis Bureau et Menu Démarrer.

#### Étape 1 : Vérifier les binaires Windows dans `resources/bin/`
Les fichiers requis sont automatiquement mis en place par `npm run setup:engines` :
- `stockfish.exe` (exécutable officiel Stockfish x64)
- `lc0.exe` (exécutable Leela Chess Zero CPU/DNNL)
- `dnnl.dll`, `mimalloc-override.dll`, `mimalloc-redirect.dll`
- `weights/maia-1100.pb.gz`, `maia-1300.pb.gz`, `maia-1500.pb.gz`

#### Étape 2 : Lancer la compilation pour Windows

- **Générer le paquet portable Windows Zip (`release/Setup-MonCoachEchecs.zip`)** :
  ```bash
  npm run package:win:zip
  ```
  *(Fonctionne directement sous Linux comme sous Windows, zéro dépendance externe).*

- **Générer le dossier dépaqueté Windows (`release/win-unpacked/`)** :
  ```bash
  npm run package:win:dir
  ```

- **Générer l'installateur NSIS (`release/Setup-MonCoachEchecs.exe`)** :
  - **Sous Windows** : exécutez directement :
    ```cmd
    npm run package:win
    ```
  - **Sous Linux (cross-compilation NSIS)** : installez `wine` (`sudo apt install wine`) puis lancez `npm run package:win`.

---

### 🐧 Compilation pour Linux (Ubuntu, Debian, Pop!_OS, etc.)

#### Étape 1 : Compiler l'application et les bundles
```bash
npm run build
```

#### Étape 2 : Générer les paquets Linux

- **Générer le paquet AppImage autonome (`release/Mon Coach Échecs-1.0.0.AppImage`)** :
  ```bash
  npm run package:linux
  ```

- **Générer le dossier binaire dépaqueté (`release/linux-unpacked/`)** :
  ```bash
  npm run package:linux:dir
  ```

#### Lancement sous Linux :
```bash
# Lancement de l'AppImage :
chmod +x "release/Mon Coach Échecs-1.0.0.AppImage"
./"release/Mon Coach Échecs-1.0.0.AppImage"

# OU lancement direct de la version dépaquetée :
./release/linux-unpacked/mon-coach-echecs
```

---

## 📂 Structure des Dossiers et Binaires Embarqués

```
chess/
├── electron-builder.json5       # Configuration de packaging NSIS Windows & Linux
├── package.json                 # Scripts npm et dépendances
├── tsconfig.json                # Configuration TypeScript
├── vite.config.ts               # Configuration Vite + Electron
├── tailwind.config.js           # Configuration Tailwind CSS (thème sombre)
│
├── scripts/
│   └── setup-engines.mjs        # Téléchargement auto des binaires et poids Maia
│
├── resources/
│   └── bin/                     # Binaires embarqués dans l'application finale
│       ├── stockfish            # Binaire Linux Stockfish 19 x64
│       ├── stockfish.exe        # Binaire Windows Stockfish 19 x64
│       ├── lc0.exe              # Binaire Windows Leela Chess Zero CPU/DNNL
│       ├── dnnl.dll             # Bibliothèque Intel oneDNN pour Lc0
│       ├── mimalloc-*.dll       # Allocateur mémoire ultra-rapide pour Lc0
│       └── weights/             # Poids neuronaux humains Maia Chess
│           ├── maia-1100.pb.gz  # Réseau niveau Débutant (~1100 Elo)
│           ├── maia-1300.pb.gz  # Réseau niveau Amateur (~1300 Elo)
│           └── maia-1500.pb.gz  # Réseau niveau Club (~1500 Elo)
│
├── src/
│   ├── main/                    # Processus Principal Node.js (Electron)
│   │   ├── index.ts             # Cycle de vie, fenêtres, handlers IPC, cleanup
│   │   ├── preload.ts           # Pont sécurisé contextBridge (window.chessAPI)
│   │   ├── uci/
│   │   │   ├── uci-process.ts   # Gestion robuste des sous-processus (timeout 5s)
│   │   │   ├── uci-parser.ts    # Parseur pur de scores, mat (+M/-M) et PV
│   │   │   ├── stockfish-service.ts # Évaluations rapides et approfondies
│   │   │   └── maia-service.ts  # Pilotage Maia / Lc0 (go nodes 1)
│   │   └── ai/
│   │       ├── ollama-service.ts # Client HTTP vers localhost:11434
│   │       └── prompt-builder.ts # Traduction française & nettoyage <think>
│   │
│   ├── renderer/                # Processus Rendu Graphique (React 19)
│   │   ├── App.tsx              # Composant principal et agencement
│   │   ├── main.tsx             # Point d'entrée React
│   │   ├── components/
│   │   │   ├── Chessboard.tsx   # Échiquier Chessground 60 fps avec flèches SVG
│   │   │   ├── EvalBar.tsx      # Jauge verticale d'évaluation en temps réel
│   │   │   ├── BlunderAlert.tsx # Bandeau interactif d'alerte gaffe
│   │   │   ├── CoachPanel.tsx   # Bulle de dialogue interactive du Coach IA
│   │   │   ├── MoveHistory.tsx  # Tableau des coups et navigation temporelle
│   │   │   ├── GameControls.tsx # Sélecteurs de niveau, couleur, nouveau jeu
│   │   │   ├── PgnModal.tsx     # Modale d'export/import PGN et FEN
│   │   │   └── SettingsModal.tsx # Panneau d'état des IA et sélection modèle
│   │   ├── hooks/
│   │   │   ├── useChessGame.ts  # Machine d'état complète de la partie
│   │   │   └── useAudio.ts      # Synthétiseur de sons procéduraux Web Audio
│   │   ├── styles/
│   │   │   └── index.css        # Tailwind CSS + styles intégrés Chessground
│   │   └── types/
│   │       └── chess.d.ts       # Interfaces TypeScript communes
│   │
│   └── tests/                   # Suite de tests unitaires Vitest (18 tests)
│       ├── blunder-detector.test.ts # Détection mathématique des gaffes
│       ├── uci-parser.test.ts       # Parsing Stockfish scores et PV
│       ├── prompt-builder.test.ts   # Traduction française et filtre <think>
│       └── chess-rules.test.ts      # Validation des règles chess.js
│
└── release/                     # Dossier de sortie des installateurs finaux
```

---

## ❓ Dépannage & FAQ

### 1. Le Coach IA indique « [Coach Hors-ligne] »
- **Cause** : Le service Ollama n'est pas démarré ou n'écoute pas sur le port par défaut `11434`.
- **Solution** :
  1. Ouvrez un terminal et tapez `ollama serve`.
  2. Vérifiez que le modèle est bien téléchargé en tapant `ollama list`.
  3. Cliquez sur le badge « Ollama » dans l'en-tête de l'application ou ouvrez les **Réglages** puis cliquez sur l'icône de rafraîchissement.

### 2. Comment changer de modèle Ollama ?
- Dans l'application, cliquez sur le bouton **Réglages** (icône d'engrenage) en bas à droite.
- Si plusieurs modèles sont installés (ex. `deepseek-r1:14b`, `deepseek-r1:8b`, `deepseek-r1:7b`), un menu déroulant vous permet de sélectionner instantanément le modèle actif sans redémarrer l'application.

### 3. Comment désactiver temporairement le Garde-fou Anti-Gaffe ?
- Dans le panneau de droite, sous les boutons de couleur, cliquez sur le bouton **Anti-Gaffe** pour basculer l'état sur `OFF`. Vos coups seront immédiatement joués et transmis au bot sans filtre de vérification.

### 4. Les processus Stockfish ou Lc0 restent-ils actifs après la fermeture ?
- **Non** : l'application écoute l'événement Electron `before-quit`. Elle envoie la commande formelle `quit` aux moteurs, stoppe les flux `stdin`/`stdout`, et sous Windows déclenche un nettoyage ciblé pour garantir que **100 % de la RAM et de la VRAM sont immédiatement libérées**.

---

## 📜 Licence

Ce projet est sous licence open-source MIT.  
- **Stockfish** est sous licence GNU GPL v3 (official-stockfish).  
- **Leela Chess Zero (Lc0)** est sous licence GNU GPL v3.  
- **Maia Chess** est développé par le CSSLab de l'Université de Toronto sous licence GPL v3.  
- **Chessground** est sous licence GNU GPL v3 (Lichess.org).

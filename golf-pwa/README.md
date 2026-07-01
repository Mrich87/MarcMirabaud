# Golf Stats

PWA React (offline-first, IndexedDB via Dexie) pour suivre des statistiques de golf et générer des carnets de parcours.

## Fonctionnalités

- Saisie trou par trou : score, fairway touché (Gauche/Centre/Droite), GIR, putts, pénalités, up & down
- Gestion de plusieurs parcours avec par / index / distances par trou et par départ
- Carnet de parcours : notes par trou (club de départ, zones à éviter, cassure des greens, stratégie)
- Stats agrégées : fairways touchés, GIR%, putts/tour, scoring par par-3/4/5, évolution du score
- Approche DECADE : suivi des distances de wedge (carry, dispersion latérale) et stats par club
- Export CSV des rounds
- Installable sur iPhone (Ajouter à l'écran d'accueil) et fonctionne hors-ligne (service worker + IndexedDB)

## Développement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Toutes les données sont stockées localement dans le navigateur (IndexedDB) — rien n'est envoyé à un serveur.

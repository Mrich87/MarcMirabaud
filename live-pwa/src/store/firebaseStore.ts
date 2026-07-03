import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, onValue, ref, remove, set } from 'firebase/database';
import type { Game } from '../types';
import { firebaseConfig } from '../firebaseConfig';
import type { GameStore } from './GameStore';

function normalizeGame(raw: unknown): Game | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Game;
  // RTDB stores empty objects/arrays as missing keys; restore them.
  return {
    ...g,
    pars: Array.isArray(g.pars) ? g.pars : Object.values(g.pars ?? {}),
    players: Array.isArray(g.players) ? g.players : Object.values(g.players ?? {}),
    scores: g.scores ?? {},
  };
}

export function createFirebaseStore(): GameStore {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  // Anonymous sign-in lets security rules require an authenticated caller
  // without asking players to create an account. Non-fatal if the project
  // hasn't enabled it — open rules still work.
  signInAnonymously(getAuth(app)).catch(() => {});

  return {
    label: 'en ligne',
    async createGame(game: Game) {
      await set(ref(db, `games/${game.code}`), game);
    },
    async fetchGame(code: string) {
      return new Promise((resolve, reject) => {
        onValue(
          ref(db, `games/${code}`),
          (snap) => resolve(normalizeGame(snap.val())),
          (err) => reject(err),
          { onlyOnce: true },
        );
      });
    },
    subscribe(code: string, onChange: (game: Game | null) => void) {
      const gameRef = ref(db, `games/${code}`);
      return onValue(gameRef, (snap) => onChange(normalizeGame(snap.val())));
    },
    async setScore(code: string, playerId: string, holeIndex: number, strokes: number | null) {
      const scoreRef = ref(db, `games/${code}/scores/${playerId}/${holeIndex}`);
      if (strokes == null) await remove(scoreRef);
      else await set(scoreRef, strokes);
    },
  };
}

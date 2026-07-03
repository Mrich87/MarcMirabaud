import type { Game } from '../types';
import type { GameStore } from './GameStore';

// Demo/fallback store: persists games in localStorage and syncs other tabs of
// the same browser via BroadcastChannel. No cross-device sync — it exists so
// the app is fully usable (and testable) before Firebase is configured.

const STORAGE_KEY = 'live-golf-games';
const CHANNEL = 'live-golf-sync';

function readAll(): Record<string, Game> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeAll(games: Record<string, Game>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export function createLocalStore(): GameStore {
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  // Same-tab subscribers are notified synchronously so rapid interactions
  // (double-tap on +) always see the latest value; BroadcastChannel only
  // reaches other tabs, asynchronously.
  const localSubscribers = new Set<(code: string) => void>();

  function broadcast(code: string) {
    for (const notify of localSubscribers) notify(code);
    channel?.postMessage(code);
  }

  return {
    label: 'démo locale (hors-ligne, cet appareil seulement)',
    async createGame(game: Game) {
      const games = readAll();
      games[game.code] = game;
      writeAll(games);
      broadcast(game.code);
    },
    async fetchGame(code: string) {
      return readAll()[code] ?? null;
    },
    subscribe(code: string, onChange: (game: Game | null) => void) {
      onChange(readAll()[code] ?? null);
      const onLocal = (changed: string) => {
        if (changed === code) onChange(readAll()[code] ?? null);
      };
      const onMessage = (e: MessageEvent) => {
        if (e.data === code) onChange(readAll()[code] ?? null);
      };
      const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) onChange(readAll()[code] ?? null);
      };
      localSubscribers.add(onLocal);
      channel?.addEventListener('message', onMessage);
      window.addEventListener('storage', onStorage);
      return () => {
        localSubscribers.delete(onLocal);
        channel?.removeEventListener('message', onMessage);
        window.removeEventListener('storage', onStorage);
      };
    },
    async setScore(code: string, playerId: string, holeIndex: number, strokes: number | null) {
      const games = readAll();
      const game = games[code];
      if (!game) return;
      game.scores ??= {};
      game.scores[playerId] ??= {};
      if (strokes == null) delete game.scores[playerId][holeIndex];
      else game.scores[playerId][holeIndex] = strokes;
      writeAll(games);
      broadcast(code);
    },
  };
}

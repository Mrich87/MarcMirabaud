import type { Game } from '../types';

// Abstraction over the sync backend so the same UI runs against Firebase
// (real-time, cross-device) or a local demo store (single device, no config).
export interface GameStore {
  readonly label: string;
  createGame(game: Game): Promise<void>;
  fetchGame(code: string): Promise<Game | null>;
  // Calls onChange with every update until the returned unsubscribe fn runs.
  subscribe(code: string, onChange: (game: Game | null) => void): () => void;
  setScore(code: string, playerId: string, holeIndex: number, strokes: number | null): Promise<void>;
}

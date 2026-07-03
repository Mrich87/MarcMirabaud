// Domain types for the live scoring app

export interface Player {
  id: string;
  name: string;
}

// scores[playerId][holeIndex] = strokes (0/undefined = not entered)
export type Scores = Record<string, Record<number, number>>;

export interface Game {
  code: string; // share code, also the id
  name: string;
  courseName: string;
  holesCount: 9 | 18;
  pars: number[]; // length holesCount
  players: Player[];
  scores: Scores;
  createdAt: number;
}

export interface PlayerStanding {
  player: Player;
  gross: number;
  toPar: number;
  thru: number; // holes completed
}

export function computeStandings(game: Game): PlayerStanding[] {
  const standings = game.players.map((player) => {
    const playerScores = game.scores?.[player.id] ?? {};
    let gross = 0;
    let par = 0;
    let thru = 0;
    for (let i = 0; i < game.holesCount; i++) {
      const s = playerScores[i];
      if (s && s > 0) {
        gross += s;
        par += game.pars[i] ?? 4;
        thru += 1;
      }
    }
    return { player, gross, toPar: gross - par, thru };
  });
  // leaders first: lowest to-par, ties broken by more holes played;
  // players who haven't started yet go to the bottom
  standings.sort(
    (a, b) =>
      Number(b.thru > 0) - Number(a.thru > 0) || a.toPar - b.toPar || b.thru - a.thru,
  );
  return standings;
}

export function formatToPar(toPar: number): string {
  if (toPar === 0) return 'E';
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I/L

export function newGameCode(): string {
  let code = '';
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export function newPlayerId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

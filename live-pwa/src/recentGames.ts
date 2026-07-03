// Remembers game codes this device has created or joined, for quick re-entry.

const KEY = 'live-golf-recent';

export interface RecentGame {
  code: string;
  name: string;
  date: string;
}

export function getRecentGames(): RecentGame[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function rememberGame(entry: RecentGame) {
  const list = getRecentGames().filter((g) => g.code !== entry.code);
  list.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
}

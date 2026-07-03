// A simplified, non-official approximation of the World Handicap System index.
// It skips net-double-bogey score capping and the small low-round adjustments,
// so it should be presented as an estimate only, never as an official index.

export function scoreDifferential(score: number, courseRating: number, slopeRating: number): number {
  return ((score - courseRating) * 113) / slopeRating;
}

// How many of the most recent differentials to average, by number available.
// Mirrors the shape of the official WHS table (fewer rounds -> fewer, lower-scoring counted).
function bestCountFor(n: number): number {
  if (n < 3) return 0;
  if (n <= 5) return 1;
  if (n <= 8) return 2;
  if (n <= 11) return 3;
  if (n <= 14) return 4;
  if (n === 15) return 5;
  if (n <= 17) return 6;
  if (n === 18) return 7;
  return 8; // 19-20+
}

// `differentials` must be in chronological order (oldest first); only the most
// recent 20 are considered, per WHS convention.
export function estimateHandicapIndex(differentials: number[]): number | null {
  const recent = differentials.slice(-20);
  const count = bestCountFor(recent.length);
  if (count === 0) return null;
  const best = [...recent].sort((a, b) => a - b).slice(0, count);
  const avg = best.reduce((a, b) => a + b, 0) / best.length;
  return Math.round(avg * 10) / 10;
}

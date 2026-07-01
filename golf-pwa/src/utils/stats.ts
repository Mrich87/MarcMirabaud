import type { Round, HoleResult } from '../types';

export interface RoundSummary {
  totalScore: number;
  totalPar: number;
  toPar: number;
  holesPlayed: number;
  fairwaysHit: number;
  fairwaysPossible: number; // par 4/5 holes with a fairway recorded
  girHit: number;
  girPossible: number;
  totalPutts: number;
  puttsHoles: number;
  totalPenalties: number;
  upDownSuccess: number;
  upDownAttempts: number;
}

export function summarizeRound(round: Round): RoundSummary {
  const summary: RoundSummary = {
    totalScore: 0,
    totalPar: 0,
    toPar: 0,
    holesPlayed: 0,
    fairwaysHit: 0,
    fairwaysPossible: 0,
    girHit: 0,
    girPossible: 0,
    totalPutts: 0,
    puttsHoles: 0,
    totalPenalties: 0,
    upDownSuccess: 0,
    upDownAttempts: 0,
  };

  for (const hole of round.holes) {
    if (hole.score == null) continue;
    summary.holesPlayed += 1;
    summary.totalScore += hole.score;
    summary.totalPar += hole.par;

    if (hole.par !== 3 && hole.fairway) {
      summary.fairwaysPossible += 1;
      if (hole.fairway === 'C') summary.fairwaysHit += 1;
    }

    if (hole.gir != null) {
      summary.girPossible += 1;
      if (hole.gir) summary.girHit += 1;
    }

    if (hole.putts != null) {
      summary.totalPutts += hole.putts;
      summary.puttsHoles += 1;
    }

    summary.totalPenalties += hole.penalties ?? 0;

    if (hole.gir === false && hole.upDown != null) {
      summary.upDownAttempts += 1;
      if (hole.upDown) summary.upDownSuccess += 1;
    }
  }

  summary.toPar = summary.totalScore - summary.totalPar;
  return summary;
}

export interface ParTypeStats {
  par: number;
  rounds: number;
  avgScore: number | null;
  avgToPar: number | null;
}

export interface AggregatedStats {
  roundsCount: number;
  avgScore: number | null;
  avgToPar: number | null;
  fairwayPct: number | null;
  girPct: number | null;
  avgPutts: number | null;
  avgPenalties: number | null;
  upDownPct: number | null;
  byPar: ParTypeStats[];
  fairwayMissBreakdown: { left: number; right: number; hit: number };
}

export function aggregateRounds(rounds: Round[]): AggregatedStats {
  const totals = {
    score: 0,
    par: 0,
    fairwaysHit: 0,
    fairwaysPossible: 0,
    girHit: 0,
    girPossible: 0,
    putts: 0,
    puttsHoles: 0,
    penalties: 0,
    rounds: 0,
    upDownSuccess: 0,
    upDownAttempts: 0,
  };

  const byParMap = new Map<number, { totalScore: number; totalPar: number; count: number }>();
  const missBreakdown = { left: 0, right: 0, hit: 0 };

  for (const round of rounds) {
    const s = summarizeRound(round);
    if (s.holesPlayed === 0) continue;
    totals.rounds += 1;
    totals.score += s.totalScore;
    totals.par += s.totalPar;
    totals.fairwaysHit += s.fairwaysHit;
    totals.fairwaysPossible += s.fairwaysPossible;
    totals.girHit += s.girHit;
    totals.girPossible += s.girPossible;
    totals.putts += s.totalPutts;
    totals.puttsHoles += s.puttsHoles;
    totals.penalties += s.totalPenalties;
    totals.upDownSuccess += s.upDownSuccess;
    totals.upDownAttempts += s.upDownAttempts;

    for (const hole of round.holes) {
      if (hole.score == null) continue;
      const entry = byParMap.get(hole.par) ?? { totalScore: 0, totalPar: 0, count: 0 };
      entry.totalScore += hole.score;
      entry.totalPar += hole.par;
      entry.count += 1;
      byParMap.set(hole.par, entry);

      if (hole.par !== 3 && hole.fairway) {
        if (hole.fairway === 'C') missBreakdown.hit += 1;
        else if (hole.fairway === 'G') missBreakdown.left += 1;
        else if (hole.fairway === 'D') missBreakdown.right += 1;
      }
    }
  }

  const byPar: ParTypeStats[] = [...byParMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([par, v]) => ({
      par,
      rounds: v.count,
      avgScore: v.count ? v.totalScore / v.count : null,
      avgToPar: v.count ? (v.totalScore - v.totalPar) / v.count : null,
    }));

  return {
    roundsCount: totals.rounds,
    avgScore: totals.rounds ? totals.score / totals.rounds : null,
    avgToPar: totals.rounds ? (totals.score - totals.par) / totals.rounds : null,
    fairwayPct: totals.fairwaysPossible ? (totals.fairwaysHit / totals.fairwaysPossible) * 100 : null,
    girPct: totals.girPossible ? (totals.girHit / totals.girPossible) * 100 : null,
    avgPutts: totals.puttsHoles ? (totals.putts / totals.puttsHoles) * 18 : null,
    avgPenalties: totals.rounds ? totals.penalties / totals.rounds : null,
    upDownPct: totals.upDownAttempts ? (totals.upDownSuccess / totals.upDownAttempts) * 100 : null,
    byPar,
    fairwayMissBreakdown: missBreakdown,
  };
}

export function formatToPar(toPar: number): string {
  if (toPar === 0) return 'E';
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}

export function holeTotals(holes: HoleResult[]) {
  return holes.reduce(
    (acc, h) => {
      if (h.score != null) {
        acc.score += h.score;
        acc.par += h.par;
      }
      return acc;
    },
    { score: 0, par: 0 },
  );
}

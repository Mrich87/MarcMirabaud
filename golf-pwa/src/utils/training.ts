import type { Round } from '../types';
import { aggregateRounds } from './stats';

// Benchmarks used to normalize each sector onto a 0-100 "radar" scale.
// `worst` maps to 0 and `best` to 100; values are loosely anchored on
// scratch-level amateur reference numbers.
const BENCHMARKS = {
  fairways: { worst: 20, best: 75 }, // % hit
  gir: { worst: 10, best: 70 }, // %
  putts: { worst: 40, best: 28 }, // per 18 holes (lower is better)
  upDown: { worst: 5, best: 60 }, // %
  penalties: { worst: 4, best: 0 }, // per round (lower is better)
};

function normalize(value: number, worst: number, best: number): number {
  const t = (value - worst) / (best - worst);
  return Math.round(Math.min(1, Math.max(0, t)) * 100);
}

export interface SectorScore {
  sector: string;
  score: number; // 0-100
  raw: string; // display value, e.g. "43%"
}

export interface ImprovementEstimate {
  sector: string;
  detail: string; // what the simulated improvement is
  strokesSaved: number; // per 18-hole round
  basis: string; // where the number comes from
}

export interface TrainingAnalysis {
  sectors: SectorScore[];
  improvements: ImprovementEstimate[]; // sorted, biggest gain first
  roundsUsed: number;
}

// Averages hole scores relative to par, split by a per-hole predicate, so
// improvements are priced from the player's own scoring pattern rather than
// generic tour tables.
function avgToParBy(rounds: Round[], predicate: (h: Round['holes'][number]) => boolean) {
  let sum = 0;
  let count = 0;
  for (const round of rounds) {
    for (const hole of round.holes) {
      if (hole.score == null) continue;
      if (!predicate(hole)) continue;
      sum += hole.score - hole.par;
      count += 1;
    }
  }
  return count ? { avg: sum / count, count } : null;
}

export function analyzeTraining(rounds: Round[], improvementPct: number): TrainingAnalysis | null {
  const played = rounds.filter((r) => r.holes.some((h) => h.score != null));
  if (played.length === 0) return null;

  const agg = aggregateRounds(played);
  if (agg.roundsCount === 0) return null;

  const fairwayPct = agg.fairwayPct ?? 0;
  const girPct = agg.girPct ?? 0;
  const puttsPerRound = agg.avgPutts ?? 36;
  const upDownPct = agg.upDownPct ?? 0;
  const penaltiesPerRound = agg.avgPenalties ?? 0;

  const sectors: SectorScore[] = [
    {
      sector: 'Driving',
      score: normalize(fairwayPct, BENCHMARKS.fairways.worst, BENCHMARKS.fairways.best),
      raw: `${fairwayPct.toFixed(0)}% fairways`,
    },
    {
      sector: 'Approches',
      score: normalize(girPct, BENCHMARKS.gir.worst, BENCHMARKS.gir.best),
      raw: `${girPct.toFixed(0)}% GIR`,
    },
    {
      sector: 'Petit jeu',
      score: normalize(upDownPct, BENCHMARKS.upDown.worst, BENCHMARKS.upDown.best),
      raw: `${upDownPct.toFixed(0)}% up&down`,
    },
    {
      sector: 'Putting',
      score: normalize(puttsPerRound, BENCHMARKS.putts.worst, BENCHMARKS.putts.best),
      raw: `${puttsPerRound.toFixed(1)} putts/tour`,
    },
    {
      sector: 'Pénalités',
      score: normalize(penaltiesPerRound, BENCHMARKS.penalties.worst, BENCHMARKS.penalties.best),
      raw: `${penaltiesPerRound.toFixed(1)} / tour`,
    },
  ];

  const improvements: ImprovementEstimate[] = [];
  const pct = improvementPct / 100;

  // GIR: convert (18 * pct) holes from "missed green" to "green in regulation",
  // priced at the player's own scoring difference between the two situations.
  const girHit = avgToParBy(played, (h) => h.gir === true);
  const girMiss = avgToParBy(played, (h) => h.gir === false);
  if (girHit && girMiss && girMiss.avg > girHit.avg) {
    const holesConverted = 18 * pct;
    improvements.push({
      sector: 'Approches (GIR)',
      detail: `+${improvementPct}% de greens en régulation`,
      strokesSaved: holesConverted * (girMiss.avg - girHit.avg),
      basis: `tu scores ${(girMiss.avg - girHit.avg).toFixed(2)} coup(s) de plus sur un trou sans GIR (${girMiss.count + girHit.count} trous analysés)`,
    });
  }

  // Fairway: same idea on par 4/5 with a recorded fairway result (~14 holes/round).
  const fwHit = avgToParBy(played, (h) => h.par !== 3 && h.fairway === 'C');
  const fwMiss = avgToParBy(played, (h) => h.par !== 3 && (h.fairway === 'G' || h.fairway === 'D'));
  if (fwHit && fwMiss && fwMiss.avg > fwHit.avg) {
    const holesConverted = 14 * pct;
    improvements.push({
      sector: 'Driving (fairways)',
      detail: `+${improvementPct}% de fairways touchés`,
      strokesSaved: holesConverted * (fwMiss.avg - fwHit.avg),
      basis: `tu scores ${(fwMiss.avg - fwHit.avg).toFixed(2)} coup(s) de plus quand tu manques le fairway (${fwMiss.count + fwHit.count} trous analysés)`,
    });
  }

  // Up & down: each additional conversion is roughly one stroke saved.
  const upDownAttemptsPerRound =
    played.reduce(
      (acc, r) => acc + r.holes.filter((h) => h.gir === false && h.upDown != null).length,
      0,
    ) / played.length;
  if (upDownAttemptsPerRound > 0) {
    improvements.push({
      sector: 'Petit jeu (up & down)',
      detail: `+${improvementPct}% d'up & down réussis`,
      strokesSaved: upDownAttemptsPerRound * pct * 1,
      basis: `${upDownAttemptsPerRound.toFixed(1)} occasion(s) d'up & down par tour, chaque conversion ≈ 1 coup`,
    });
  }

  // Putting: reducing total putts is a one-for-one stroke saving.
  if (puttsPerRound > 0) {
    improvements.push({
      sector: 'Putting',
      detail: `−${improvementPct}% de putts`,
      strokesSaved: puttsPerRound * pct,
      basis: `${puttsPerRound.toFixed(1)} putts par tour actuellement`,
    });
  }

  // Penalties: likewise one-for-one (slightly optimistic: ignores the
  // recovery position, but close enough for prioritization).
  if (penaltiesPerRound > 0) {
    improvements.push({
      sector: 'Pénalités',
      detail: `−${improvementPct}% de pénalités`,
      strokesSaved: penaltiesPerRound * pct,
      basis: `${penaltiesPerRound.toFixed(1)} pénalité(s) par tour actuellement`,
    });
  }

  improvements.sort((a, b) => b.strokesSaved - a.strokesSaved);

  return { sectors, improvements, roundsUsed: played.length };
}

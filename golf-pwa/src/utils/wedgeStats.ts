import type { WedgeShot } from '../types';

export interface ClubStats {
  club: string;
  count: number;
  avgCarry: number;
  minCarry: number;
  maxCarry: number;
  carryStdDev: number;
  avgLateralAbs: number;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function clubStats(shots: WedgeShot[]): ClubStats[] {
  const byClub = new Map<string, WedgeShot[]>();
  for (const shot of shots) {
    const list = byClub.get(shot.club) ?? [];
    list.push(shot);
    byClub.set(shot.club, list);
  }

  return [...byClub.entries()]
    .map(([club, list]) => {
      const carries = list.map((s) => s.carryDistance);
      const laterals = list.map((s) => Math.abs(s.lateralDispersion));
      return {
        club,
        count: list.length,
        avgCarry: carries.reduce((a, b) => a + b, 0) / carries.length,
        minCarry: Math.min(...carries),
        maxCarry: Math.max(...carries),
        carryStdDev: stdDev(carries),
        avgLateralAbs: laterals.reduce((a, b) => a + b, 0) / laterals.length,
      };
    })
    .sort((a, b) => b.avgCarry - a.avgCarry);
}

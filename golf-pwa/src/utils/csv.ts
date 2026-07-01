import type { Round } from '../types';

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const HEADERS = [
  'date',
  'parcours',
  'depart',
  'trou',
  'par',
  'score',
  'diff_par',
  'fairway',
  'gir',
  'putts',
  'penalites',
  'up_and_down',
];

export function roundsToCsv(rounds: Round[]): string {
  const lines = [HEADERS.join(';')];

  for (const round of rounds) {
    for (const hole of round.holes) {
      if (hole.score == null) continue;
      const row = [
        round.date,
        round.courseName,
        round.teeName,
        hole.number,
        hole.par,
        hole.score,
        hole.score - hole.par,
        hole.par === 3 ? '' : hole.fairway ?? '',
        hole.gir == null ? '' : hole.gir ? 'oui' : 'non',
        hole.putts ?? '',
        hole.penalties ?? 0,
        hole.gir === false ? (hole.upDown == null ? '' : hole.upDown ? 'oui' : 'non') : '',
      ];
      lines.push(row.map(csvEscape).join(';'));
    }
  }

  return lines.join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { db } from '../../db';
import PageHeader from '../../components/PageHeader';
import { analyzeTraining } from '../../utils/training';

const IMPROVEMENT_CHOICES = [2, 5, 10, 15];

export default function Training() {
  const rounds = useLiveQuery(() => db.rounds.orderBy('date').toArray(), []);
  const [improvementPct, setImprovementPct] = useState(5);

  if (!rounds) return null;

  const analysis = analyzeTraining(rounds, improvementPct);

  if (!analysis) {
    return (
      <>
        <PageHeader title="Entraînement" />
        <main className="app-main">
          <div className="empty-state">
            Enregistre au moins un round (avec GIR, putts, fairways...) pour voir ton profil de jeu
            et les secteurs où tu gagnes le plus de coups.
          </div>
        </main>
      </>
    );
  }

  const weakest = [...analysis.sectors].sort((a, b) => a.score - b.score)[0];

  return (
    <>
      <PageHeader title="Entraînement" />
      <main className="app-main">
        <div className="section-title">Profil de jeu ({analysis.roundsUsed} rounds)</div>
        <div className="card" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={analysis.sectors} outerRadius="70%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="sector" fontSize={11} stroke="var(--muted)" />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip
                formatter={(value, _name, item) => [
                  `${value}/100 (${(item.payload as { raw: string }).raw})`,
                  'Niveau',
                ]}
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
              <Radar dataKey="score" stroke="#1e7a3a" fill="#2c9b4a" fillOpacity={0.45} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: -6 }}>
          Échelle 0–100 par secteur (100 ≈ niveau scratch). Ton secteur le plus faible :{' '}
          <strong>{weakest.sector}</strong> ({weakest.raw}).
        </p>

        <div className="section-title">Coups gagnés par amélioration</div>
        <div className="field">
          <label>Amélioration simulée</label>
          <select value={improvementPct} onChange={(e) => setImprovementPct(Number(e.target.value))}>
            {IMPROVEMENT_CHOICES.map((p) => (
              <option key={p} value={p}>
                +{p}%
              </option>
            ))}
          </select>
        </div>

        {analysis.improvements.length === 0 && (
          <div className="empty-state">
            Pas encore assez de détail (GIR, fairways, putts...) dans tes rounds pour simuler des
            gains par secteur.
          </div>
        )}
        {analysis.improvements.map((imp, i) => (
          <div className="card" key={imp.sector}>
            <div className="list-item">
              <div>
                <div className="title">
                  {i === 0 && '🎯 '}
                  {imp.sector}
                </div>
                <div className="subtitle">{imp.detail}</div>
              </div>
              <div className="pill" style={{ fontSize: '0.9rem' }}>
                −{imp.strokesSaved.toFixed(1)} coup{imp.strokesSaved >= 1.95 ? 's' : ''}/tour
              </div>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', margin: '6px 0 0' }}>
              Basé sur tes données : {imp.basis}.
            </p>
          </div>
        ))}

        <p style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
          Estimations calculées à partir de tes propres rounds (façon strokes gained simplifié) —
          plus tu enregistres de rounds détaillés, plus c'est fiable.
        </p>
      </main>
    </>
  );
}

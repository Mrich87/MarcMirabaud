import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '../../db';
import PageHeader from '../../components/PageHeader';
import { aggregateRounds, formatToPar, holeTotals } from '../../utils/stats';
import { estimateHandicapIndex, scoreDifferential } from '../../utils/handicap';

export default function Stats() {
  const allRounds = useLiveQuery(() => db.rounds.orderBy('date').toArray(), []);
  const courses = useLiveQuery(() => db.courses.orderBy('name').toArray(), []);
  const [courseFilter, setCourseFilter] = useState<'all' | number>('all');

  if (!allRounds) return null;

  if (allRounds.length === 0) {
    return (
      <>
        <PageHeader title="Statistiques" />
        <main className="app-main">
          <div className="empty-state">Enregistre au moins un round pour voir tes statistiques.</div>
        </main>
      </>
    );
  }

  const courseById = new Map((courses ?? []).map((c) => [c.id, c]));
  const differentials = allRounds
    .filter((r) => r.holes.length > 0 && r.holes.every((h) => h.score != null))
    .map((r) => {
      const c = courseById.get(r.courseId);
      if (!c?.courseRating || !c?.slopeRating) return null;
      const total = holeTotals(r.holes);
      return scoreDifferential(total.score, c.courseRating, c.slopeRating);
    })
    .filter((d): d is number => d != null);
  const indexEstimate = estimateHandicapIndex(differentials);

  const rounds =
    courseFilter === 'all' ? allRounds : allRounds.filter((r) => r.courseId === courseFilter);

  const stats = aggregateRounds(rounds);

  const trend = rounds
    .filter((r) => r.holes.some((h) => h.score != null))
    .map((r) => {
      const t = holeTotals(r.holes);
      return { date: r.date, toPar: t.score - t.par };
    });

  const fairwayData = [
    { name: 'Gauche', value: stats.fairwayMissBreakdown.left },
    { name: 'Centre', value: stats.fairwayMissBreakdown.hit },
    { name: 'Droite', value: stats.fairwayMissBreakdown.right },
  ];

  return (
    <>
      <PageHeader title="Statistiques" />
      <main className="app-main">
        <div className="card" style={{ textAlign: 'center' }}>
          {indexEstimate != null ? (
            <>
              <div className="value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>
                {indexEstimate.toFixed(1)}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                Estimation d'index (non officielle) — basée sur {differentials.length} round(s) complet(s)
                avec rating/slope renseignés
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Renseigne le rating et le slope d'un parcours (onglet Infos) et joue au moins 3 rounds
              complets pour voir apparaître une estimation d'index (approximative, non officielle).
            </div>
          )}
        </div>

        {courses && courses.length > 0 && (
          <div className="field">
            <label>Parcours</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Tous les parcours</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {rounds.length === 0 ? (
          <div className="empty-state">Aucun round enregistré sur ce parcours.</div>
        ) : (
          <>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="value">{stats.avgScore?.toFixed(1)}</div>
            <div className="label">Score moyen ({formatToPar(Math.round(stats.avgToPar ?? 0))})</div>
          </div>
          <div className="stat-box">
            <div className="value">{stats.fairwayPct?.toFixed(0)}%</div>
            <div className="label">Fairways touchés</div>
          </div>
          <div className="stat-box">
            <div className="value">{stats.girPct?.toFixed(0)}%</div>
            <div className="label">GIR</div>
          </div>
          <div className="stat-box">
            <div className="value">{stats.avgPutts?.toFixed(1)}</div>
            <div className="label">Putts / tour (18 trous)</div>
          </div>
          <div className="stat-box">
            <div className="value">{stats.avgPenalties?.toFixed(1)}</div>
            <div className="label">Pénalités / round</div>
          </div>
          <div className="stat-box">
            <div className="value">{stats.upDownPct != null ? `${stats.upDownPct.toFixed(0)}%` : '–'}</div>
            <div className="label">Up &amp; Down réussis</div>
          </div>
        </div>

        <div className="section-title">Scoring par type de trou</div>
        <table className="scorecard">
          <thead>
            <tr>
              <th>Par</th>
              <th>Trous joués</th>
              <th>Score moyen</th>
              <th>Diff / par</th>
            </tr>
          </thead>
          <tbody>
            {stats.byPar.map((p) => (
              <tr key={p.par}>
                <td>{p.par}</td>
                <td>{p.rounds}</td>
                <td>{p.avgScore?.toFixed(2)}</td>
                <td>{p.avgToPar != null ? formatToPar(Number(p.avgToPar.toFixed(1))) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="section-title">Répartition des fairways (par 4/5)</div>
        <div className="card" style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fairwayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={12} stroke="var(--muted)" />
              <YAxis allowDecimals={false} fontSize={12} stroke="var(--muted)" />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
              <Bar dataKey="value" fill="#1e7a3a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="section-title">Évolution du score (diff / par)</div>
        <div className="card" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={11} stroke="var(--muted)" />
              <YAxis fontSize={12} stroke="var(--muted)" />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
              <Line type="monotone" dataKey="toPar" stroke="#155c2c" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
          </>
        )}
      </main>
    </>
  );
}

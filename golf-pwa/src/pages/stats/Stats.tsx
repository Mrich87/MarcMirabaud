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

export default function Stats() {
  const rounds = useLiveQuery(() => db.rounds.orderBy('date').toArray(), []);

  if (!rounds) return null;

  if (rounds.length === 0) {
    return (
      <>
        <PageHeader title="Statistiques" />
        <main className="app-main">
          <div className="empty-state">Enregistre au moins un round pour voir tes statistiques.</div>
        </main>
      </>
    );
  }

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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#1e7a3a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="section-title">Évolution du score (diff / par)</div>
        <div className="card" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="toPar" stroke="#155c2c" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </main>
    </>
  );
}

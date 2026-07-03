import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import PageHeader from '../components/PageHeader';
import { aggregateRounds, formatToPar } from '../utils/stats';

export default function Home() {
  const rounds = useLiveQuery(() => db.rounds.orderBy('date').reverse().toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []);

  const recentRounds = rounds?.slice(0, 5) ?? [];
  const stats = rounds ? aggregateRounds(rounds) : null;

  return (
    <>
      <PageHeader
        title="Golf Stats"
        action={
          <Link
            to="/settings"
            aria-label="Réglages"
            style={{ color: 'white', textDecoration: 'none', fontSize: '1.3rem' }}
          >
            ⚙️
          </Link>
        }
      />
      <main className="app-main">
        <div className="btn-row">
          <Link className="btn" to="/rounds/new">
            + Nouveau round
          </Link>
          <Link className="btn secondary" to="/courses/new">
            + Parcours
          </Link>
          <Link className="btn secondary" to="/wedges">
            🎯 Wedges
          </Link>
        </div>

        {stats && stats.roundsCount > 0 && (
          <>
            <div className="section-title">Vue d'ensemble ({stats.roundsCount} rounds)</div>
            <div className="stat-grid">
              <div className="stat-box">
                <div className="value">
                  {stats.avgScore?.toFixed(1)} ({formatToPar(Math.round(stats.avgToPar ?? 0))})
                </div>
                <div className="label">Score moyen</div>
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
                <div className="label">Putts / tour</div>
              </div>
            </div>
            <div className="btn-row">
              <Link className="btn secondary small" to="/stats">
                Voir toutes les stats →
              </Link>
            </div>
          </>
        )}

        <div className="section-title">Derniers rounds</div>
        {recentRounds.length === 0 && (
          <div className="empty-state">
            {courses?.length === 0
              ? "Commence par créer un parcours, puis enregistre ton premier round."
              : 'Aucun round enregistré pour le moment.'}
          </div>
        )}
        {recentRounds.map((round) => {
          const total = round.holes.reduce(
            (acc, h) => (h.score != null ? { score: acc.score + h.score, par: acc.par + h.par } : acc),
            { score: 0, par: 0 },
          );
          return (
            <Link key={round.id} to={`/rounds/${round.id}/view`} className="card-link">
              <div className="card list-item">
                <div>
                  <div className="title">{round.courseName}</div>
                  <div className="subtitle">
                    {round.date} · {round.teeName}
                  </div>
                </div>
                <div className="pill">
                  {total.score} ({formatToPar(total.score - total.par)})
                </div>
              </div>
            </Link>
          );
        })}
      </main>
    </>
  );
}

import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import PageHeader from '../../components/PageHeader';
import { summarizeRound, formatToPar } from '../../utils/stats';
import { downloadCsv, roundsToCsv } from '../../utils/csv';

export default function RoundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const round = useLiveQuery(() => db.rounds.get(Number(id)), [id]);

  if (round === undefined) return null;
  if (round === null) {
    return (
      <>
        <PageHeader title="Round" back />
        <main className="app-main">
          <div className="empty-state">Ce round n'existe plus.</div>
        </main>
      </>
    );
  }

  const summary = summarizeRound(round);

  async function remove() {
    if (!confirm('Supprimer ce round ?')) return;
    await db.rounds.delete(round!.id!);
    navigate('/rounds');
  }

  function exportOne() {
    downloadCsv(`golf-round-${round!.date}.csv`, roundsToCsv([round!]));
  }

  return (
    <>
      <PageHeader title={`${round.courseName} · ${round.date}`} back />
      <main className="app-main">
        <div className="stat-grid">
          <div className="stat-box">
            <div className="value">
              {summary.totalScore} ({formatToPar(summary.toPar)})
            </div>
            <div className="label">Score total</div>
          </div>
          <div className="stat-box">
            <div className="value">
              {summary.fairwaysPossible ? Math.round((summary.fairwaysHit / summary.fairwaysPossible) * 100) : '–'}%
            </div>
            <div className="label">Fairways ({summary.fairwaysHit}/{summary.fairwaysPossible})</div>
          </div>
          <div className="stat-box">
            <div className="value">
              {summary.girPossible ? Math.round((summary.girHit / summary.girPossible) * 100) : '–'}%
            </div>
            <div className="label">GIR ({summary.girHit}/{summary.girPossible})</div>
          </div>
          <div className="stat-box">
            <div className="value">{summary.totalPutts}</div>
            <div className="label">Putts ({summary.puttsHoles} trous)</div>
          </div>
        </div>

        <div className="section-title">Carte de score</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="scorecard">
            <thead>
              <tr>
                <th>Trou</th>
                {round.holes.map((h) => (
                  <th key={h.number}>{h.number}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Par</td>
                {round.holes.map((h) => (
                  <td key={h.number}>{h.par}</td>
                ))}
              </tr>
              <tr>
                <td>Score</td>
                {round.holes.map((h) => (
                  <td key={h.number}>{h.score ?? '–'}</td>
                ))}
              </tr>
              <tr>
                <td>Fairway</td>
                {round.holes.map((h) => (
                  <td key={h.number}>{h.par === 3 ? '' : h.fairway ?? ''}</td>
                ))}
              </tr>
              <tr>
                <td>GIR</td>
                {round.holes.map((h) => (
                  <td key={h.number}>{h.gir == null ? '' : h.gir ? '✓' : '✗'}</td>
                ))}
              </tr>
              <tr>
                <td>Putts</td>
                {round.holes.map((h) => (
                  <td key={h.number}>{h.putts ?? ''}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="btn-row">
          <Link className="btn" to={`/rounds/${round.id}`}>
            Modifier
          </Link>
          <button className="btn secondary" onClick={exportOne}>
            Exporter CSV
          </button>
          <button className="btn danger" onClick={remove}>
            Supprimer
          </button>
        </div>
      </main>
    </>
  );
}

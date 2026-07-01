import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import PageHeader from '../../components/PageHeader';
import { holeTotals, formatToPar } from '../../utils/stats';
import { downloadCsv, roundsToCsv } from '../../utils/csv';

export default function RoundList() {
  const rounds = useLiveQuery(() => db.rounds.orderBy('date').reverse().toArray(), []);

  function exportAll() {
    if (!rounds || rounds.length === 0) return;
    downloadCsv(`golf-rounds-${new Date().toISOString().slice(0, 10)}.csv`, roundsToCsv(rounds));
  }

  return (
    <>
      <PageHeader
        title="Rounds"
        action={
          <Link className="btn small" to="/rounds/new">
            + Nouveau
          </Link>
        }
      />
      <main className="app-main">
        {rounds && rounds.length > 0 && (
          <div className="btn-row">
            <button className="btn secondary small" onClick={exportAll}>
              Exporter en CSV
            </button>
          </div>
        )}
        {rounds?.length === 0 && <div className="empty-state">Aucun round enregistré.</div>}
        {rounds?.map((round) => {
          const totals = holeTotals(round.holes);
          const holesPlayed = round.holes.filter((h) => h.score != null).length;
          return (
            <Link key={round.id} to={`/rounds/${round.id}/view`} className="card-link">
              <div className="card list-item">
                <div>
                  <div className="title">{round.courseName}</div>
                  <div className="subtitle">
                    {round.date} · {round.teeName} · {holesPlayed}/18 trous
                  </div>
                </div>
                <div className="pill">
                  {totals.score} ({formatToPar(totals.score - totals.par)})
                </div>
              </div>
            </Link>
          );
        })}
      </main>
    </>
  );
}

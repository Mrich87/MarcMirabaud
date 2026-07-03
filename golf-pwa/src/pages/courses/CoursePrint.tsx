import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../db';
import PageHeader from '../../components/PageHeader';
import HoleMap from '../../components/HoleMap';
import type { Course } from '../../types';

export default function CoursePrint() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (id) db.courses.get(Number(id)).then((c) => c && setCourse(c));
  }, [id]);

  if (!course) return null;

  return (
    <>
      <PageHeader
        title={`Carnet — ${course.name}`}
        back
        action={
          <button className="btn small" onClick={() => window.print()}>
            🖨️ Imprimer / PDF
          </button>
        }
      />
      <main className="app-main print-carnet">
        <p className="no-print" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Chaque trou occupe une page au format A5. Utilise "Imprimer / PDF" puis choisis
          "Enregistrer en PDF" ou une imprimante compatible A5.
        </p>
        {course.holes.map((hole, i) => {
          const note = course.playbook[i];
          const hasNote = note?.startClub || note?.avoidZones || note?.greenBreak || note?.strategy;
          return (
            <div className="print-page" key={hole.number}>
              <div className="print-page-header">
                <div className="print-hole-number">Trou {hole.number}</div>
                <div className="print-hole-meta">
                  Par {hole.par} · Index {hole.index}
                </div>
              </div>

              {hole.distances.length > 0 && (
                <table className="scorecard print-distances">
                  <thead>
                    <tr>
                      {hole.distances.map((d) => (
                        <th key={d.teeName}>{d.teeName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {hole.distances.map((d) => (
                        <td key={d.teeName}>{d.distance} m</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              )}

              <div className="print-map">
                <HoleMap hole={hole} primaryTeeName={course.tees[0]} />
              </div>

              {hasNote && (
                <div className="print-notes">
                  {note.startClub && (
                    <p>
                      <strong>Départ :</strong> {note.startClub}
                    </p>
                  )}
                  {note.avoidZones && (
                    <p>
                      <strong>À éviter :</strong> {note.avoidZones}
                    </p>
                  )}
                  {note.greenBreak && (
                    <p>
                      <strong>Green :</strong> {note.greenBreak}
                    </p>
                  )}
                  {note.strategy && (
                    <p>
                      <strong>Stratégie :</strong> {note.strategy}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </>
  );
}

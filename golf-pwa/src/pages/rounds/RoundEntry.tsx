import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import PageHeader from '../../components/PageHeader';
import type { Course, FairwayHit, HoleResult, Round } from '../../types';
import { emptyHoleResult } from '../../types';
import { holeTotals, formatToPar } from '../../utils/stats';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RoundEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const courses = useLiveQuery(() => db.courses.orderBy('name').toArray(), []);

  const [round, setRound] = useState<Round | null>(null);
  const [holeIdx, setHoleIdx] = useState(0);

  // setup form state (new round only)
  const [courseId, setCourseId] = useState<number | null>(null);
  const [teeName, setTeeName] = useState('');
  const [date, setDate] = useState(todayIso());

  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isNew) {
      db.rounds.get(Number(id)).then((r) => r && setRound(r));
    }
  }, [id, isNew]);

  useEffect(() => {
    if (!round?.id) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      db.rounds.update(round.id!, { holes: round.holes, notes: round.notes, updatedAt: Date.now() });
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.holes, round?.notes]);

  async function startRound(course: Course, tee: string, dateValue: string) {
    const now = Date.now();
    const holes: HoleResult[] = course.holes.map((h) => emptyHoleResult(h.number, h.par));
    const newRound: Omit<Round, 'id'> = {
      courseId: course.id!,
      courseName: course.name,
      date: dateValue,
      teeName: tee,
      holes,
      createdAt: now,
      updatedAt: now,
    };
    const newId = await db.rounds.add(newRound);
    const saved = await db.rounds.get(newId);
    if (saved) {
      setRound(saved);
      navigate(`/rounds/${newId}`, { replace: true });
    }
  }

  function updateHole(patch: Partial<HoleResult>) {
    setRound((r) => {
      if (!r) return r;
      const holes = r.holes.map((h, i) => (i === holeIdx ? { ...h, ...patch } : h));
      return { ...r, holes };
    });
  }

  async function finishRound() {
    if (round?.id) {
      await db.rounds.update(round.id, { holes: round.holes, updatedAt: Date.now() });
    }
    navigate(`/rounds/${round?.id}/view`);
  }

  async function deleteRound() {
    if (!round?.id) return;
    if (!confirm('Supprimer ce round ?')) return;
    await db.rounds.delete(round.id);
    navigate('/rounds');
  }

  // --- Setup screen (new round) ---
  if (isNew && !round) {
    const selectedCourse = courses?.find((c) => c.id === courseId) ?? null;
    return (
      <>
        <PageHeader title="Nouveau round" back />
        <main className="app-main">
          {courses?.length === 0 && (
            <div className="empty-state">
              Ajoute d'abord un parcours dans l'onglet "Parcours" avant de commencer un round.
            </div>
          )}
          {courses && courses.length > 0 && (
            <>
              <div className="field">
                <label>Parcours</label>
                <select
                  value={courseId ?? ''}
                  onChange={(e) => {
                    const cid = Number(e.target.value);
                    setCourseId(cid);
                    const c = courses.find((cc) => cc.id === cid);
                    setTeeName(c?.tees[0] ?? '');
                  }}
                >
                  <option value="" disabled>
                    Choisir un parcours
                  </option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedCourse && (
                <div className="field">
                  <label>Départ</label>
                  <select value={teeName} onChange={(e) => setTeeName(e.target.value)}>
                    {selectedCourse.tees.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <button
                className="btn"
                disabled={!selectedCourse}
                onClick={() => selectedCourse && startRound(selectedCourse, teeName, date)}
              >
                Commencer le round
              </button>
            </>
          )}
        </main>
      </>
    );
  }

  if (!round) return null;

  const hole = round.holes[holeIdx];
  const totals = holeTotals(round.holes);
  const holesPlayed = round.holes.filter((h) => h.score != null).length;

  return (
    <>
      <PageHeader title={`${round.courseName} · ${round.date}`} back />
      <main className="app-main">
        <div className="hole-editor">
          <div className="hole-nav">
            <button
              className="btn secondary small"
              disabled={holeIdx === 0}
              onClick={() => setHoleIdx((i) => Math.max(0, i - 1))}
            >
              ‹
            </button>
            <div className="hole-title">
              Trou {hole.number} · Par {hole.par}
            </div>
            <button
              className="btn secondary small"
              disabled={holeIdx === 17}
              onClick={() => setHoleIdx((i) => Math.min(17, i + 1))}
            >
              ›
            </button>
          </div>

          <div className="section-title">Score</div>
          <div className="stepper">
            <button onClick={() => updateHole({ score: Math.max(1, (hole.score ?? hole.par) - 1) })}>−</button>
            <div className="value">{hole.score ?? '–'}</div>
            <button onClick={() => updateHole({ score: (hole.score ?? hole.par - 1) + 1 })}>+</button>
          </div>

          <div className="section-title">Fairway touché</div>
          <div className={`segmented ${hole.par === 3 ? 'disabled' : ''}`}>
            {(['G', 'C', 'D'] as FairwayHit[]).map((f) => (
              <button
                key={f}
                className={hole.fairway === f ? 'selected' : ''}
                onClick={() => updateHole({ fairway: f })}
              >
                {f === 'G' ? 'Gauche' : f === 'C' ? 'Centre' : 'Droite'}
              </button>
            ))}
          </div>

          <div className="section-title">Green en régulation (GIR)</div>
          <div className="segmented">
            <button className={hole.gir === true ? 'selected' : ''} onClick={() => updateHole({ gir: true })}>
              Oui
            </button>
            <button
              className={hole.gir === false ? 'selected' : ''}
              onClick={() => updateHole({ gir: false, upDown: hole.upDown ?? null })}
            >
              Non
            </button>
          </div>

          <div className="section-title">Putts</div>
          <div className="stepper">
            <button onClick={() => updateHole({ putts: Math.max(0, (hole.putts ?? 2) - 1) })}>−</button>
            <div className="value">{hole.putts ?? '–'}</div>
            <button onClick={() => updateHole({ putts: (hole.putts ?? 1) + 1 })}>+</button>
          </div>

          <div className="section-title">Pénalités</div>
          <div className="stepper">
            <button onClick={() => updateHole({ penalties: Math.max(0, hole.penalties - 1) })}>−</button>
            <div className="value">{hole.penalties}</div>
            <button onClick={() => updateHole({ penalties: hole.penalties + 1 })}>+</button>
          </div>

          {hole.gir === false && (
            <>
              <div className="section-title">Up &amp; Down réussi</div>
              <div className="segmented">
                <button className={hole.upDown === true ? 'selected' : ''} onClick={() => updateHole({ upDown: true })}>
                  Oui
                </button>
                <button
                  className={hole.upDown === false ? 'selected' : ''}
                  onClick={() => updateHole({ upDown: false })}
                >
                  Non
                </button>
              </div>
            </>
          )}
        </div>

        <div className="section-title">
          Progression : {holesPlayed}/18 · Total {totals.score} ({formatToPar(totals.score - totals.par)})
        </div>

        <div className="btn-row">
          <button className="btn" onClick={finishRound}>
            Terminer / voir la carte
          </button>
          <button className="btn danger" onClick={deleteRound}>
            Supprimer ce round
          </button>
        </div>
      </main>
    </>
  );
}

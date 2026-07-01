import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db';
import PageHeader from '../../components/PageHeader';
import type { Course } from '../../types';
import { defaultCourseHoles, defaultPlaybook } from '../../types';

type Tab = 'infos' | 'trous' | 'carnet';

function newCourse(): Course {
  const now = Date.now();
  return {
    name: '',
    location: '',
    tees: ['Homme', 'Femme'],
    holes: defaultCourseHoles(),
    playbook: defaultPlaybook(),
    createdAt: now,
    updatedAt: now,
  };
}

export default function CourseEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [course, setCourse] = useState<Course | null>(isNew ? newCourse() : null);
  const [tab, setTab] = useState<Tab>('infos');
  const [holeIdx, setHoleIdx] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isNew) {
      db.courses.get(Number(id)).then((c) => c && setCourse(c));
    }
  }, [id, isNew]);

  if (!course) return null;

  function update(patch: Partial<Course>) {
    setCourse((c) => (c ? { ...c, ...patch } : c));
    setSaved(false);
  }

  function updateHole(index: number, patch: Partial<Course['holes'][number]>) {
    setCourse((c) => {
      if (!c) return c;
      const holes = c.holes.map((h, i) => (i === index ? { ...h, ...patch } : h));
      return { ...c, holes };
    });
    setSaved(false);
  }

  function updatePlaybook(index: number, patch: Partial<Course['playbook'][number]>) {
    setCourse((c) => {
      if (!c) return c;
      const playbook = c.playbook.map((p, i) => (i === index ? { ...p, ...patch } : p));
      return { ...c, playbook };
    });
    setSaved(false);
  }

  function updateTeeName(oldName: string, newName: string) {
    setCourse((c) => {
      if (!c) return c;
      const tees = c.tees.map((t) => (t === oldName ? newName : t));
      const holes = c.holes.map((h) => ({
        ...h,
        distances: h.distances.map((d) => (d.teeName === oldName ? { ...d, teeName: newName } : d)),
      }));
      return { ...c, tees, holes };
    });
  }

  function addTee() {
    setCourse((c) => (c ? { ...c, tees: [...c.tees, `Départ ${c.tees.length + 1}`] } : c));
  }

  function removeTee(name: string) {
    setCourse((c) => {
      if (!c) return c;
      const tees = c.tees.filter((t) => t !== name);
      const holes = c.holes.map((h) => ({
        ...h,
        distances: h.distances.filter((d) => d.teeName !== name),
      }));
      return { ...c, tees, holes };
    });
  }

  function getDistance(holeIndex: number, tee: string): number | '' {
    const d = course!.holes[holeIndex].distances.find((x) => x.teeName === tee);
    return d ? d.distance : '';
  }

  function setDistance(holeIndex: number, tee: string, distance: number) {
    setCourse((c) => {
      if (!c) return c;
      const holes = c.holes.map((h, i) => {
        if (i !== holeIndex) return h;
        const existing = h.distances.find((x) => x.teeName === tee);
        const distances = existing
          ? h.distances.map((x) => (x.teeName === tee ? { ...x, distance } : x))
          : [...h.distances, { teeName: tee, distance }];
        return { ...h, distances };
      });
      return { ...c, holes };
    });
    setSaved(false);
  }

  async function save() {
    const now = Date.now();
    const current = course!;
    if (isNew) {
      const newId = await db.courses.add({ ...current, createdAt: now, updatedAt: now });
      setSaved(true);
      navigate(`/courses/${newId}`, { replace: true });
    } else {
      await db.courses.update(Number(id), { ...current, updatedAt: now });
      setSaved(true);
    }
  }

  async function remove() {
    if (!id) return;
    if (!confirm(`Supprimer le parcours "${course!.name}" ? Les rounds associés ne seront pas supprimés.`)) return;
    await db.courses.delete(Number(id));
    navigate('/courses');
  }

  const hole = course.holes[holeIdx];
  const note = course.playbook[holeIdx];

  return (
    <>
      <PageHeader title={isNew ? 'Nouveau parcours' : course.name || 'Parcours'} back />
      <main className="app-main">
        <div className="tabs">
          <button className={tab === 'infos' ? 'active' : ''} onClick={() => setTab('infos')}>
            Infos
          </button>
          <button className={tab === 'trous' ? 'active' : ''} onClick={() => setTab('trous')}>
            Trous
          </button>
          <button className={tab === 'carnet' ? 'active' : ''} onClick={() => setTab('carnet')}>
            Carnet de parcours
          </button>
        </div>

        {tab === 'infos' && (
          <div>
            <div className="field">
              <label>Nom du parcours</label>
              <input value={course.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="field">
              <label>Lieu</label>
              <input value={course.location ?? ''} onChange={(e) => update({ location: e.target.value })} />
            </div>
            <div className="section-title">Départs</div>
            {course.tees.map((tee) => (
              <div className="row" key={tee} style={{ marginBottom: 8 }}>
                <input value={tee} onChange={(e) => updateTeeName(tee, e.target.value)} />
                <button className="btn danger small" onClick={() => removeTee(tee)} style={{ flex: '0 0 auto' }}>
                  ×
                </button>
              </div>
            ))}
            <button className="btn secondary small" onClick={addTee}>
              + Ajouter un départ
            </button>
          </div>
        )}

        {tab === 'trous' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="scorecard">
              <thead>
                <tr>
                  <th>Trou</th>
                  <th>Par</th>
                  <th>Index</th>
                  {course.tees.map((tee) => (
                    <th key={tee}>{tee}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {course.holes.map((h, i) => (
                  <tr key={h.number}>
                    <td>{h.number}</td>
                    <td>
                      <select
                        value={h.par}
                        onChange={(e) => updateHole(i, { par: Number(e.target.value) as 3 | 4 | 5 })}
                        style={{ width: 52 }}
                      >
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={18}
                        value={h.index}
                        onChange={(e) => updateHole(i, { index: Number(e.target.value) })}
                        style={{ width: 44 }}
                      />
                    </td>
                    {course.tees.map((tee) => (
                      <td key={tee}>
                        <input
                          type="number"
                          min={0}
                          value={getDistance(i, tee)}
                          onChange={(e) => setDistance(i, tee, Number(e.target.value))}
                          style={{ width: 60 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'carnet' && (
          <div className="hole-editor">
            <div className="hole-nav">
              <button
                className="btn secondary small"
                disabled={holeIdx === 0}
                onClick={() => setHoleIdx((i) => Math.max(0, i - 1))}
              >
                ‹ Précédent
              </button>
              <div className="hole-title">
                Trou {hole.number} (Par {hole.par})
              </div>
              <button
                className="btn secondary small"
                disabled={holeIdx === 17}
                onClick={() => setHoleIdx((i) => Math.min(17, i + 1))}
              >
                Suivant ›
              </button>
            </div>
            <div className="field">
              <label>Club de départ</label>
              <input
                value={note.startClub}
                onChange={(e) => updatePlaybook(holeIdx, { startClub: e.target.value })}
                placeholder="ex : Driver, Fer 5..."
              />
            </div>
            <div className="field">
              <label>Zones à éviter</label>
              <textarea
                value={note.avoidZones}
                onChange={(e) => updatePlaybook(holeIdx, { avoidZones: e.target.value })}
                placeholder="ex : bunker fairway à 220m côté droit, OB à gauche"
              />
            </div>
            <div className="field">
              <label>Cassure des greens</label>
              <textarea
                value={note.greenBreak}
                onChange={(e) => updatePlaybook(holeIdx, { greenBreak: e.target.value })}
                placeholder="ex : casse fort de droite à gauche vers l'avant"
              />
            </div>
            <div className="field">
              <label>Stratégie</label>
              <textarea
                value={note.strategy}
                onChange={(e) => updatePlaybook(holeIdx, { strategy: e.target.value })}
                placeholder="ex : viser le centre-gauche du fairway, laisser le wedge en 2e"
              />
            </div>
          </div>
        )}

        <div className="btn-row">
          <button className="btn" onClick={save}>
            {saved ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
          {!isNew && (
            <button className="btn danger" onClick={remove}>
              Supprimer le parcours
            </button>
          )}
        </div>
      </main>
    </>
  );
}

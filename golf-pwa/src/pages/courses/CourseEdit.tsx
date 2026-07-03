import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db';
import PageHeader from '../../components/PageHeader';
import HoleMap from '../../components/HoleMap';
import type { Course, CoursePoint, GeoPoint, PointOfInterestKind } from '../../types';
import { defaultCourseHoles, defaultPlaybook, POINT_KIND_LABELS } from '../../types';
import {
  distanceMeters,
  fetchOsmCourseHoles,
  getCurrentPosition,
  searchOsmCourses,
  type OsmCourseCandidate,
} from '../../utils/geo';

function newId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

const POI_KINDS: PointOfInterestKind[] = [
  'green_front',
  'green_back',
  'water',
  'bunker',
  'ob',
  'tree',
  'layup',
  'other',
];

type Tab = 'infos' | 'trous' | 'gps' | 'carnet';

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

  const [osmQuery, setOsmQuery] = useState('');
  const [osmResults, setOsmResults] = useState<OsmCourseCandidate[]>([]);
  const [osmBusy, setOsmBusy] = useState(false);
  const [osmMessage, setOsmMessage] = useState<string | null>(null);

  const [capturing, setCapturing] = useState<string | null>(null); // 'green', 'poi', or a tee name
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [poiKind, setPoiKind] = useState<PointOfInterestKind>('water');
  const [poiLabel, setPoiLabel] = useState('');

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
        teeLocations: h.teeLocations?.map((t) =>
          t.teeName === oldName ? { ...t, teeName: newName } : t,
        ),
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
        teeLocations: h.teeLocations?.filter((t) => t.teeName !== name),
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

  // --- GPS capture ---

  function captureTeeLocation(holeIndex: number, teeName: string, point: GeoPoint) {
    setCourse((c) => {
      if (!c) return c;
      const holes = c.holes.map((h, i) => {
        if (i !== holeIndex) return h;
        const teeLocations = (h.teeLocations ?? []).filter((t) => t.teeName !== teeName);
        teeLocations.push({ teeName, point });
        let distances = h.distances;
        if (h.greenLocation) {
          const dist = Math.round(distanceMeters(point, h.greenLocation));
          const existing = distances.find((d) => d.teeName === teeName);
          distances = existing
            ? distances.map((d) => (d.teeName === teeName ? { ...d, distance: dist } : d))
            : [...distances, { teeName, distance: dist }];
        }
        return { ...h, teeLocations, distances };
      });
      return { ...c, holes };
    });
    setSaved(false);
  }

  function captureGreenLocation(holeIndex: number, point: GeoPoint) {
    setCourse((c) => {
      if (!c) return c;
      const holes = c.holes.map((h, i) => {
        if (i !== holeIndex) return h;
        let distances = h.distances;
        for (const t of h.teeLocations ?? []) {
          const dist = Math.round(distanceMeters(t.point, point));
          const existing = distances.find((d) => d.teeName === t.teeName);
          distances = existing
            ? distances.map((d) => (d.teeName === t.teeName ? { ...d, distance: dist } : d))
            : [...distances, { teeName: t.teeName, distance: dist }];
        }
        return { ...h, greenLocation: point, distances };
      });
      return { ...c, holes };
    });
    setSaved(false);
  }

  async function captureTee(teeName: string) {
    setGpsError(null);
    setCapturing(teeName);
    try {
      const point = await getCurrentPosition();
      captureTeeLocation(holeIdx, teeName, point);
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : 'Erreur de géolocalisation.');
    } finally {
      setCapturing(null);
    }
  }

  async function captureGreen() {
    setGpsError(null);
    setCapturing('green');
    try {
      const point = await getCurrentPosition();
      captureGreenLocation(holeIdx, point);
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : 'Erreur de géolocalisation.');
    } finally {
      setCapturing(null);
    }
  }

  function addPoint(holeIndex: number, poi: CoursePoint) {
    setCourse((c) => {
      if (!c) return c;
      const holes = c.holes.map((h, i) =>
        i === holeIndex ? { ...h, points: [...(h.points ?? []), poi] } : h,
      );
      return { ...c, holes };
    });
    setSaved(false);
  }

  function removePoint(holeIndex: number, poiId: string) {
    setCourse((c) => {
      if (!c) return c;
      const holes = c.holes.map((h, i) =>
        i === holeIndex ? { ...h, points: (h.points ?? []).filter((p) => p.id !== poiId) } : h,
      );
      return { ...c, holes };
    });
    setSaved(false);
  }

  async function capturePoi() {
    setGpsError(null);
    setCapturing('poi');
    try {
      const point = await getCurrentPosition();
      addPoint(holeIdx, { id: newId(), kind: poiKind, label: poiLabel.trim() || undefined, point });
      setPoiLabel('');
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : 'Erreur de géolocalisation.');
    } finally {
      setCapturing(null);
    }
  }

  // --- OpenStreetMap import ---

  async function searchOsm() {
    setOsmMessage(null);
    setOsmBusy(true);
    try {
      const results = await searchOsmCourses(osmQuery);
      setOsmResults(results);
      if (results.length === 0) {
        setOsmMessage("Aucun parcours trouvé sur OpenStreetMap pour cette recherche. Essaie avec la ville.");
      }
    } catch (e) {
      setOsmMessage(e instanceof Error ? e.message : 'Recherche indisponible.');
    } finally {
      setOsmBusy(false);
    }
  }

  async function importOsmCourse(candidate: OsmCourseCandidate) {
    setOsmBusy(true);
    setOsmMessage(null);
    try {
      const { holes } = await fetchOsmCourseHoles(candidate.point);
      const location = candidate.displayName.split(',').slice(1, 3).join(',').trim();
      setCourse((c) => {
        if (!c) return c;
        const updatedHoles = c.holes.map((h) => {
          const match = holes.find((o) => o.number === h.number);
          return match?.par ? { ...h, par: match.par as 3 | 4 | 5 } : h;
        });
        return { ...c, name: candidate.name, location, holes: updatedHoles };
      });
      setOsmResults([]);
      setOsmQuery('');
      setOsmMessage(
        holes.length > 0
          ? `Importé : nom, lieu et par pour ${holes.length} trou(s). Vérifie et complète l'index et les distances.`
          : "Nom et lieu importés. Le tracé des trous n'est pas disponible sur OpenStreetMap pour ce parcours : par/index/distances restent à saisir.",
      );
    } catch (e) {
      setOsmMessage(e instanceof Error ? e.message : 'Import indisponible.');
    } finally {
      setOsmBusy(false);
    }
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
          <button className={tab === 'gps' ? 'active' : ''} onClick={() => setTab('gps')}>
            GPS
          </button>
          <button className={tab === 'carnet' ? 'active' : ''} onClick={() => setTab('carnet')}>
            Carnet de parcours
          </button>
        </div>

        {tab === 'infos' && (
          <div>
            <div className="section-title">Importer depuis OpenStreetMap</div>
            <div className="row" style={{ marginBottom: 8 }}>
              <input
                value={osmQuery}
                onChange={(e) => setOsmQuery(e.target.value)}
                placeholder="Nom du parcours + ville"
                onKeyDown={(e) => e.key === 'Enter' && searchOsm()}
              />
              <button
                className="btn secondary small"
                style={{ flex: '0 0 auto' }}
                disabled={osmBusy || !osmQuery.trim()}
                onClick={searchOsm}
              >
                {osmBusy ? '...' : 'Rechercher'}
              </button>
            </div>
            {osmMessage && (
              <div className="pill" style={{ marginBottom: 8, display: 'block' }}>
                {osmMessage}
              </div>
            )}
            {osmResults.map((r) => (
              <div
                key={`${r.osmType}-${r.osmId}`}
                className="card list-item"
                style={{ cursor: 'pointer' }}
                onClick={() => importOsmCourse(r)}
              >
                <div>
                  <div className="title">{r.name}</div>
                  <div className="subtitle">{r.displayName}</div>
                </div>
                <span className="pill">Importer</span>
              </div>
            ))}

            <div className="section-title">Infos</div>
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

        {tab === 'gps' && (
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
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Tiens le téléphone au départ et au green de ce trou pour capturer leur position GPS ;
              la distance se calcule et se remplit automatiquement dans l'onglet "Trous".
            </p>
            {gpsError && (
              <div className="pill warn" style={{ display: 'block', marginBottom: 8 }}>
                {gpsError}
              </div>
            )}
            <div className="card">
              <div className="list-item" style={{ marginBottom: 8 }}>
                <div>
                  <div className="title">Green</div>
                  <div className="subtitle">
                    {hole.greenLocation
                      ? `${hole.greenLocation.lat.toFixed(5)}, ${hole.greenLocation.lon.toFixed(5)}`
                      : 'Non capturé'}
                  </div>
                </div>
                <button className="btn small" disabled={capturing !== null} onClick={captureGreen}>
                  {capturing === 'green' ? '...' : '📍 Capturer'}
                </button>
              </div>
              {course.tees.map((tee) => {
                const loc = hole.teeLocations?.find((t) => t.teeName === tee)?.point;
                const dist = getDistance(holeIdx, tee);
                return (
                  <div className="list-item" key={tee} style={{ marginBottom: 8 }}>
                    <div>
                      <div className="title">Départ {tee}</div>
                      <div className="subtitle">
                        {loc ? (dist !== '' ? `${dist} m` : 'Capturé, en attente du green') : 'Non capturé'}
                      </div>
                    </div>
                    <button
                      className="btn small secondary"
                      disabled={capturing !== null}
                      onClick={() => captureTee(tee)}
                    >
                      {capturing === tee ? '...' : '📍 Capturer'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="section-title">Points d'intérêt (distances, hors-limites, obstacles)</div>
            <div className="card">
              <div className="row" style={{ marginBottom: 8 }}>
                <select value={poiKind} onChange={(e) => setPoiKind(e.target.value as PointOfInterestKind)}>
                  {POI_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {POINT_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <input
                  value={poiLabel}
                  onChange={(e) => setPoiLabel(e.target.value)}
                  placeholder="Libellé (optionnel, ex : 135m avant green)"
                />
              </div>
              <button className="btn small" disabled={capturing !== null} onClick={capturePoi}>
                {capturing === 'poi' ? '...' : '📍 Capturer ce point'}
              </button>

              {(hole.points ?? []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {(hole.points ?? []).map((p) => (
                    <div className="list-item" key={p.id} style={{ marginBottom: 8 }}>
                      <div>
                        <div className="title">{p.label || POINT_KIND_LABELS[p.kind]}</div>
                        <div className="subtitle">
                          {POINT_KIND_LABELS[p.kind]}
                          {course.tees
                            .map((tee) => {
                              const teeLoc = hole.teeLocations?.find((t) => t.teeName === tee)?.point;
                              if (!teeLoc) return null;
                              return ` · ${tee} ${Math.round(distanceMeters(teeLoc, p.point))}m`;
                            })
                            .filter(Boolean)
                            .join('')}
                        </div>
                      </div>
                      <button className="btn danger small" onClick={() => removePoint(holeIdx, p.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="section-title">Dessin du trou</div>
            <HoleMap hole={hole} primaryTeeName={course.tees[0]} />
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
            <Link className="btn secondary" to={`/courses/${id}/print`}>
              🖨️ Carnet A5
            </Link>
          )}
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

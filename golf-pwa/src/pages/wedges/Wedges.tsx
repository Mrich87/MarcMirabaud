import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { db } from '../../db';
import PageHeader from '../../components/PageHeader';
import type { WedgeTrajectory } from '../../types';
import { clubStats } from '../../utils/wedgeStats';

const TRAJECTORIES: WedgeTrajectory[] = ['plein', '3/4', '1/2', '1/4'];
const COLORS = ['#155c2c', '#c0392b', '#2c6ca9', '#a9782c', '#7c2ca9', '#2ca997'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Wedges() {
  const shots = useLiveQuery(() => db.wedgeShots.orderBy('date').reverse().toArray(), []);

  const [club, setClub] = useState('56');
  const [trajectory, setTrajectory] = useState<WedgeTrajectory>('plein');
  const [carry, setCarry] = useState('');
  const [lateral, setLateral] = useState('0');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayIso());

  async function addShot() {
    const carryValue = Number(carry);
    if (!club || !carryValue) return;
    await db.wedgeShots.add({
      date,
      club,
      trajectory,
      carryDistance: carryValue,
      lateralDispersion: Number(lateral) || 0,
      note: note || undefined,
      createdAt: Date.now(),
    });
    setCarry('');
    setLateral('0');
    setNote('');
  }

  async function removeShot(id?: number) {
    if (id == null) return;
    await db.wedgeShots.delete(id);
  }

  const stats = shots ? clubStats(shots) : [];
  const clubs = stats.map((s) => s.club);

  return (
    <>
      <PageHeader title="Wedges (DECADE)" />
      <main className="app-main">
        <div className="section-title">Enregistrer un coup</div>
        <div className="card">
          <div className="row">
            <div className="field">
              <label>Club</label>
              <input value={club} onChange={(e) => setClub(e.target.value)} placeholder="ex : 56" />
            </div>
            <div className="field">
              <label>Trajectoire</label>
              <select value={trajectory} onChange={(e) => setTrajectory(e.target.value as WedgeTrajectory)}>
                {TRAJECTORIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Distance carry (m)</label>
              <input
                type="number"
                value={carry}
                onChange={(e) => setCarry(e.target.value)}
                placeholder="ex : 62"
              />
            </div>
            <div className="field">
              <label>Dispersion latérale (m, + droite / − gauche)</label>
              <input type="number" value={lateral} onChange={(e) => setLateral(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex : vent contre, lie difficile" />
          </div>
          <button className="btn" onClick={addShot}>
            Ajouter
          </button>
        </div>

        {stats.length > 0 && (
          <>
            <div className="section-title">Stats par club</div>
            <table className="scorecard">
              <thead>
                <tr>
                  <th>Club</th>
                  <th>Coups</th>
                  <th>Carry moy.</th>
                  <th>Min–Max</th>
                  <th>Écart-type</th>
                  <th>Dispersion latérale moy.</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.club}>
                    <td>{s.club}</td>
                    <td>{s.count}</td>
                    <td>{s.avgCarry.toFixed(1)} m</td>
                    <td>
                      {s.minCarry}–{s.maxCarry} m
                    </td>
                    <td>{s.carryStdDev.toFixed(1)} m</td>
                    <td>{s.avgLateralAbs.toFixed(1)} m</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="section-title">Dispersion (latéral × carry)</div>
            <div className="card" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="lateralDispersion" name="Latéral (m)" fontSize={11} />
                  <YAxis type="number" dataKey="carryDistance" name="Carry (m)" fontSize={11} />
                  <ZAxis range={[60, 60]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  {clubs.map((c, i) => (
                    <Scatter
                      key={c}
                      name={c}
                      data={shots?.filter((s) => s.club === c) ?? []}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <div className="section-title">Historique</div>
        {shots?.length === 0 && <div className="empty-state">Aucun coup enregistré.</div>}
        {shots?.map((shot) => (
          <div className="card list-item" key={shot.id}>
            <div>
              <div className="title">
                {shot.club} · {shot.trajectory} · {shot.carryDistance} m
              </div>
              <div className="subtitle">
                {shot.date} · latéral {shot.lateralDispersion > 0 ? '+' : ''}
                {shot.lateralDispersion} m{shot.note ? ` · ${shot.note}` : ''}
              </div>
            </div>
            <button className="btn danger small" onClick={() => removeShot(shot.id)}>
              ×
            </button>
          </div>
        ))}
      </main>
    </>
  );
}

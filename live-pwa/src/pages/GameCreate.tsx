import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { store } from '../store';
import { newGameCode, newPlayerId, type Game } from '../types';
import { rememberGame } from '../recentGames';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GameCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [holesCount, setHolesCount] = useState<9 | 18>(18);
  const [defaultPar, setDefaultPar] = useState(4);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setPlayerName(i: number, value: string) {
    setPlayerNames((names) => names.map((n, idx) => (idx === i ? value : n)));
  }

  async function create() {
    const players = playerNames
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => ({ id: newPlayerId(), name: n }));
    if (players.length === 0) {
      setError('Ajoute au moins un joueur.');
      return;
    }
    setCreating(true);
    setError(null);
    const game: Game = {
      code: newGameCode(),
      name: name.trim() || `Partie du ${todayIso()}`,
      courseName: courseName.trim(),
      holesCount,
      pars: Array.from({ length: holesCount }, () => defaultPar),
      players,
      scores: {},
      createdAt: Date.now(),
    };
    try {
      await store.createGame(game);
      rememberGame({ code: game.code, name: game.name, date: todayIso() });
      navigate(`/game/${game.code}`, { replace: true });
    } catch {
      setError('Impossible de créer la partie. Vérifie ta connexion.');
      setCreating(false);
    }
  }

  return (
    <div className="app-shell">
      <PageHeader title="Nouvelle partie" back />
      <main className="app-main">
        <div className="field">
          <label>Nom de la partie</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Partie du ${todayIso()}`} />
        </div>
        <div className="field">
          <label>Parcours (optionnel)</label>
          <input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="ex : Golf de Chérisey" />
        </div>
        <div className="row">
          <div className="field">
            <label>Nombre de trous</label>
            <select value={holesCount} onChange={(e) => setHolesCount(Number(e.target.value) as 9 | 18)}>
              <option value={9}>9</option>
              <option value={18}>18</option>
            </select>
          </div>
          <div className="field">
            <label>Par par défaut</label>
            <select value={defaultPar} onChange={(e) => setDefaultPar(Number(e.target.value))}>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
          Le par sert au classement (+/−). Tu pourras le laisser tel quel : le total brut reste juste
          même si le par n'est pas exact trou par trou.
        </p>

        <div className="section-title">Joueurs</div>
        {playerNames.map((n, i) => (
          <div className="row" key={i} style={{ marginBottom: 8 }}>
            <input
              value={n}
              onChange={(e) => setPlayerName(i, e.target.value)}
              placeholder={`Joueur ${i + 1}`}
            />
            {playerNames.length > 1 && (
              <button
                className="btn danger small"
                style={{ flex: '0 0 auto' }}
                onClick={() => setPlayerNames((names) => names.filter((_, idx) => idx !== i))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button className="btn secondary small" onClick={() => setPlayerNames((n) => [...n, ''])}>
          + Ajouter un joueur
        </button>

        {error && (
          <div className="banner" style={{ borderColor: 'var(--danger)', marginTop: 12 }}>
            {error}
          </div>
        )}

        <div className="btn-row">
          <button className="btn" disabled={creating} onClick={create} style={{ width: '100%' }}>
            {creating ? '...' : 'Créer la partie'}
          </button>
        </div>
      </main>
    </div>
  );
}

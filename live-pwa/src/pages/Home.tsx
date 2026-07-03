import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { store, usingFirebase } from '../store';
import { getRecentGames } from '../recentGames';

export default function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const recent = getRecentGames();

  async function join() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    setJoinError(null);
    try {
      const game = await store.fetchGame(code);
      if (!game) {
        setJoinError(`Aucune partie trouvée avec le code ${code}.`);
        return;
      }
      navigate(`/game/${code}`);
    } catch {
      setJoinError('Impossible de contacter le serveur. Vérifie ta connexion.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="app-shell">
      <PageHeader title="Golf Live" />
      <main className="app-main">
        {!usingFirebase && (
          <div className="banner">
            Mode <strong>{store.label}</strong> : les scores ne se synchronisent pas encore entre
            téléphones (backend non configuré).
          </div>
        )}

        <Link className="btn" to="/new" style={{ width: '100%' }}>
          ⛳ Créer une partie
        </Link>

        <div className="section-title">Rejoindre une partie</div>
        <div className="card">
          <div className="field">
            <label>Code de la partie</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ex : K7Q2M"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={5}
              style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}
              onKeyDown={(e) => e.key === 'Enter' && join()}
            />
          </div>
          {joinError && (
            <div className="banner" style={{ borderColor: 'var(--danger)' }}>
              {joinError}
            </div>
          )}
          <button className="btn secondary" disabled={joining || !joinCode.trim()} onClick={join}>
            {joining ? '...' : 'Rejoindre'}
          </button>
        </div>

        {recent.length > 0 && (
          <>
            <div className="section-title">Parties récentes</div>
            {recent.map((g) => (
              <Link key={g.code} to={`/game/${g.code}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{g.date}</div>
                  </div>
                  <span className="pill">{g.code}</span>
                </div>
              </Link>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { store, usingFirebase } from '../store';
import { computeStandings, formatToPar, type Game } from '../types';
import { rememberGame } from '../recentGames';

type Tab = 'classement' | 'saisie' | 'cartes';

export default function GameView() {
  const { code = '' } = useParams();
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('classement');
  const [holeIdx, setHoleIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe(code, setGame);
    return unsubscribe;
  }, [code]);

  useEffect(() => {
    if (game) {
      rememberGame({
        code: game.code,
        name: game.name,
        date: new Date(game.createdAt).toISOString().slice(0, 10),
      });
    }
  }, [game?.code]);

  const standings = useMemo(() => (game ? computeStandings(game) : []), [game]);

  if (game === undefined) {
    return (
      <div className="app-shell">
        <PageHeader title="Partie" back />
        <main className="app-main">
          <div className="empty-state">Chargement…</div>
        </main>
      </div>
    );
  }

  if (game === null) {
    return (
      <div className="app-shell">
        <PageHeader title="Partie introuvable" back />
        <main className="app-main">
          <div className="empty-state">
            Aucune partie avec le code <strong>{code}</strong>.
            {!usingFirebase &&
              " (Mode démo local : seules les parties créées sur cet appareil sont visibles.)"}
          </div>
        </main>
      </div>
    );
  }

  async function share() {
    const url = `${location.origin}${location.pathname}#/game/${game!.code}`;
    const text = `Suis notre partie de golf en direct ! Code : ${game!.code}\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: game!.name, text, url });
        return;
      } catch {
        // fall through to clipboard on cancel/unsupported
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function setScore(playerId: string, value: number | null) {
    store.setScore(game!.code, playerId, holeIdx, value);
  }

  const par = game.pars[holeIdx] ?? 4;

  return (
    <div className="app-shell">
      <PageHeader
        title={game.name}
        back
        action={
          <button className="btn small secondary" onClick={share} style={{ background: 'transparent', color: 'white', borderColor: 'white' }}>
            {copied ? 'Copié ✓' : '📤 Inviter'}
          </button>
        }
      />
      <main className="app-main">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 4 }}>
            Code de la partie {game.courseName && `· ${game.courseName}`}
          </div>
          <div className="game-code">{game.code}</div>
        </div>

        <div className="btn-row" style={{ marginTop: 0, marginBottom: 12 }}>
          {(['classement', 'saisie', 'cartes'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`btn small ${tab === t ? '' : 'secondary'}`}
              onClick={() => setTab(t)}
              style={{ flex: 1 }}
            >
              {t === 'classement' ? '🏆 Classement' : t === 'saisie' ? '✏️ Saisie' : '🗒️ Cartes'}
            </button>
          ))}
        </div>

        {tab === 'classement' && (
          <table className="leaderboard">
            <thead>
              <tr>
                <th className="pos"></th>
                <th>Joueur</th>
                <th className="num">Score</th>
                <th className="num">Brut</th>
                <th className="num">Thru</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.player.id} className={i === 0 && s.thru > 0 ? 'leader' : ''}>
                  <td className="pos">{s.thru > 0 ? i + 1 : '–'}</td>
                  <td className="name">{s.player.name}</td>
                  <td className="num">
                    {s.thru > 0 ? (
                      <span className={`pill ${s.toPar < 0 ? 'under' : s.toPar === 0 ? 'even' : 'over'}`}>
                        {formatToPar(s.toPar)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>–</span>
                    )}
                  </td>
                  <td className="num">{s.thru > 0 ? s.gross : '–'}</td>
                  <td className="num">{s.thru}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'saisie' && (
          <>
            <div className="hole-nav">
              <button
                className="btn secondary small"
                disabled={holeIdx === 0}
                onClick={() => setHoleIdx((i) => Math.max(0, i - 1))}
              >
                ‹
              </button>
              <div className="hole-title">
                Trou {holeIdx + 1} · Par {par}
              </div>
              <button
                className="btn secondary small"
                disabled={holeIdx === game.holesCount - 1}
                onClick={() => setHoleIdx((i) => Math.min(game.holesCount - 1, i + 1))}
              >
                ›
              </button>
            </div>
            <div className="card">
              {game.players.map((p) => {
                const current = game.scores?.[p.id]?.[holeIdx] ?? null;
                return (
                  <div className="score-row" key={p.id}>
                    <div className="player-name">{p.name}</div>
                    <div className="stepper">
                      <button onClick={() => setScore(p.id, Math.max(1, (current ?? par) - 1))}>−</button>
                      <div className="value" style={{ color: current == null ? 'var(--muted)' : undefined }}>
                        {current ?? '–'}
                      </div>
                      <button onClick={() => setScore(p.id, current == null ? par : current + 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
              Chacun peut saisir les scores de son groupe : tout se synchronise{' '}
              {usingFirebase ? 'en direct entre les téléphones' : 'sur cet appareil (mode démo)'}.
            </p>
          </>
        )}

        {tab === 'cartes' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="scorecard">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Trou</th>
                  {Array.from({ length: game.holesCount }, (_, i) => (
                    <th key={i}>{i + 1}</th>
                  ))}
                  <th>Tot</th>
                </tr>
                <tr>
                  <th style={{ textAlign: 'left' }}>Par</th>
                  {game.pars.map((p, i) => (
                    <th key={i}>{p}</th>
                  ))}
                  <th>{game.pars.reduce((a, b) => a + b, 0)}</th>
                </tr>
              </thead>
              <tbody>
                {game.players.map((p) => {
                  const playerScores = game.scores?.[p.id] ?? {};
                  let total = 0;
                  return (
                    <tr key={p.id}>
                      <td style={{ textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.name}</td>
                      {Array.from({ length: game.holesCount }, (_, i) => {
                        const s = playerScores[i];
                        if (s) total += s;
                        const diff = s ? s - (game.pars[i] ?? 4) : null;
                        return (
                          <td
                            key={i}
                            style={{
                              fontWeight: diff != null && diff < 0 ? 700 : undefined,
                              color:
                                diff == null ? 'var(--muted)' : diff < 0 ? 'var(--danger)' : diff > 0 ? undefined : 'var(--accent-strong)',
                            }}
                          >
                            {s ?? ''}
                          </td>
                        );
                      })}
                      <td style={{ fontWeight: 700 }}>{total || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
              Rouge = sous le par, vert = par.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

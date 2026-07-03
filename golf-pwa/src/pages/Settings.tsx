import { useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { exportBackup, importBackup } from '../utils/backup';

export default function Settings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    try {
      await exportBackup();
      setMessage('Sauvegarde exportée.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Échec de l\'export.');
    } finally {
      setBusy(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (
      !confirm(
        'Importer cette sauvegarde va REMPLACER toutes les données actuelles (parcours, rounds, wedges). Continuer ?',
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await importBackup(file);
      setMessage(
        `Import réussi : ${result.courses} parcours, ${result.rounds} rounds, ${result.wedgeShots} coups de wedge.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Échec de l'import.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Réglages" back />
      <main className="app-main">
        <div className="section-title">Sauvegarde des données</div>
        <div className="card">
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 0 }}>
            Toutes tes données (parcours, rounds, coups de wedge) sont stockées uniquement sur cet
            appareil, dans ce navigateur. Exporte régulièrement une sauvegarde pour ne rien perdre
            si tu changes de téléphone ou si les données du navigateur sont effacées.
          </p>
          <div className="btn-row">
            <button className="btn" disabled={busy} onClick={handleExport}>
              Exporter une sauvegarde
            </button>
            <button className="btn secondary" disabled={busy} onClick={() => fileInputRef.current?.click()}>
              Importer une sauvegarde
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </div>
          {message && (
            <div className="pill" style={{ marginTop: 10, display: 'block' }}>
              {message}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

import { db } from '../db';
import type { Course, Round, WedgeShot } from '../types';

const SCHEMA_VERSION = 1;
const BLOB_MARKER = '__blob__';

interface SerializedBlob {
  [BLOB_MARKER]: true;
  type: string;
  data: string; // base64
}

interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  courses: unknown[]; // Course[], but with photo Blobs replaced by SerializedBlob
  rounds: Round[];
  wedgeShots: WedgeShot[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

// JSON can't hold Blob (course playbook photos), so replace them with a
// base64-encoded marker object for export, and reverse that on import.
async function serializeCourse(course: Course): Promise<Course> {
  const playbook = await Promise.all(
    course.playbook.map(async (note) => {
      if (!note.photo) return note;
      const serialized: SerializedBlob = {
        [BLOB_MARKER]: true,
        type: note.photo.type,
        data: await blobToBase64(note.photo),
      };
      return { ...note, photo: serialized as unknown as Blob };
    }),
  );
  return { ...course, playbook };
}

function isSerializedBlob(value: unknown): value is SerializedBlob {
  return !!value && typeof value === 'object' && (value as Record<string, unknown>)[BLOB_MARKER] === true;
}

function deserializeCourse(course: Course): Course {
  const playbook = course.playbook.map((note) => {
    if (!isSerializedBlob(note.photo)) return note;
    return { ...note, photo: base64ToBlob(note.photo.data, note.photo.type) };
  });
  return { ...course, playbook };
}

export async function exportBackup(): Promise<void> {
  const [courses, rounds, wedgeShots] = await Promise.all([
    db.courses.toArray(),
    db.rounds.toArray(),
    db.wedgeShots.toArray(),
  ]);

  const backup: BackupFile = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    courses: await Promise.all(courses.map(serializeCourse)),
    rounds,
    wedgeShots,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `golf-stats-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.courses) && Array.isArray(v.rounds) && Array.isArray(v.wedgeShots);
}

export async function importBackup(file: File): Promise<{ courses: number; rounds: number; wedgeShots: number }> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Fichier invalide : ce n\'est pas un JSON valide.');
  }
  if (!isBackupFile(parsed)) {
    throw new Error('Fichier invalide : ce n\'est pas une sauvegarde Golf Stats reconnue.');
  }

  const courses = (parsed.courses as Course[]).map(deserializeCourse);

  await db.transaction('rw', db.courses, db.rounds, db.wedgeShots, async () => {
    await db.courses.clear();
    await db.rounds.clear();
    await db.wedgeShots.clear();
    if (courses.length) await db.courses.bulkPut(courses);
    if (parsed.rounds.length) await db.rounds.bulkPut(parsed.rounds);
    if (parsed.wedgeShots.length) await db.wedgeShots.bulkPut(parsed.wedgeShots);
  });

  return {
    courses: courses.length,
    rounds: parsed.rounds.length,
    wedgeShots: parsed.wedgeShots.length,
  };
}

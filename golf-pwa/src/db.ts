import Dexie, { type EntityTable } from 'dexie';
import type { Course, Round, WedgeShot } from './types';

const db = new Dexie('golf-stats-db') as Dexie & {
  courses: EntityTable<Course, 'id'>;
  rounds: EntityTable<Round, 'id'>;
  wedgeShots: EntityTable<WedgeShot, 'id'>;
};

db.version(1).stores({
  courses: '++id, name, updatedAt',
  rounds: '++id, courseId, date, createdAt',
  wedgeShots: '++id, club, date, createdAt',
});

export { db };

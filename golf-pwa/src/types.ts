// Domain types for the golf stats PWA

export type FairwayHit = 'G' | 'C' | 'D'; // Gauche / Centre / Droite

export interface TeeDistance {
  teeName: string;
  distance: number; // meters
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export type PointOfInterestKind =
  | 'green_front'
  | 'green_back'
  | 'water'
  | 'bunker'
  | 'ob'
  | 'tree'
  | 'layup'
  | 'other';

export const POINT_KIND_LABELS: Record<PointOfInterestKind, string> = {
  green_front: 'Entrée de green',
  green_back: 'Sortie de green',
  water: "Plan d'eau",
  bunker: 'Bunker',
  ob: 'Hors-limites',
  tree: 'Arbre',
  layup: 'Point de layup',
  other: 'Autre',
};

export interface CoursePoint {
  id: string;
  kind: PointOfInterestKind;
  label?: string;
  point: GeoPoint;
}

export interface CourseHole {
  number: number; // 1-18
  par: 3 | 4 | 5;
  index: number; // stroke index 1-18
  distances: TeeDistance[];
  teeLocations?: { teeName: string; point: GeoPoint }[]; // GPS-captured tee positions
  greenLocation?: GeoPoint; // GPS-captured green position (middle/pin reference)
  points?: CoursePoint[]; // GPS-captured hazards, layup markers, green front/back, etc.
}

export interface PlaybookNote {
  holeNumber: number; // 1-18
  startClub: string;
  avoidZones: string;
  greenBreak: string;
  strategy: string;
}

export interface Course {
  id?: number;
  name: string;
  location?: string;
  tees: string[]; // e.g. ["Championship", "Homme", "Femme"]
  holes: CourseHole[]; // length 18
  playbook: PlaybookNote[]; // length 18
  createdAt: number;
  updatedAt: number;
}

export interface HoleResult {
  number: number; // 1-18
  par: number;
  score: number | null;
  fairway: FairwayHit | null; // null when par3 or n/a
  gir: boolean | null;
  putts: number | null;
  penalties: number;
  upDown: boolean | null; // only meaningful when GIR is false
}

export interface Round {
  id?: number;
  courseId: number;
  courseName: string; // denormalized for display/export even if course deleted
  date: string; // ISO date (yyyy-mm-dd)
  teeName: string;
  holes: HoleResult[]; // length 18
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type WedgeTrajectory = 'plein' | '3/4' | '1/2' | '1/4';

export interface WedgeShot {
  id?: number;
  date: string; // ISO date
  club: string; // e.g. PW, 52, 56, 60
  trajectory: WedgeTrajectory;
  carryDistance: number; // meters
  lateralDispersion: number; // meters, negative = left, positive = right
  note?: string;
  createdAt: number;
}

export function emptyHoleResult(number: number, par: number): HoleResult {
  return {
    number,
    par,
    score: null,
    fairway: par === 3 ? null : null,
    gir: null,
    putts: null,
    penalties: 0,
    upDown: null,
  };
}

export function defaultCourseHoles(): CourseHole[] {
  return Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    index: i + 1,
    distances: [],
  }));
}

export function defaultPlaybook(): PlaybookNote[] {
  return Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    startClub: '',
    avoidZones: '',
    greenBreak: '',
    strategy: '',
  }));
}

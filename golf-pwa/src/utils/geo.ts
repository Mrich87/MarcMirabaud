import type { GeoPoint } from '../types';

// Haversine distance in meters between two GPS points.
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Local flat-earth projection (meters) around an origin point. Good enough
// for distances of a few hundred meters, i.e. a single golf hole.
function toLocalMeters(origin: GeoPoint, p: GeoPoint): { x: number; y: number } {
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((origin.lat * Math.PI) / 180);
  return {
    x: (p.lon - origin.lon) * metersPerDegLon,
    y: (p.lat - origin.lat) * metersPerDegLat,
  };
}

function fromLocalMeters(origin: GeoPoint, x: number, y: number): GeoPoint {
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((origin.lat * Math.PI) / 180);
  return {
    lat: origin.lat + y / metersPerDegLat,
    lon: origin.lon + x / metersPerDegLon,
  };
}

// Projects a point onto the axis running from `origin` to `axisEnd`, returning
// the distance along that axis (meters, origin = 0) and the signed lateral
// offset (meters, positive = right of the axis looking from origin to axisEnd).
export function projectOntoAxis(
  origin: GeoPoint,
  axisEnd: GeoPoint,
  p: GeoPoint,
): { along: number; lateral: number } {
  const end = toLocalMeters(origin, axisEnd);
  const pt = toLocalMeters(origin, p);
  const axisLen = Math.hypot(end.x, end.y) || 1;
  const ux = end.x / axisLen;
  const uy = end.y / axisLen;
  const along = pt.x * ux + pt.y * uy;
  const lateral = pt.x * uy - pt.y * ux;
  return { along, lateral };
}

// Inverse of projectOntoAxis: turns an (along, lateral) offset back into a GPS point.
export function unprojectFromAxis(
  origin: GeoPoint,
  axisEnd: GeoPoint,
  along: number,
  lateral: number,
): GeoPoint {
  const end = toLocalMeters(origin, axisEnd);
  const axisLen = Math.hypot(end.x, end.y) || 1;
  const ux = end.x / axisLen;
  const uy = end.y / axisLen;
  const x = along * ux + lateral * uy;
  const y = along * uy - lateral * ux;
  return fromLocalMeters(origin, x, y);
}

export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(geoErrorMessage(err))),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function geoErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Position refusée. Autorise la géolocalisation pour ce site dans les réglages.";
    case err.POSITION_UNAVAILABLE:
      return 'Position indisponible pour le moment.';
    case err.TIMEOUT:
      return 'Délai dépassé pour obtenir la position.';
    default:
      return 'Impossible de récupérer la position.';
  }
}

// --- OpenStreetMap course search/import ---

export interface OsmCourseCandidate {
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  name: string;
  displayName: string;
  point: GeoPoint;
}

export async function searchOsmCourses(query: string): Promise<OsmCourseCandidate[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '8');
  url.searchParams.set('extratags', '0');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Recherche OpenStreetMap indisponible (' + res.status + ')');
  const results: any[] = await res.json();

  return results
    .filter((r) => r.class === 'leisure' && r.type === 'golf_course')
    .map((r) => ({
      osmType: r.osm_type,
      osmId: r.osm_id,
      name: r.name ?? r.display_name.split(',')[0],
      displayName: r.display_name,
      point: { lat: Number(r.lat), lon: Number(r.lon) },
    }));
}

export interface OsmHole {
  number: number;
  par?: number;
}

export interface OsmCourseImport {
  holes: OsmHole[];
}

export async function fetchOsmCourseHoles(center: GeoPoint): Promise<OsmCourseImport> {
  const query = `[out:json][timeout:25];(way["golf"="hole"](around:2500,${center.lat},${center.lon});relation["golf"="hole"](around:2500,${center.lat},${center.lon}););out tags;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!res.ok) throw new Error('Overpass indisponible (' + res.status + ')');
  const data = await res.json();

  const holes: OsmHole[] = (data.elements ?? [])
    .map((el: any) => {
      const ref = el.tags?.ref ?? el.tags?.['golf:hole'];
      const par = el.tags?.par ?? el.tags?.['golf:par'];
      const number = ref ? parseInt(ref, 10) : NaN;
      return Number.isFinite(number)
        ? { number, par: par ? parseInt(par, 10) : undefined }
        : null;
    })
    .filter((h: OsmHole | null): h is OsmHole => h != null)
    .sort((a: OsmHole, b: OsmHole) => a.number - b.number);

  // de-duplicate by hole number (some courses map both a way and points per hole)
  const seen = new Set<number>();
  const deduped = holes.filter((h) => {
    if (seen.has(h.number)) return false;
    seen.add(h.number);
    return true;
  });

  return { holes: deduped };
}

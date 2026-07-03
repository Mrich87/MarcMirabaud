import type { CourseHole, PointOfInterestKind } from '../types';
import { distanceMeters, projectOntoAxis } from '../utils/geo';

interface HoleMapProps {
  hole: CourseHole;
  primaryTeeName?: string;
}

const KIND_STYLE: Record<PointOfInterestKind, { color: string; short: string }> = {
  green_front: { color: '#2c9b4a', short: 'Entrée' },
  green_back: { color: '#2c9b4a', short: 'Sortie' },
  water: { color: '#2f6fb3', short: 'Eau' },
  bunker: { color: '#c9a24b', short: 'Bunker' },
  ob: { color: '#c0392b', short: 'HL' },
  tree: { color: '#1e5c2a', short: 'Arbre' },
  layup: { color: '#6b7570', short: 'Layup' },
  other: { color: '#6b7570', short: '' },
};

const WIDTH = 260;
const HEIGHT = 520;
const MARGIN = 34;
const FAIRWAY_HALF_WIDTH = 32;
const LATERAL_SCALE = 1.6; // px per meter, exaggerated for readability

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function HoleMap({ hole, primaryTeeName }: HoleMapProps) {
  const teeEntry =
    (primaryTeeName && hole.teeLocations?.find((t) => t.teeName === primaryTeeName)) ||
    hole.teeLocations?.[0];

  if (!teeEntry || !hole.greenLocation) {
    return (
      <div className="empty-state" style={{ padding: 20 }}>
        Capture au moins un départ et le green pour voir le dessin du trou.
      </div>
    );
  }

  const origin = teeEntry.point;
  const axisEnd = hole.greenLocation;
  const axisLen = Math.max(1, distanceMeters(origin, axisEnd));

  const scaleY = (HEIGHT - 2 * MARGIN) / axisLen;
  const yFor = (along: number) => HEIGHT - MARGIN - along * scaleY;
  const xFor = (lateral: number) => clamp(WIDTH / 2 + lateral * LATERAL_SCALE, 16, WIDTH - 16);

  const teeY = yFor(0);
  const greenY = yFor(axisLen);
  const centerX = WIDTH / 2;

  const otherTees = (hole.teeLocations ?? []).filter((t) => t.teeName !== teeEntry.teeName);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      style={{ maxWidth: 320, display: 'block', margin: '0 auto', background: '#eef6f0', borderRadius: 12 }}
    >
      {/* fairway band */}
      <rect
        x={centerX - FAIRWAY_HALF_WIDTH}
        y={greenY - 10}
        width={FAIRWAY_HALF_WIDTH * 2}
        height={teeY - greenY + 20}
        rx={FAIRWAY_HALF_WIDTH}
        fill="#d7ecdc"
      />

      {/* other tees (secondary) */}
      {otherTees.map((t) => {
        const { along, lateral } = projectOntoAxis(origin, axisEnd, t.point);
        return (
          <g key={t.teeName}>
            <circle cx={xFor(lateral)} cy={yFor(along)} r={5} fill="#9aa79e" />
            <text x={xFor(lateral) + 8} y={yFor(along) + 3} fontSize={9} fill="#6b7570">
              {t.teeName}
            </text>
          </g>
        );
      })}

      {/* points of interest */}
      {(hole.points ?? []).map((p) => {
        const { along, lateral } = projectOntoAxis(origin, axisEnd, p.point);
        const style = KIND_STYLE[p.kind];
        const x = xFor(lateral);
        const y = yFor(along);
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={6} fill={style.color} stroke="white" strokeWidth={1.5} />
            <text x={x + 9} y={y + 3} fontSize={9} fill={style.color} fontWeight={600}>
              {p.label || style.short} · {Math.round(along)}m
            </text>
          </g>
        );
      })}

      {/* tee marker */}
      <polygon
        points={`${centerX - 8},${teeY + 8} ${centerX + 8},${teeY + 8} ${centerX},${teeY - 6}`}
        fill="#155c2c"
      />
      <text x={centerX + 14} y={teeY + 4} fontSize={10} fill="#155c2c" fontWeight={700}>
        Départ {teeEntry.teeName}
      </text>

      {/* green marker */}
      <circle cx={centerX} cy={greenY} r={16} fill="#2c9b4a" stroke="white" strokeWidth={2} />
      <text x={centerX} y={greenY - 22} fontSize={11} fill="#155c2c" fontWeight={700} textAnchor="middle">
        Green · {Math.round(axisLen)}m
      </text>
    </svg>
  );
}

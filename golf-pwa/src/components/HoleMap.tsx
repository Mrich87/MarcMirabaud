import { useRef } from 'react';
import type { CourseHole, GeoPoint, PointOfInterestKind } from '../types';
import { distanceMeters, projectOntoAxis, unprojectFromAxis } from '../utils/geo';

interface HoleMapProps {
  hole: CourseHole;
  primaryTeeName?: string;
  editable?: boolean;
  placing?: boolean;
  selectedPointId?: string | null;
  onSelectPoint?: (id: string) => void;
  onMoveTee?: (teeName: string, point: GeoPoint) => void;
  onMoveGreen?: (point: GeoPoint) => void;
  onMovePoint?: (id: string, point: GeoPoint) => void;
  onPlacePoint?: (point: GeoPoint) => void;
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
const DRAG_THRESHOLD = 5; // px of movement before a pointer-down counts as a drag, not a tap

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

type DragTarget = { kind: 'tee'; teeName: string } | { kind: 'green' } | { kind: 'poi'; id: string };

export default function HoleMap({
  hole,
  primaryTeeName,
  editable = false,
  placing = false,
  selectedPointId = null,
  onSelectPoint,
  onMoveTee,
  onMoveGreen,
  onMovePoint,
  onPlacePoint,
}: HoleMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    target: DragTarget;
    startClientX: number;
    startClientY: number;
    moved: boolean;
    // Frozen at drag start: dragging the tee or green would otherwise move the
    // very axis used to interpret pointer position, causing runaway feedback.
    axisOrigin: GeoPoint;
    axisEnd: GeoPoint;
  } | null>(null);

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

  // Self-contained on purpose: takes its own origin/axisEnd rather than closing
  // over the component's live `scaleY` etc., so that dragging the tee or green
  // (which are themselves the axis) doesn't shift the ruler mid-drag.
  function clientToGeo(clientX: number, clientY: number, refOrigin: GeoPoint, refAxisEnd: GeoPoint): GeoPoint | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    const refLen = Math.max(1, distanceMeters(refOrigin, refAxisEnd));
    const refScaleY = (HEIGHT - 2 * MARGIN) / refLen;
    const along = (HEIGHT - MARGIN - local.y) / refScaleY;
    const lateral = (local.x - WIDTH / 2) / LATERAL_SCALE;
    return unprojectFromAxis(refOrigin, refAxisEnd, along, lateral);
  }

  function startDrag(e: React.PointerEvent, target: DragTarget) {
    if (!editable) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      target,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
      axisOrigin: origin,
      axisEnd,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const geo = clientToGeo(e.clientX, e.clientY, drag.axisOrigin, drag.axisEnd);
    if (!geo) return;
    if (drag.target.kind === 'tee') onMoveTee?.(drag.target.teeName, geo);
    else if (drag.target.kind === 'green') onMoveGreen?.(geo);
    else onMovePoint?.(drag.target.id, geo);
  }

  function onPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (!drag.moved && drag.target.kind === 'poi') {
      onSelectPoint?.(drag.target.id);
    }
    (e.target as Element).releasePointerCapture(e.pointerId);
  }

  function onBackgroundClick(e: React.MouseEvent) {
    if (!placing || !onPlacePoint) return;
    const geo = clientToGeo(e.clientX, e.clientY, origin, axisEnd);
    if (geo) onPlacePoint(geo);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      style={{
        maxWidth: 320,
        display: 'block',
        margin: '0 auto',
        background: '#eef6f0',
        borderRadius: 12,
        touchAction: editable ? 'none' : undefined,
        cursor: placing ? 'crosshair' : undefined,
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* fairway band (also the tap target for placing new points) */}
      <rect
        x={centerX - FAIRWAY_HALF_WIDTH}
        y={greenY - 10}
        width={FAIRWAY_HALF_WIDTH * 2}
        height={teeY - greenY + 20}
        rx={FAIRWAY_HALF_WIDTH}
        fill="#d7ecdc"
        onClick={onBackgroundClick}
        data-testid="fairway-tap-target"
      />

      {/* other tees (secondary) */}
      {otherTees.map((t) => {
        const { along, lateral } = projectOntoAxis(origin, axisEnd, t.point);
        return (
          <g
            key={t.teeName}
            onPointerDown={(e) => startDrag(e, { kind: 'tee', teeName: t.teeName })}
            style={{ cursor: editable ? 'grab' : undefined }}
          >
            <circle cx={xFor(lateral)} cy={yFor(along)} r={7} fill="#9aa79e" />
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
        const selected = p.id === selectedPointId;
        return (
          <g
            key={p.id}
            onPointerDown={(e) => startDrag(e, { kind: 'poi', id: p.id })}
            style={{ cursor: editable ? 'grab' : undefined }}
          >
            {selected && <circle cx={x} cy={y} r={11} fill="none" stroke={style.color} strokeWidth={1.5} />}
            <circle cx={x} cy={y} r={6} fill={style.color} stroke="white" strokeWidth={1.5} />
            <text x={x + 9} y={y + 3} fontSize={9} fill={style.color} fontWeight={600}>
              {p.label || style.short} · {Math.round(along)}m
            </text>
          </g>
        );
      })}

      {/* tee marker */}
      <g onPointerDown={(e) => startDrag(e, { kind: 'tee', teeName: teeEntry.teeName })} style={{ cursor: editable ? 'grab' : undefined }}>
        <polygon
          points={`${centerX - 8},${teeY + 8} ${centerX + 8},${teeY + 8} ${centerX},${teeY - 6}`}
          fill="#155c2c"
        />
        <text x={centerX + 14} y={teeY + 4} fontSize={10} fill="#155c2c" fontWeight={700}>
          Départ {teeEntry.teeName}
        </text>
      </g>

      {/* green marker */}
      <g onPointerDown={(e) => startDrag(e, { kind: 'green' })} style={{ cursor: editable ? 'grab' : undefined }}>
        <circle cx={centerX} cy={greenY} r={16} fill="#2c9b4a" stroke="white" strokeWidth={2} />
        <text x={centerX} y={greenY - 22} fontSize={11} fill="#155c2c" fontWeight={700} textAnchor="middle">
          Green · {Math.round(axisLen)}m
        </text>
      </g>
    </svg>
  );
}

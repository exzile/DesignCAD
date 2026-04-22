import type { FormCage, SketchConstraint, SketchEntity, SketchPoint } from '../../../types/cad';
import { GeometryEngine } from '../../../engine/GeometryEngine';
import { solveConstraints } from '../../../engine/ConstraintSolver';
import type { CADSliceContext } from '../sliceContext';
import type { CADState } from '../state';

export function createSelectionAndSketchOpsSlice({ set, get }: CADSliceContext) {
  const slice: Partial<CADState> = {
  selectedFeatureId: null,
  setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),

  selectedEntityIds: [],
  setSelectedEntityIds: (ids) => set({ selectedEntityIds: ids }),
  toggleEntitySelection: (id) => set((state) => {
    const ids = state.selectedEntityIds;
    return {
      selectedEntityIds: ids.includes(id)
        ? ids.filter((i) => i !== id)
        : [...ids, id],
    };
  }),

  // D204 — Window Selection
  windowSelecting: false,
  windowSelectStart: null,
  windowSelectEnd: null,
  setWindowSelectStart: (p) => set({ windowSelecting: true, windowSelectStart: p, windowSelectEnd: p }),
  setWindowSelectEnd: (p) => set({ windowSelectEnd: p }),
  clearWindowSelect: () => set({ windowSelecting: false, windowSelectStart: null, windowSelectEnd: null }),

  // D205 — Lasso Selection
  lassoSelecting: false,
  lassoPoints: [],
  setLassoSelecting: (v) => set({ lassoSelecting: v }),
  setLassoPoints: (pts) => set({ lassoPoints: pts }),
  clearLasso: () => set({ lassoSelecting: false, lassoPoints: [] }),


  // ── Form state ───────────────────────────────────────────────────────
  formBodies: [],
  activeFormBodyId: null,
  formSelection: null,
  addFormBody: (cage) => set((state) => ({ formBodies: [...state.formBodies, cage] })),
  removeFormBody: (id) => set((state) => ({
    formBodies: state.formBodies.filter((b) => b.id !== id),
    activeFormBodyId: state.activeFormBodyId === id ? null : state.activeFormBodyId,
    formSelection: state.formSelection?.bodyId === id ? null : state.formSelection,
  })),
  setActiveFormBody: (id) => set({ activeFormBodyId: id }),
  setFormSelection: (sel) => set({ formSelection: sel }),
  deleteFormElements: (type, ids) => set((state) => {
    const body = state.formBodies.find((b) => b.id === state.activeFormBodyId);
    if (!body) return {};
    let updated: FormCage;
    if (type === 'vertex') {
      const removed = new Set(ids);
      // Remove vertex + any edges/faces that reference it
      const cleanEdges = body.edges.filter(
        (e) => !removed.has(e.vertexIds[0]) && !removed.has(e.vertexIds[1])
      );
      const cleanFaces = body.faces.filter(
        (f) => !f.vertexIds.some((v) => removed.has(v))
      );
      updated = { ...body, vertices: body.vertices.filter((v) => !removed.has(v.id)), edges: cleanEdges, faces: cleanFaces };
    } else if (type === 'edge') {
      const removed = new Set(ids);
      updated = { ...body, edges: body.edges.filter((e) => !removed.has(e.id)) };
    } else {
      const removed = new Set(ids);
      updated = { ...body, faces: body.faces.filter((f) => !removed.has(f.id)) };
    }
    return { formBodies: state.formBodies.map((b) => b.id === updated.id ? updated : b), formSelection: null };
  }),

  updateFormVertices: (bodyId, updates) => set((state) => {
    const body = state.formBodies.find((b) => b.id === bodyId);
    if (!body) return {};
    const posMap = new Map(updates.map((u) => [u.id, u.position]));
    const newVerts = body.vertices.map((v) =>
      posMap.has(v.id) ? { ...v, position: posMap.get(v.id)! } : v
    );
    return { formBodies: state.formBodies.map((b) => b.id === bodyId ? { ...body, vertices: newVerts } : b) };
  }),

  setFormBodySubdivisionLevel: (id, level) => set((state) => ({
    // Clamp at 3 — FormBodies renderer caps subdivision at 3 for performance;
    // higher levels would be silently ignored and confuse the user.
    formBodies: state.formBodies.map((b) =>
      b.id !== id ? b : { ...b, subdivisionLevel: Math.max(1, Math.min(3, level)) }
    ),
  })),

  setFormBodyCrease: (id, crease) => set((state) => ({
    formBodies: state.formBodies.map((b) =>
      b.id !== id ? b : { ...b, vertices: b.vertices.map((v) => ({ ...v, crease })) }
    ),
  })),

  frozenFormVertices: [],
  toggleFrozenFormVertex: (id) => set((state) => {
    const frozen = state.frozenFormVertices;
    return {
      frozenFormVertices: frozen.includes(id)
        ? frozen.filter((v) => v !== id)
        : [...frozen, id],
    };
  }),

  gridSize: 10,
  setGridSize: (size) => set({ gridSize: size }),
  sketchGridSize: null,
  setSketchGridSize: (size) => set({ sketchGridSize: size }),
  snapEnabled: true,
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  // NAV-24: per-type object snap toggles (all on by default)
  objectSnapEnabled: true,
  setObjectSnapEnabled: (v) => set({ objectSnapEnabled: v }),
  snapToEndpoint: true,
  setSnapToEndpoint: (v) => set({ snapToEndpoint: v }),
  snapToMidpoint: true,
  setSnapToMidpoint: (v) => set({ snapToMidpoint: v }),
  snapToCenter: true,
  setSnapToCenter: (v) => set({ snapToCenter: v }),
  snapToIntersection: true,
  setSnapToIntersection: (v) => set({ snapToIntersection: v }),
  snapToPerpendicular: true,
  setSnapToPerpendicular: (v) => set({ snapToPerpendicular: v }),
  snapToTangent: true,
  setSnapToTangent: (v) => set({ snapToTangent: v }),
  gridVisible: true,
  setGridVisible: (visible) => set({ gridVisible: visible }),
  sketchPolygonSides: 6,
  setSketchPolygonSides: (sides) => set({ sketchPolygonSides: Math.max(3, Math.min(128, Math.round(sides))) }),
  sketchFilletRadius: 2,
  setSketchFilletRadius: (r) => set({ sketchFilletRadius: Math.max(0.01, r) }),
  sketchSlotWidth: 4,
  setSketchSlotWidth: (w) => set({ sketchSlotWidth: Math.max(0.01, w) }),

  sketchRectPatternCountX: 3,
  sketchRectPatternCountY: 2,
  sketchRectPatternSpacingX: 10,
  sketchRectPatternSpacingY: 10,
  setSketchRectPattern: (params) => set((state) => ({
    sketchRectPatternCountX: params.countX ?? state.sketchRectPatternCountX,
    sketchRectPatternCountY: params.countY ?? state.sketchRectPatternCountY,
    sketchRectPatternSpacingX: params.spacingX ?? state.sketchRectPatternSpacingX,
    sketchRectPatternSpacingY: params.spacingY ?? state.sketchRectPatternSpacingY,
  })),
  commitSketchRectPattern: () => {
    const { activeSketch, sketchRectPatternCountX: cx, sketchRectPatternCountY: cy,
            sketchRectPatternSpacingX: sx, sketchRectPatternSpacingY: sy } = get();
    if (!activeSketch || activeSketch.entities.length === 0) return;
    const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
    const copies: SketchEntity[] = [];
    for (let row = 0; row < cy; row++) {
      for (let col = 0; col < cx; col++) {
        if (row === 0 && col === 0) continue; // skip the original instance
        const dx = t1.x * sx * col + t2.x * sy * row;
        const dy = t1.y * sx * col + t2.y * sy * row;
        const dz = t1.z * sx * col + t2.z * sy * row;
        for (const ent of activeSketch.entities) {
          copies.push({
            ...ent,
            id: crypto.randomUUID(),
            points: ent.points.map((p) => ({ ...p, id: crypto.randomUUID(), x: p.x + dx, y: p.y + dy, z: p.z + dz })),
          });
        }
      }
    }
    set({
      activeSketch: { ...activeSketch, entities: [...activeSketch.entities, ...copies] },
      statusMessage: `Rectangular pattern: ${cx}×${cy} (${copies.length} new entities added)`,
    });
  },

  sketchCircPatternCount: 6,
  sketchCircPatternRadius: 10,
  sketchCircPatternAngle: 360,
  setSketchCircPattern: (params) => set((state) => ({
    sketchCircPatternCount: params.count ?? state.sketchCircPatternCount,
    sketchCircPatternRadius: params.radius ?? state.sketchCircPatternRadius,
    sketchCircPatternAngle: params.angle ?? state.sketchCircPatternAngle,
  })),
  commitSketchCircPattern: () => {
    const { activeSketch, sketchCircPatternCount: cnt,
            sketchCircPatternAngle: totalDeg } = get();
    if (!activeSketch || activeSketch.entities.length === 0) return;
    const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
    // Compute centroid of current sketch entities as pattern origin
    let cx = 0, cy2 = 0, cz = 0, ptCount = 0;
    for (const ent of activeSketch.entities) {
      for (const p of ent.points) { cx += p.x; cy2 += p.y; cz += p.z; ptCount++; }
    }
    if (ptCount === 0) return;
    cx /= ptCount; cy2 /= ptCount; cz /= ptCount;
    const copies: SketchEntity[] = [];
    const totalRad = (totalDeg * Math.PI) / 180;
    for (let i = 1; i < cnt; i++) {
      const angle = (totalRad / cnt) * i;
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      for (const ent of activeSketch.entities) {
        copies.push({
          ...ent,
          id: crypto.randomUUID(),
          points: ent.points.map((p) => {
            // Translate to centroid, rotate in t1/t2 plane, translate back
            const lx = (p.x - cx) * t1.x + (p.y - cy2) * t1.y + (p.z - cz) * t1.z;
            const ly = (p.x - cx) * t2.x + (p.y - cy2) * t2.y + (p.z - cz) * t2.z;
            const rx = lx * cosA - ly * sinA;
            const ry = lx * sinA + ly * cosA;
            return {
              ...p, id: crypto.randomUUID(),
              x: cx + t1.x * rx + t2.x * ry,
              y: cy2 + t1.y * rx + t2.y * ry,
              z: cz + t1.z * rx + t2.z * ry,
            };
          }),
        });
      }
    }
    set({
      activeSketch: { ...activeSketch, entities: [...activeSketch.entities, ...copies] },
      statusMessage: `Circular pattern: ${cnt} instances (${copies.length} new entities added)`,
    });
  },

  // SK-A2: Sketch Pattern on Path
  sketchPathPatternCount: 4,
  sketchPathPatternPathEntityId: '',
  sketchPathPatternAlignment: 'tangent' as 'tangent' | 'fixed',
  setSketchPathPattern: (params) => set((state) => ({
    sketchPathPatternCount: params.count ?? state.sketchPathPatternCount,
    sketchPathPatternPathEntityId: params.pathEntityId ?? state.sketchPathPatternPathEntityId,
    sketchPathPatternAlignment: params.alignment ?? state.sketchPathPatternAlignment,
  })),
  commitSketchPathPattern: () => {
    const { activeSketch, sketchPathPatternCount: cnt,
            sketchPathPatternPathEntityId: pathId,
            sketchPathPatternAlignment: alignment } = get();
    if (!activeSketch) return;
    // Find the path entity by id
    const pathEnt = activeSketch.entities.find((e) => e.id === pathId);
    if (!pathEnt || pathEnt.points.length < 2) {
      set({ statusMessage: 'Pattern on Path: select a path curve with at least 2 points' });
      return;
    }
    // Build a polyline of cumulative arc lengths along the path
    const pts = pathEnt.points;
    const segLengths: number[] = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y, dz = pts[i].z - pts[i-1].z;
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
      segLengths.push(len);
      total += len;
    }
    if (total < 0.001) {
      set({ statusMessage: 'Pattern on Path: path has zero length' });
      return;
    }
    // Sample `cnt` equidistant points along the path
    const samplePt = (frac: number): { x: number; y: number; z: number; tx: number; ty: number; tz: number } => {
      const target = frac * total;
      let acc = 0;
      for (let i = 0; i < segLengths.length; i++) {
        const segEnd = acc + segLengths[i];
        if (target <= segEnd + 1e-9) {
          const t = segLengths[i] > 0 ? (target - acc) / segLengths[i] : 0;
          const p0 = pts[i], p1 = pts[i+1];
          const tx = p1.x - p0.x, ty = p1.y - p0.y, tz = p1.z - p0.z;
          const tLen = Math.sqrt(tx*tx + ty*ty + tz*tz) || 1;
          return {
            x: p0.x + tx * t, y: p0.y + ty * t, z: p0.z + tz * t,
            tx: tx/tLen, ty: ty/tLen, tz: tz/tLen,
          };
        }
        acc = segEnd;
      }
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const tx = last.x - prev.x, ty = last.y - prev.y, tz = last.z - prev.z;
      const tLen = Math.sqrt(tx*tx + ty*ty + tz*tz) || 1;
      return { x: last.x, y: last.y, z: last.z, tx: tx/tLen, ty: ty/tLen, tz: tz/tLen };
    };
    // The origin of the pattern is at the path start (frac=0)
    const origin = samplePt(0);
    // Entities to pattern = all non-path entities
    const sourceEnts = activeSketch.entities.filter((e) => e.id !== pathId);
    if (sourceEnts.length === 0) {
      set({ statusMessage: 'Pattern on Path: no entities to pattern (path entity only)' });
      return;
    }
    const copies: SketchEntity[] = [];
    for (let i = 1; i < cnt; i++) {
      const sp = samplePt(i / (cnt - 1));
      const dx = sp.x - origin.x, dy = sp.y - origin.y, dz = sp.z - origin.z;
      for (const ent of sourceEnts) {
        const newEnt: SketchEntity = {
          ...ent,
          id: crypto.randomUUID(),
          points: ent.points.map((p) => ({ ...p, id: crypto.randomUUID(), x: p.x + dx, y: p.y + dy, z: p.z + dz })),
        };
        if (alignment === 'tangent') {
          // Rotate entities in sketch plane to align with path tangent (2D rotation)
          const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
          // Origin tangent direction projected into sketch plane
          const otx = origin.tx * t1.x + origin.ty * t1.y + origin.tz * t1.z;
          const oty = origin.tx * t2.x + origin.ty * t2.y + origin.tz * t2.z;
          const oAngle = Math.atan2(oty, otx);
          const stx = sp.tx * t1.x + sp.ty * t1.y + sp.tz * t1.z;
          const sty = sp.tx * t2.x + sp.ty * t2.y + sp.tz * t2.z;
          const sAngle = Math.atan2(sty, stx);
          const dAngle = sAngle - oAngle;
          const cosA = Math.cos(dAngle), sinA = Math.sin(dAngle);
          // Pivot = position of the entity centroid after translation
          let px = 0, py = 0, pz = 0, pc = 0;
          for (const p of newEnt.points) { px += p.x; py += p.y; pz += p.z; pc++; }
          if (pc > 0) { px /= pc; py /= pc; pz /= pc; }
          newEnt.points = newEnt.points.map((p) => {
            const lx = (p.x - px) * t1.x + (p.y - py) * t1.y + (p.z - pz) * t1.z;
            const ly = (p.x - px) * t2.x + (p.y - py) * t2.y + (p.z - pz) * t2.z;
            const rx = lx * cosA - ly * sinA;
            const ry = lx * sinA + ly * cosA;
            return { ...p, id: crypto.randomUUID(), x: px + t1.x*rx + t2.x*ry, y: py + t1.y*rx + t2.y*ry, z: pz + t1.z*rx + t2.z*ry };
          });
        }
        copies.push(newEnt);
      }
    }
    set({
      activeSketch: { ...activeSketch, entities: [...activeSketch.entities, ...copies] },
      statusMessage: `Pattern on Path: ${cnt} instances (${copies.length} new entities added)`,
    });
  },

  // Sketch Move / Copy (D24)
  sketchMoveDx: 10,
  sketchMoveDy: 0,
  sketchMoveCopy: false,
  setSketchMove: (params) => set((state) => ({
    sketchMoveDx: params.dx ?? state.sketchMoveDx,
    sketchMoveDy: params.dy ?? state.sketchMoveDy,
    sketchMoveCopy: params.copy ?? state.sketchMoveCopy,
  })),
  commitSketchMove: () => {
    const { activeSketch, sketchMoveDx: dx, sketchMoveDy: dy, sketchMoveCopy: copy } = get();
    if (!activeSketch || activeSketch.entities.length === 0) return;
    const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
    const offsetX = t1.x * dx + t2.x * dy;
    const offsetY = t1.y * dx + t2.y * dy;
    const offsetZ = t1.z * dx + t2.z * dy;
    const translatePts = (ents: SketchEntity[]): SketchEntity[] =>
      ents.map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        points: e.points.map((p) => ({ ...p, id: crypto.randomUUID(), x: p.x + offsetX, y: p.y + offsetY, z: p.z + offsetZ })),
      }));
    const translated = translatePts(activeSketch.entities);
    const newEntities = copy
      ? [...activeSketch.entities, ...translated]
      : translated;
    set({
      activeSketch: { ...activeSketch, entities: newEntities },
      statusMessage: copy ? `Copy moved by (${dx}, ${dy})` : `Sketch moved by (${dx}, ${dy})`,
    });
  },

  // Sketch Scale (D25)
  sketchScaleFactor: 2,
  setSketchScaleFactor: (f) => set({ sketchScaleFactor: Math.max(0.001, f) }),
  commitSketchScale: () => {
    const { activeSketch, sketchScaleFactor: factor } = get();
    if (!activeSketch || activeSketch.entities.length === 0) return;
    // Compute centroid as scale anchor
    let cx = 0, cy2 = 0, cz = 0, n = 0;
    for (const e of activeSketch.entities) {
      for (const p of e.points) { cx += p.x; cy2 += p.y; cz += p.z; n++; }
    }
    if (n === 0) return;
    cx /= n; cy2 /= n; cz /= n;
    const scaled = activeSketch.entities.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      points: e.points.map((p) => ({
        ...p, id: crypto.randomUUID(),
        x: cx + (p.x - cx) * factor,
        y: cy2 + (p.y - cy2) * factor,
        z: cz + (p.z - cz) * factor,
      })),
      radius: e.radius !== undefined ? e.radius * Math.abs(factor) : undefined,
    }));
    set({
      activeSketch: { ...activeSketch, entities: scaled },
      statusMessage: `Sketch scaled by ${factor}×`,
    });
  },

  // Sketch Rotate (D26)
  sketchRotateAngle: 90,
  setSketchRotateAngle: (a) => set({ sketchRotateAngle: a }),
  commitSketchRotate: () => {
    const { activeSketch, sketchRotateAngle: angleDeg } = get();
    if (!activeSketch || activeSketch.entities.length === 0) return;
    const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
    // Compute centroid as pivot
    let cx = 0, cy2 = 0, cz = 0, n = 0;
    for (const e of activeSketch.entities) {
      for (const p of e.points) { cx += p.x; cy2 += p.y; cz += p.z; n++; }
    }
    if (n === 0) return;
    cx /= n; cy2 /= n; cz /= n;
    const angle = (angleDeg * Math.PI) / 180;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const rotPt = (p: SketchPoint): SketchPoint => {
      const lx = (p.x - cx) * t1.x + (p.y - cy2) * t1.y + (p.z - cz) * t1.z;
      const ly = (p.x - cx) * t2.x + (p.y - cy2) * t2.y + (p.z - cz) * t2.z;
      const rx = lx * cosA - ly * sinA;
      const ry = lx * sinA + ly * cosA;
      return { ...p, id: crypto.randomUUID(), x: cx + t1.x * rx + t2.x * ry, y: cy2 + t1.y * rx + t2.y * ry, z: cz + t1.z * rx + t2.z * ry };
    };
    const rotated = activeSketch.entities.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      points: e.points.map(rotPt),
    }));
    set({
      activeSketch: { ...activeSketch, entities: rotated },
      statusMessage: `Sketch rotated ${angleDeg}°`,
    });
  },

  // Sketch Offset (D20)
  sketchOffsetDistance: 2,
  setSketchOffsetDistance: (d) => set({ sketchOffsetDistance: Math.max(0.001, Math.abs(d)) }),

  // Sketch Mirror (D21)
  sketchMirrorAxis: 'vertical',
  setSketchMirrorAxis: (axis) => set({ sketchMirrorAxis: axis }),
  commitSketchMirror: () => {
    const { activeSketch, sketchMirrorAxis } = get();
    if (!activeSketch || activeSketch.entities.length === 0) return;
    const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
    // Centroid as mirror origin
    let cx = 0, cy2 = 0, cz = 0, n = 0;
    for (const e of activeSketch.entities) {
      for (const p of e.points) { cx += p.x; cy2 += p.y; cz += p.z; n++; }
    }
    if (n === 0) return;
    cx /= n; cy2 /= n; cz /= n;
    const mirrorPt = (p: SketchPoint): SketchPoint => {
      const lx = (p.x - cx) * t1.x + (p.y - cy2) * t1.y + (p.z - cz) * t1.z;
      const ly = (p.x - cx) * t2.x + (p.y - cy2) * t2.y + (p.z - cz) * t2.z;
      let mx = lx, my = ly;
      if (sketchMirrorAxis === 'horizontal') my = -ly;       // mirror over t1 axis
      else if (sketchMirrorAxis === 'vertical') mx = -lx;    // mirror over t2 axis
      else { const tmp = lx; mx = ly; my = tmp; }            // diagonal (swap)
      return {
        ...p, id: crypto.randomUUID(),
        x: cx + t1.x * mx + t2.x * my,
        y: cy2 + t1.y * mx + t2.y * my,
        z: cz + t1.z * mx + t2.z * my,
      };
    };
    const mirrored: SketchEntity[] = activeSketch.entities.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      points: e.points.map(mirrorPt),
      startAngle: e.startAngle !== undefined ? -e.endAngle! : undefined,
      endAngle: e.endAngle !== undefined ? -e.startAngle! : undefined,
    }));
    set({
      activeSketch: { ...activeSketch, entities: [...activeSketch.entities, ...mirrored] },
      statusMessage: `Mirror: ${mirrored.length} entities added (${sketchMirrorAxis})`,
    });
  },

  // D50: AutoConstrain — detect and record geometric constraints on the active sketch
  autoConstrainSketch: () => {
    const { activeSketch } = get();
    if (!activeSketch) return;

    const TOL = 0.5;       // mm tolerance for proximity / length equality
    const ANGLE_TOL = 0.01; // radians tolerance for direction comparisons

    const newConstraints: SketchConstraint[] = [];

    const lines = activeSketch.entities.filter(
      (e) => (e.type === 'line' || e.type === 'construction-line' || e.type === 'centerline') && e.points.length >= 2
    );

    // Horizontal / Vertical
    for (const e of lines) {
      const p0 = e.points[0];
      const p1 = e.points[e.points.length - 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dz = p1.z - p0.z;

      if (Math.abs(dy) < TOL && Math.abs(dz) < TOL) {
        const alreadyHas = activeSketch.constraints.some(
          (c) => c.type === 'horizontal' && c.entityIds.includes(e.id)
        );
        if (!alreadyHas) {
          newConstraints.push({ id: crypto.randomUUID(), type: 'horizontal', entityIds: [e.id] });
        }
      }

      if (Math.abs(dx) < TOL && Math.abs(dz) < TOL) {
        const alreadyHas = activeSketch.constraints.some(
          (c) => c.type === 'vertical' && c.entityIds.includes(e.id)
        );
        if (!alreadyHas) {
          newConstraints.push({ id: crypto.randomUUID(), type: 'vertical', entityIds: [e.id] });
        }
      }
    }

    // Coincident: pairs of endpoints within TOL
    const allPoints = activeSketch.entities.flatMap((e) =>
      e.points.map((p, idx) => ({ entityId: e.id, pointIndex: idx, x: p.x, y: p.y, z: p.z }))
    );
    for (let i = 0; i < allPoints.length; i++) {
      for (let j = i + 1; j < allPoints.length; j++) {
        const a = allPoints[i];
        const b = allPoints[j];
        if (a.entityId === b.entityId) continue;
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
        if (dist < TOL) {
          const alreadyHas = activeSketch.constraints.some(
            (c) =>
              c.type === 'coincident' &&
              c.entityIds.includes(a.entityId) &&
              c.entityIds.includes(b.entityId)
          );
          if (!alreadyHas) {
            newConstraints.push({
              id: crypto.randomUUID(),
              type: 'coincident',
              entityIds: [a.entityId, b.entityId],
              pointIndices: [a.pointIndex, b.pointIndex],
            });
          }
        }
      }
    }

    // Parallel: pairs of lines with same direction (within ANGLE_TOL)
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const ea = lines[i], eb = lines[j];
        const a0 = ea.points[0], a1 = ea.points[ea.points.length - 1];
        const b0 = eb.points[0], b1 = eb.points[eb.points.length - 1];
        const da = { x: a1.x - a0.x, y: a1.y - a0.y, z: a1.z - a0.z };
        const db = { x: b1.x - b0.x, y: b1.y - b0.y, z: b1.z - b0.z };
        const lenA = Math.sqrt(da.x ** 2 + da.y ** 2 + da.z ** 2);
        const lenB = Math.sqrt(db.x ** 2 + db.y ** 2 + db.z ** 2);
        if (lenA < 0.001 || lenB < 0.001) continue;
        const dot = Math.abs((da.x * db.x + da.y * db.y + da.z * db.z) / (lenA * lenB));
        if (dot > 1 - ANGLE_TOL) {
          const alreadyHas = activeSketch.constraints.some(
            (c) => c.type === 'parallel' && c.entityIds.includes(ea.id) && c.entityIds.includes(eb.id)
          );
          if (!alreadyHas) {
            newConstraints.push({ id: crypto.randomUUID(), type: 'parallel', entityIds: [ea.id, eb.id] });
          }
        }
      }
    }

    // Equal length: pairs of lines with same length (within TOL)
    const lineLengths = lines.map((e) => {
      const p0 = e.points[0], p1 = e.points[e.points.length - 1];
      return Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2 + (p1.z - p0.z) ** 2);
    });
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        if (Math.abs(lineLengths[i] - lineLengths[j]) < TOL) {
          const alreadyHas = activeSketch.constraints.some(
            (c) => c.type === 'equal' && c.entityIds.includes(lines[i].id) && c.entityIds.includes(lines[j].id)
          );
          if (!alreadyHas) {
            newConstraints.push({ id: crypto.randomUUID(), type: 'equal', entityIds: [lines[i].id, lines[j].id] });
          }
        }
      }
    }

    if (newConstraints.length === 0) {
      get().setStatusMessage('AutoConstrain: no new constraints detected');
      return;
    }

    set((s) => ({
      activeSketch: s.activeSketch
        ? { ...s.activeSketch, constraints: [...s.activeSketch.constraints, ...newConstraints] }
        : null,
    }));
    get().setStatusMessage(`AutoConstrain: applied ${newConstraints.length} constraint${newConstraints.length === 1 ? '' : 's'}`);
  },

  // D27: Solve constraints on the active sketch using Newton-Raphson
  sketchComputeDeferred: false,
  setSketchComputeDeferred: (v) => set({ sketchComputeDeferred: v }),

  solveSketch: () => {
    const { activeSketch } = get();
    if (!activeSketch) return;

    // PLANE-AWARE SOLVE: SketchPoints are stored in WORLD 3D coords. The 2D
    // solver expects plane-local UV coords. Without projecting, an XZ/YZ/custom
    // sketch would feed (x, y=0) — silently mangling geometry on solve.
    // Round trip: project 3D → 2D, solve, unproject 2D → 3D.
    const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
    const origin = activeSketch.planeOrigin;
    const projectedEntities = activeSketch.entities.map((e) => ({
      ...e,
      points: e.points.map((pt) => {
        const dx = pt.x - origin.x, dy = pt.y - origin.y, dz = pt.z - origin.z;
        const u = dx * t1.x + dy * t1.y + dz * t1.z;
        const v = dx * t2.x + dy * t2.y + dz * t2.z;
        return { ...pt, x: u, y: v, z: 0 };
      }),
    }));

    const result = solveConstraints(projectedEntities, activeSketch.constraints ?? []);
    if (!result.solved) {
      set((s) => ({
        activeSketch: s.activeSketch ? { ...s.activeSketch, overConstrained: true } : null,
        statusMessage: `Over-constrained sketch (residual ${result.residual.toFixed(3)}) after ${result.iterations} iterations`,
      }));
      return;
    }

    // Apply solved positions back to entities — UNPROJECT 2D UV → 3D world.
    const updatedEntities = activeSketch.entities.map((e) => {
      const updated = { ...e, points: e.points.map((pt, pi) => {
        const solvedPt = result.updatedPoints.get(`${e.id}-p${pi}`);
        if (!solvedPt) return pt;
        // Unproject (u, v) back to world via origin + u*t1 + v*t2
        return {
          ...pt,
          x: origin.x + solvedPt.x * t1.x + solvedPt.y * t2.x,
          y: origin.y + solvedPt.x * t1.y + solvedPt.y * t2.y,
          z: origin.z + solvedPt.x * t1.z + solvedPt.y * t2.z,
        };
      }) };
      return updated;
    });

    set((s) => ({
      activeSketch: s.activeSketch ? { ...s.activeSketch, entities: updatedEntities, overConstrained: false } : null,
      statusMessage: `Constraints solved (${result.iterations} iteration${result.iterations === 1 ? '' : 's'})`,
    }));
  },

  // D52: Constraint application state
  constraintSelection: [],
  setConstraintSelection: (ids) => set({ constraintSelection: ids }),
  addToConstraintSelection: (id) => set((s) => ({ constraintSelection: [...s.constraintSelection, id] })),
  clearConstraintSelection: () => set({ constraintSelection: [] }),
  // SK-A9: offset constraint distance (user edits in SketchPalette before clicking entities)
  constraintOffsetValue: 10,
  setConstraintOffsetValue: (v) => set({ constraintOffsetValue: Math.max(0.001, v) }),
  // SK-A1: surface constraint pending surface pick
  constraintSurfacePlane: null,
  setConstraintSurfacePlane: (plane) => set({ constraintSurfacePlane: plane }),

  // D52: Add a single constraint to the active sketch
  addSketchConstraint: (constraint) => {
    const { activeSketch } = get();
    if (!activeSketch) return;
    const exists = (activeSketch.constraints ?? []).some(
      c => c.type === constraint.type &&
        c.entityIds.join(',') === constraint.entityIds.join(',')
    );
    if (exists) return;
    get().pushUndo();
    // Write to activeSketch (the sketch being edited), not to the
    // completed sketches array. While editing, the sketch lives in
    // activeSketch, not in sketches[].
    set({
      activeSketch: {
        ...activeSketch,
        constraints: [...(activeSketch.constraints ?? []), constraint],
      },
      statusMessage: `${constraint.type} constraint applied`,
    });
    // CORR-7: skip auto-solve when compute is deferred
    if (!get().sketchComputeDeferred) get().solveSketch();
  },

  // Conic curve rho (D11)
  conicRho: 0.5,
  setConicRho: (r) => set({ conicRho: Math.max(0.01, Math.min(0.99, r)) }),

  // Tangent circles (D40, D41)
  tangentCircleRadius: 5,
  setTangentCircleRadius: (r) => set({ tangentCircleRadius: Math.max(0.01, r) }),

  // Blend curve continuity (D44)
  blendCurveMode: 'g1' as 'g1' | 'g2',
  setBlendCurveMode: (mode) => set({ blendCurveMode: mode }),

  // Sketch chamfer (D47)
  sketchChamferDist1: 2,
  setSketchChamferDist1: (d) => set({ sketchChamferDist1: Math.max(0.01, d) }),
  sketchChamferDist2: 2,
  setSketchChamferDist2: (d) => set({ sketchChamferDist2: Math.max(0.01, d) }),
  sketchChamferAngle: 45,
  setSketchChamferAngle: (a) => set({ sketchChamferAngle: Math.max(1, Math.min(89, a)) }),

  // Show Profile (D55)
  showSketchProfile: false,
  setShowSketchProfile: (show) => set((s) => ({
    showSketchProfile: show,
    activeSketch: s.activeSketch ? { ...s.activeSketch, areProfilesShown: show } : null,
  })),

  // Slice (D54)
  sliceEnabled: false,
  setSliceEnabled: (enabled) => set({ sliceEnabled: enabled }),

  // D58: 3D Sketch mode
  sketch3DMode: false,
  setSketch3DMode: (v) => set({ sketch3DMode: v }),
  toggleSketch3DMode: () => set((s) => ({ sketch3DMode: !s.sketch3DMode })),
  // S7: active draw plane for multi-plane 3D sketch
  sketch3DActivePlane: null,
  setSketch3DActivePlane: (plane) => set({ sketch3DActivePlane: plane }),

  // Section Analysis (D38)
  sectionEnabled: false,
  sectionAxis: 'y',
  sectionOffset: 0,
  sectionFlip: false,
  setSectionEnabled: (enabled) => set({ sectionEnabled: enabled }),
  setSectionAxis: (axis) => set({ sectionAxis: axis }),
  setSectionOffset: (offset) => set({ sectionOffset: offset }),
  setSectionFlip: (flip) => set({ sectionFlip: flip }),

  // D182 – Component color overlay
  showComponentColors: false,
  setShowComponentColors: (v) => set({ showComponentColors: v }),

  // D185 – Canvas reference images
  canvasReferences: [],
  addCanvasReference: (ref) => set((state) => ({ canvasReferences: [...state.canvasReferences, ref] })),
  removeCanvasReference: (id) => set((state) => ({ canvasReferences: state.canvasReferences.filter((r) => r.id !== id) })),

  // Visibility toggles (D56)
  showSketchPoints: true,
  setShowSketchPoints: (v) => set((s) => ({
    showSketchPoints: v,
    activeSketch: s.activeSketch ? { ...s.activeSketch, arePointsShown: v } : null,
  })),
  showSketchDimensions: true,
  setShowSketchDimensions: (v) => set((s) => ({
    showSketchDimensions: v,
    activeSketch: s.activeSketch ? { ...s.activeSketch, areDimensionsShown: v } : null,
  })),
  showSketchConstraints: true,
  setShowSketchConstraints: (v) => set((s) => ({
    showSketchConstraints: v,
    activeSketch: s.activeSketch ? { ...s.activeSketch, areConstraintsShown: v } : null,
  })),
  showProjectedGeometries: true,
  setShowProjectedGeometries: (v) => set({ showProjectedGeometries: v }),
  showConstructionGeometries: true,
  setShowConstructionGeometries: (v) => set({ showConstructionGeometries: v }),

  gridLocked: false,
  setGridLocked: (locked) => set({ gridLocked: locked }),
  incrementalMove: false,
  setIncrementalMove: (enabled) => set({ incrementalMove: enabled }),
  moveIncrement: 1,
  setMoveIncrement: (value) => set({ moveIncrement: value }),
  rotateIncrement: 15,
  setRotateIncrement: (value) => set({ rotateIncrement: value }),

  visualStyle: 'shadedEdges',
  setVisualStyle: (style) => set({ visualStyle: style }),
  showEnvironment: false,
  setShowEnvironment: (show) => set({ showEnvironment: show }),
  showShadows: true,
  setShowShadows: (show) => set({ showShadows: show }),
  showReflections: true,
  setShowReflections: (show) => set({ showReflections: show }),
  showGroundPlane: true,
  setShowGroundPlane: (show) => set({ showGroundPlane: show }),
  groundPlaneOffset: 0,
  setGroundPlaneOffset: (v) => set({ groundPlaneOffset: v }),
  shadowSoftness: 2,
  setShadowSoftness: (v) => set({ shadowSoftness: v }),
  ambientOcclusionEnabled: false,
  setAmbientOcclusionEnabled: (enabled) => set({ ambientOcclusionEnabled: enabled }),
  environmentPreset: 'studio',
  setEnvironmentPreset: (preset) => set({ environmentPreset: preset }),

  // NAV-23: Object Visibility
  entityVisSketchBodies: true,
  entityVisConstruction: true,
  entityVisOrigins: true,
  entityVisJoints: true,
  setEntityVisSketchBodies: (v) => set({ entityVisSketchBodies: v }),
  setEntityVisConstruction: (v) => set({ entityVisConstruction: v }),
  setEntityVisOrigins: (v) => set({ entityVisOrigins: v }),
  setEntityVisJoints: (v) => set({ entityVisJoints: v }),

  cameraProjection: 'perspective',
  setCameraProjection: (p) => set({ cameraProjection: p }),

  cameraTargetQuaternion: null,
  setCameraTargetQuaternion: (q) => set({ cameraTargetQuaternion: q }),
  cameraTargetOrbit: null,
  setCameraTargetOrbit: (v) => set({ cameraTargetOrbit: v }),
  };

  return slice;
}

import * as THREE from 'three';
import { GeometryEngine } from '../../../../../engine/GeometryEngine';
import type { SketchPoint } from '../../../../../types/cad';
import { findBlendEndpoint, sampleCubicBezier } from '../helpers';
import type { SketchCommitHandler } from './types';

export const handleEditingSketchCommit: SketchCommitHandler = (ctx) => {
  const {
    activeTool, activeSketch, sketchPoint, drawingPoints, setDrawingPoints,
    t1, t2, addSketchEntity, replaceSketchEntities, cycleEntityLinetype,
    setStatusMessage, filletRadius, chamferDist1, chamferDist2, chamferAngle,
    blendCurveMode,
  } = ctx;

  switch (activeTool) {
    case 'break': {
      if (!activeSketch) break;
      const clickPt = new THREE.Vector3(sketchPoint.x, sketchPoint.y, sketchPoint.z);
      let bestEnt: typeof activeSketch.entities[0] | null = null;
      let bestT = 0;
      let bestDist = Infinity;

      for (const ent of activeSketch.entities) {
        if (ent.type !== 'line' || ent.points.length < 2) continue;
        const a = new THREE.Vector3(ent.points[0].x, ent.points[0].y, ent.points[0].z);
        const b = new THREE.Vector3(ent.points[1].x, ent.points[1].y, ent.points[1].z);
        const ab = b.clone().sub(a);
        const len2 = ab.lengthSq();
        if (len2 < 1e-8) continue;
        const t = Math.max(0, Math.min(1, clickPt.clone().sub(a).dot(ab) / len2));
        const closest = a.clone().addScaledVector(ab, t);
        const dist = clickPt.distanceTo(closest);
        if (dist < bestDist) {
          bestDist = dist;
          bestEnt = ent;
          bestT = t;
        }
      }

      // Only act if within a reasonable pick distance (~2 world units)
      if (!bestEnt || bestDist > 2 || bestT <= 0.001 || bestT >= 0.999) {
        setStatusMessage('Break: click closer to a line to split it');
        break;
      }

      const a = bestEnt.points[0];
      const b = bestEnt.points[1];
      const midPt: typeof a = {
        id: crypto.randomUUID(),
        x: a.x + (b.x - a.x) * bestT,
        y: a.y + (b.y - a.y) * bestT,
        z: a.z + (b.z - a.z) * bestT,
      };

      const updated = activeSketch.entities.flatMap((e) => {
        if (e.id !== bestEnt!.id) return [e];
        return [
          { ...e, id: crypto.randomUUID(), points: [a, midPt] },
          { ...e, id: crypto.randomUUID(), points: [midPt, b] },
        ];
      });
      replaceSketchEntities(updated);
      setStatusMessage('Break: line split at selected point');
      break;
    }

    // D57: Linetype conversion — click a line to cycle its type
    case 'linetype-convert': {
      if (!activeSketch) break;
      const ltClickPt = new THREE.Vector3(sketchPoint.x, sketchPoint.y, sketchPoint.z);
      // Find closest line-type entity within snap distance
      let ltBest: typeof activeSketch.entities[0] | null = null;
      let ltBestDist = 3;
      for (const e of activeSketch.entities) {
        if (e.type !== 'line' && e.type !== 'construction-line' && e.type !== 'centerline') continue;
        if (e.points.length < 2) continue;
        const a = new THREE.Vector3(e.points[0].x, e.points[0].y, e.points[0].z);
        const b = new THREE.Vector3(e.points[1].x, e.points[1].y, e.points[1].z);
        const ab = b.clone().sub(a);
        const ap = ltClickPt.clone().sub(a);
        const tc = Math.max(0, Math.min(1, ap.dot(ab) / (ab.lengthSq() || 1)));
        const closest = a.clone().lerp(b, tc);
        const d = ltClickPt.distanceTo(closest);
        if (d < ltBestDist) { ltBestDist = d; ltBest = e; }
      }
      if (ltBest) {
        cycleEntityLinetype(ltBest.id);
        const nextMap: Record<string, string> = { 'line': 'construction-line', 'construction-line': 'centerline', 'centerline': 'line' };
        setStatusMessage(`Linetype → ${nextMap[ltBest.type] ?? ltBest.type}`);
      } else {
        setStatusMessage('Linetype Convert: click near a line to change its type');
      }
      break;
    }

    // ── D17 Trim ───────────────────────────────────────────────────────
    // Click on a segment portion: remove it between nearest intersections.
    case 'trim': {
      if (!activeSketch) break;
      const clickPt = new THREE.Vector3(sketchPoint.x, sketchPoint.y, sketchPoint.z);

      // Helper: 2-D line-line intersection parameter along segment a→b
      const lineLineT = (
        ax: number, ay: number, bx: number, by: number,
        cx: number, cy: number, dx: number, dy: number,
      ): { t: number; u: number } | null => {
        const rx = bx - ax, ry = by - ay;
        const sx = dx - cx, sy = dy - cy;
        const cross = rx * sy - ry * sx;
        if (Math.abs(cross) < 1e-10) return null;
        const qx = cx - ax, qy = cy - ay;
        const t = (qx * sy - qy * sx) / cross;
        const u = (qx * ry - qy * rx) / cross;
        return { t, u };
      };

      // Project a 3D point onto a line entity, returning t in [0,1]
      const ptOnLine = (pt: THREE.Vector3, ent: typeof activeSketch.entities[0]): number => {
        if (ent.type !== 'line' || ent.points.length < 2) return -1;
        const a2 = new THREE.Vector3(ent.points[0].x, ent.points[0].y, ent.points[0].z);
        const b2 = new THREE.Vector3(ent.points[1].x, ent.points[1].y, ent.points[1].z);
        const ab2 = b2.clone().sub(a2);
        const len2 = ab2.lengthSq();
        if (len2 < 1e-8) return -1;
        return Math.max(0, Math.min(1, pt.clone().sub(a2).dot(ab2) / len2));
      };

      // Find the line closest to the click
      let bestEnt2: typeof activeSketch.entities[0] | null = null;
      let bestDist2 = Infinity;
      for (const ent of activeSketch.entities) {
        if (ent.type !== 'line' || ent.points.length < 2) continue;
        const a2 = new THREE.Vector3(ent.points[0].x, ent.points[0].y, ent.points[0].z);
        const b2 = new THREE.Vector3(ent.points[1].x, ent.points[1].y, ent.points[1].z);
        const ab2 = b2.clone().sub(a2);
        const len2 = ab2.lengthSq();
        if (len2 < 1e-8) continue;
        const t2 = Math.max(0, Math.min(1, clickPt.clone().sub(a2).dot(ab2) / len2));
        const closest = a2.clone().addScaledVector(ab2, t2);
        const dist = clickPt.distanceTo(closest);
        if (dist < bestDist2) { bestDist2 = dist; bestEnt2 = ent; }
      }

      if (!bestEnt2 || bestDist2 > 2) {
        setStatusMessage('Trim: click closer to a line segment');
        break;
      }

      const trimEnt = bestEnt2;
      // Collect all intersection t-values along trimEnt from every other line
      const intersections: number[] = [0, 1]; // sentinel endpoints
      const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
      const toLocal = (p: typeof activeSketch.entities[0]['points'][0]) => ({
        x: new THREE.Vector3(p.x, p.y, p.z).dot(t1),
        y: new THREE.Vector3(p.x, p.y, p.z).dot(t2),
      });

      const ta0 = toLocal(trimEnt.points[0]);
      const ta1 = toLocal(trimEnt.points[1]);

      for (const other of activeSketch.entities) {
        if (other.id === trimEnt.id || other.type !== 'line' || other.points.length < 2) continue;
        const tb0 = toLocal(other.points[0]);
        const tb1 = toLocal(other.points[1]);
        const res = lineLineT(ta0.x, ta0.y, ta1.x, ta1.y, tb0.x, tb0.y, tb1.x, tb1.y);
        if (res && res.t > 1e-6 && res.t < 1 - 1e-6 && res.u >= 0 && res.u <= 1) {
          intersections.push(res.t);
        }
      }
      intersections.sort((a2, b2) => a2 - b2);

      // Find which interval was clicked
      const clickT = ptOnLine(clickPt, trimEnt);
      let segStart = 0, segEnd = 1;
      for (let k = 0; k < intersections.length - 1; k++) {
        if (clickT >= intersections[k] && clickT <= intersections[k + 1]) {
          segStart = intersections[k];
          segEnd = intersections[k + 1];
          break;
        }
      }

      // Build replacement: keep segments outside the removed interval
      const interpPt = (ent: typeof trimEnt, t3: number): typeof ent.points[0] => ({
        id: crypto.randomUUID(),
        x: ent.points[0].x + (ent.points[1].x - ent.points[0].x) * t3,
        y: ent.points[0].y + (ent.points[1].y - ent.points[0].y) * t3,
        z: ent.points[0].z + (ent.points[1].z - ent.points[0].z) * t3,
      });

      const replacements: typeof activeSketch.entities[0][] = [];
      if (segStart > 1e-6) {
        replacements.push({ ...trimEnt, id: crypto.randomUUID(), points: [trimEnt.points[0], interpPt(trimEnt, segStart)] });
      }
      if (segEnd < 1 - 1e-6) {
        replacements.push({ ...trimEnt, id: crypto.randomUUID(), points: [interpPt(trimEnt, segEnd), trimEnt.points[1]] });
      }

      const updated2 = activeSketch.entities.flatMap((e) =>
        e.id === trimEnt.id ? replacements : [e],
      );
      replaceSketchEntities(updated2);
      setStatusMessage(replacements.length === 0 ? 'Trim: entity removed' : 'Trim: segment trimmed');
      break;
    }

    // ── D18 Extend ─────────────────────────────────────────────────────
    // Click near an endpoint of a line to extend it to the nearest intersection.
    case 'extend': {
      if (!activeSketch) break;
      const clickPt2 = new THREE.Vector3(sketchPoint.x, sketchPoint.y, sketchPoint.z);

      // Find the line whose nearest endpoint is closest to click
      let extEnt: typeof activeSketch.entities[0] | null = null;
      let extEndIdx: 0 | 1 = 0;
      let extBestDist = Infinity;

      for (const ent of activeSketch.entities) {
        if (ent.type !== 'line' || ent.points.length < 2) continue;
        const p0 = new THREE.Vector3(ent.points[0].x, ent.points[0].y, ent.points[0].z);
        const p1 = new THREE.Vector3(ent.points[1].x, ent.points[1].y, ent.points[1].z);
        const d0 = clickPt2.distanceTo(p0);
        const d1 = clickPt2.distanceTo(p1);
        if (d0 < extBestDist) { extBestDist = d0; extEnt = ent; extEndIdx = 0; }
        if (d1 < extBestDist) { extBestDist = d1; extEnt = ent; extEndIdx = 1; }
      }

      if (!extEnt || extBestDist > 4) {
        setStatusMessage('Extend: click near the endpoint of a line you want to extend');
        break;
      }

      const extA = new THREE.Vector3(extEnt.points[0].x, extEnt.points[0].y, extEnt.points[0].z);
      const extB = new THREE.Vector3(extEnt.points[1].x, extEnt.points[1].y, extEnt.points[1].z);
      const extDir = extEndIdx === 1 ? extB.clone().sub(extA).normalize() : extA.clone().sub(extB).normalize();
      const extOrigin = extEndIdx === 1 ? extB : extA;
      // Plane-local axes for intersection test
      const { t1: extT1, t2: extT2 } = GeometryEngine.getSketchAxes(activeSketch);

      const toLocal2 = (p: typeof activeSketch.entities[0]['points'][0]) => ({
        x: new THREE.Vector3(p.x, p.y, p.z).dot(extT1),
        y: new THREE.Vector3(p.x, p.y, p.z).dot(extT2),
      });
      const lineLineT2 = (
        ax2: number, ay2: number, bx2: number, by2: number,
        cx2: number, cy2: number, dx2: number, dy2: number,
      ): { t: number; u: number } | null => {
        const rx2 = bx2 - ax2, ry2 = by2 - ay2;
        const sx2 = dx2 - cx2, sy2 = dy2 - cy2;
        const cross2 = rx2 * sy2 - ry2 * sx2;
        if (Math.abs(cross2) < 1e-10) return null;
        const qx2 = cx2 - ax2, qy2 = cy2 - ay2;
        const t2r = (qx2 * sy2 - qy2 * sx2) / cross2;
        const u2r = (qx2 * ry2 - qy2 * rx2) / cross2;
        return { t: t2r, u: u2r };
      };

      const extOrigLocal = toLocal2(extEnt.points[extEndIdx]);
      const extDirLocal = { x: extDir.dot(extT1), y: extDir.dot(extT2) };
      const extEnd2 = { x: extOrigLocal.x + extDirLocal.x * 1000, y: extOrigLocal.y + extDirLocal.y * 1000 };

      let closestT: number | null = null;
      for (const other of activeSketch.entities) {
        if (other.id === extEnt.id || other.type !== 'line' || other.points.length < 2) continue;
        const ol0 = toLocal2(other.points[0]);
        const ol1 = toLocal2(other.points[1]);
        const res2 = lineLineT2(extOrigLocal.x, extOrigLocal.y, extEnd2.x, extEnd2.y, ol0.x, ol0.y, ol1.x, ol1.y);
        if (res2 && res2.t > 1e-4 && res2.u >= -0.01 && res2.u <= 1.01) {
          if (closestT === null || res2.t < closestT) closestT = res2.t;
        }
      }

      if (closestT === null) {
        setStatusMessage('Extend: no intersection found along that direction');
        break;
      }

      const newEndPt: typeof extEnt.points[0] = {
        id: crypto.randomUUID(),
        x: extOrigin.x + extDir.x * closestT * 1000,
        y: extOrigin.y + extDir.y * closestT * 1000,
        z: extOrigin.z + extDir.z * closestT * 1000,
      };

      const updExt = activeSketch.entities.map((e) => {
        if (e.id !== extEnt!.id) return e;
        const pts = [...e.points];
        pts[extEndIdx] = newEndPt;
        return { ...e, id: crypto.randomUUID(), points: pts };
      });
      replaceSketchEntities(updExt);
      setStatusMessage('Extend: line extended to nearest intersection');
      break;
    }

    // ── D20 / S12 Sketch Offset ────────────────────────────────────────
    // Click 1: pick a line entity (selects the whole connected chain).
    // Click 2: pick the side (offset direction) → offsets entire chain.
    case 'sketch-offset': {
      if (!activeSketch) break;
      const clickPt = new THREE.Vector3(sketchPoint.x, sketchPoint.y, sketchPoint.z);

      // S12: Build adjacency for chain-walking
      const findConnectedChain = (startId: string, entities: typeof activeSketch.entities): typeof activeSketch.entities => {
        const TOL = 0.01;
        const lineEnts = entities.filter((e) => e.type === 'line' && e.points.length >= 2);
        // endpoint-sharing adjacency: for two entities to be adjacent, they share an endpoint
        const sharesEndpoint = (eA: typeof lineEnts[0], eB: typeof lineEnts[0]): boolean => {
          const pts = [
            new THREE.Vector3(eA.points[0].x, eA.points[0].y, eA.points[0].z),
            new THREE.Vector3(eA.points[eA.points.length - 1].x, eA.points[eA.points.length - 1].y, eA.points[eA.points.length - 1].z),
          ];
          const pts2 = [
            new THREE.Vector3(eB.points[0].x, eB.points[0].y, eB.points[0].z),
            new THREE.Vector3(eB.points[eB.points.length - 1].x, eB.points[eB.points.length - 1].y, eB.points[eB.points.length - 1].z),
          ];
          for (const p of pts) for (const q of pts2) if (p.distanceTo(q) < TOL) return true;
          return false;
        };
        const chain: typeof lineEnts = [];
        const visited = new Set<string>();
        const startEnt = lineEnts.find((e) => e.id === startId);
        if (!startEnt) return chain;
        const queue = [startEnt];
        while (queue.length > 0) {
          const cur = queue.shift()!;
          if (visited.has(cur.id)) continue;
          visited.add(cur.id);
          chain.push(cur);
          for (const neighbor of lineEnts) {
            if (!visited.has(neighbor.id) && sharesEndpoint(cur, neighbor)) {
              queue.push(neighbor);
            }
          }
        }
        return chain;
      };

      if (drawingPoints.length === 0) {
        // First click: find the closest line
        let bestEnt3: typeof activeSketch.entities[0] | null = null;
        let bestDist3 = Infinity;
        for (const ent of activeSketch.entities) {
          if (ent.type !== 'line' || ent.points.length < 2) continue;
          const a3 = new THREE.Vector3(ent.points[0].x, ent.points[0].y, ent.points[0].z);
          const b3 = new THREE.Vector3(ent.points[1].x, ent.points[1].y, ent.points[1].z);
          const ab3 = b3.clone().sub(a3);
          const len23 = ab3.lengthSq();
          if (len23 < 1e-8) continue;
          const t3 = Math.max(0, Math.min(1, clickPt.clone().sub(a3).dot(ab3) / len23));
          const dist = clickPt.distanceTo(a3.clone().addScaledVector(ab3, t3));
          if (dist < bestDist3) { bestDist3 = dist; bestEnt3 = ent; }
        }
        if (!bestEnt3 || bestDist3 > 3) {
          setStatusMessage('Offset: click closer to a line to select it');
          break;
        }
        // Store the selected entity id encoded into drawingPoints[0].id
        const chain12 = findConnectedChain(bestEnt3.id, activeSketch.entities);
        setDrawingPoints([{ ...sketchPoint, id: bestEnt3.id }]);
        const chainNote = chain12.length > 1 ? ` (chain: ${chain12.length} segments)` : '';
        setStatusMessage(`Offset: entity selected${chainNote} — click the side to offset towards`);
      } else {
        // Second click: compute offset direction and add offset copies for entire chain
        const selectedId = drawingPoints[0].id;
        const ent = activeSketch.entities.find((e) => e.id === selectedId);
        if (!ent || ent.type !== 'line' || ent.points.length < 2) {
          setDrawingPoints([]); break;
        }
        // Determine offset sign from first entity
        const a4 = new THREE.Vector3(ent.points[0].x, ent.points[0].y, ent.points[0].z);
        const b4 = new THREE.Vector3(ent.points[1].x, ent.points[1].y, ent.points[1].z);
        const ab4 = b4.clone().sub(a4).normalize();
        const planeNorm4 = t1.clone().cross(t2).normalize();
        const perpDir4 = ab4.clone().cross(planeNorm4).normalize();
        const toClick4 = clickPt.clone().sub(a4);
        const signedDist4 = toClick4.dot(perpDir4);
        const d4 = Math.abs(signedDist4);
        const sign4 = signedDist4 > 0 ? 1 : -1;
        if (d4 < 0.001) { setStatusMessage('Offset: click further from the line'); break; }

        // Walk chain and offset every member
        const chain12b = findConnectedChain(selectedId, activeSketch.entities);
        for (const chainEnt of chain12b) {
          if (chainEnt.type !== 'line' || chainEnt.points.length < 2) continue;
          const ca = new THREE.Vector3(chainEnt.points[0].x, chainEnt.points[0].y, chainEnt.points[0].z);
          const cb = new THREE.Vector3(chainEnt.points[chainEnt.points.length - 1].x, chainEnt.points[chainEnt.points.length - 1].y, chainEnt.points[chainEnt.points.length - 1].z);
          const cab = cb.clone().sub(ca).normalize();
          const cperpDir = cab.clone().cross(planeNorm4).normalize();
          addSketchEntity({
            ...chainEnt,
            id: crypto.randomUUID(),
            points: [
              { ...chainEnt.points[0], id: crypto.randomUUID(), x: chainEnt.points[0].x + cperpDir.x * d4 * sign4, y: chainEnt.points[0].y + cperpDir.y * d4 * sign4, z: chainEnt.points[0].z + cperpDir.z * d4 * sign4 },
              { ...chainEnt.points[chainEnt.points.length - 1], id: crypto.randomUUID(), x: chainEnt.points[chainEnt.points.length - 1].x + cperpDir.x * d4 * sign4, y: chainEnt.points[chainEnt.points.length - 1].y + cperpDir.y * d4 * sign4, z: chainEnt.points[chainEnt.points.length - 1].z + cperpDir.z * d4 * sign4 },
            ],
          });
        }
        setDrawingPoints([]);
        const plural = chain12b.length > 1 ? `${chain12b.length} lines` : 'line';
        setStatusMessage(`Offset: ${plural} copied at distance ${d4.toFixed(2)}`);
      }
      break;
    }

    // ── D16 Sketch Fillet ──────────────────────────────────────────────
    // Click the shared corner of two lines; replaces it with a tangent arc.
    // Two clicks needed: click near a vertex where two lines meet.
    case 'sketch-fillet': {
      if (!activeSketch) break;
      const clickPt = new THREE.Vector3(sketchPoint.x, sketchPoint.y, sketchPoint.z);
      const r = filletRadius;

      // Find the closest vertex shared by two line entities
      type LineEnt = typeof activeSketch.entities[0] & { type: 'line' };
      const lineEnts = activeSketch.entities.filter((e): e is LineEnt => e.type === 'line' && e.points.length >= 2);

      // Collect all endpoints across all lines
      interface VertexCandidate {
        pos: THREE.Vector3;
        lineIdx: number;
        ptIdx: 0 | 1; // which endpoint on that line
      }
      const vertices: VertexCandidate[] = [];
      lineEnts.forEach((e, i) => {
        vertices.push({ pos: new THREE.Vector3(e.points[0].x, e.points[0].y, e.points[0].z), lineIdx: i, ptIdx: 0 });
        vertices.push({ pos: new THREE.Vector3(e.points[1].x, e.points[1].y, e.points[1].z), lineIdx: i, ptIdx: 1 });
      });

      // Group vertices that are within snap tolerance of each other
      const SNAP_TOL = 0.5;
      let bestCorner: { pos: THREE.Vector3; lines: { idx: number; ptIdx: 0 | 1 }[] } | null = null;
      let bestCornerDist = Infinity;

      for (let i = 0; i < vertices.length; i++) {
        const coinc: typeof vertices = [vertices[i]];
        for (let j = i + 1; j < vertices.length; j++) {
          if (vertices[j].lineIdx === vertices[i].lineIdx) continue;
          if (vertices[j].pos.distanceTo(vertices[i].pos) < SNAP_TOL) {
            coinc.push(vertices[j]);
          }
        }
        if (coinc.length < 2) continue;
        const dist = clickPt.distanceTo(vertices[i].pos);
        if (dist < bestCornerDist) {
          bestCornerDist = dist;
          bestCorner = {
            pos: vertices[i].pos.clone(),
            lines: coinc.map((c) => ({ idx: c.lineIdx, ptIdx: c.ptIdx })),
          };
        }
      }

      if (!bestCorner || bestCornerDist > 4 || bestCorner.lines.length < 2) {
        setStatusMessage('Fillet: click near a corner where two lines meet');
        break;
      }

      const corner = bestCorner.pos;
      // Use the first two lines at the corner
      const li0 = bestCorner.lines[0];
      const li1 = bestCorner.lines[1];
      const ent0 = lineEnts[li0.idx];
      const ent1 = lineEnts[li1.idx];

      // Direction vectors pointing AWAY from the corner along each line
      const otherPt0 = li0.ptIdx === 0 ? ent0.points[1] : ent0.points[0];
      const otherPt1 = li1.ptIdx === 0 ? ent1.points[1] : ent1.points[0];
      const dir0 = new THREE.Vector3(otherPt0.x - corner.x, otherPt0.y - corner.y, otherPt0.z - corner.z).normalize();
      const dir1 = new THREE.Vector3(otherPt1.x - corner.x, otherPt1.y - corner.y, otherPt1.z - corner.z).normalize();

      // Half-angle bisector: fillet center is at distance r/sin(halfAngle) from corner
      const cosA = dir0.dot(dir1);
      const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      if (sinA < 0.01) { setStatusMessage('Fillet: lines are nearly parallel, cannot fillet'); break; }
      const halfAngle = Math.acos(Math.max(-1, Math.min(1, cosA))) / 2;
      const distToCenter = r / Math.sin(halfAngle);
      const bisector = dir0.clone().add(dir1).normalize();
      const arcCenter = corner.clone().addScaledVector(bisector, distToCenter);

      // Tangent points: where fillet circle meets each line
      const tangent0 = corner.clone().addScaledVector(dir0, r / Math.tan(halfAngle));
      const tangent1 = corner.clone().addScaledVector(dir1, r / Math.tan(halfAngle));

      // Arc angles in the sketch plane
      const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
      const toAngle = (v: THREE.Vector3) => Math.atan2(v.dot(t2), v.dot(t1));
      const arcStart = toAngle(tangent0.clone().sub(arcCenter));
      const arcEnd = toAngle(tangent1.clone().sub(arcCenter));

      // Build replacement entities
      const toSkPt = (v: THREE.Vector3): typeof activeSketch.entities[0]['points'][0] => ({
        id: crypto.randomUUID(), x: v.x, y: v.y, z: v.z,
      });

      const updated3 = activeSketch.entities.flatMap((e) => {
        if (e.id === ent0.id) {
          // Shorten ent0: keep the far end → tangent point
          const farPt = li0.ptIdx === 0 ? e.points[1] : e.points[0];
          const t0Pt = toSkPt(tangent0);
          return [{ ...e, id: crypto.randomUUID(), points: li0.ptIdx === 0 ? [e.points[0], t0Pt] : [t0Pt, farPt] }];
        }
        if (e.id === ent1.id) {
          const farPt2 = li1.ptIdx === 0 ? e.points[1] : e.points[0];
          const t1Pt = toSkPt(tangent1);
          return [{ ...e, id: crypto.randomUUID(), points: li1.ptIdx === 0 ? [e.points[0], t1Pt] : [t1Pt, farPt2] }];
        }
        return [e];
      });

      // Insert fillet arc
      updated3.push({
        id: crypto.randomUUID(),
        type: 'arc',
        points: [toSkPt(arcCenter)],
        radius: r,
        startAngle: arcStart,
        endAngle: arcEnd,
      });
      replaceSketchEntities(updated3);
      setStatusMessage(`Fillet: r=${r.toFixed(2)} applied`);
      break;
    }

    // D47: Sketch Chamfer — equal / two-dist / dist+angle variants
    case 'sketch-chamfer-equal':
    case 'sketch-chamfer-two-dist':
    case 'sketch-chamfer-dist-angle': {
      if (!activeSketch) break;
      const chamferClickPt = new THREE.Vector3(sketchPoint.x, sketchPoint.y, sketchPoint.z);

      // Reuse the same corner-finder as sketch-fillet
      type CLineEnt = typeof activeSketch.entities[0] & { type: 'line' };
      const chamferLines = activeSketch.entities.filter((e): e is CLineEnt => e.type === 'line' && e.points.length >= 2);
      interface CVtx { pos: THREE.Vector3; lineIdx: number; ptIdx: 0 | 1; }
      const chamferVerts: CVtx[] = [];
      chamferLines.forEach((e, i) => {
        chamferVerts.push({ pos: new THREE.Vector3(e.points[0].x, e.points[0].y, e.points[0].z), lineIdx: i, ptIdx: 0 });
        chamferVerts.push({ pos: new THREE.Vector3(e.points[1].x, e.points[1].y, e.points[1].z), lineIdx: i, ptIdx: 1 });
      });

      const CTOL = 0.5;
      let bestChamferCorner: { pos: THREE.Vector3; lines: { idx: number; ptIdx: 0 | 1 }[] } | null = null;
      let bestChamferDist = Infinity;
      for (let i = 0; i < chamferVerts.length; i++) {
        const coinc: CVtx[] = [chamferVerts[i]];
        for (let j = i + 1; j < chamferVerts.length; j++) {
          if (chamferVerts[j].lineIdx === chamferVerts[i].lineIdx) continue;
          if (chamferVerts[j].pos.distanceTo(chamferVerts[i].pos) < CTOL) coinc.push(chamferVerts[j]);
        }
        if (coinc.length < 2) continue;
        const dist = chamferClickPt.distanceTo(chamferVerts[i].pos);
        if (dist < bestChamferDist) {
          bestChamferDist = dist;
          bestChamferCorner = { pos: chamferVerts[i].pos.clone(), lines: coinc.map((c) => ({ idx: c.lineIdx, ptIdx: c.ptIdx })) };
        }
      }

      if (!bestChamferCorner || bestChamferDist > 4 || bestChamferCorner.lines.length < 2) {
        setStatusMessage('Chamfer: click near a corner where two lines meet');
        break;
      }

      const cCorner = bestChamferCorner.pos;
      const cLi0 = bestChamferCorner.lines[0];
      const cLi1 = bestChamferCorner.lines[1];
      const cEnt0 = chamferLines[cLi0.idx];
      const cEnt1 = chamferLines[cLi1.idx];
      const cOther0 = cLi0.ptIdx === 0 ? cEnt0.points[1] : cEnt0.points[0];
      const cOther1 = cLi1.ptIdx === 0 ? cEnt1.points[1] : cEnt1.points[0];
      const cDir0 = new THREE.Vector3(cOther0.x - cCorner.x, cOther0.y - cCorner.y, cOther0.z - cCorner.z).normalize();
      const cDir1 = new THREE.Vector3(cOther1.x - cCorner.x, cOther1.y - cCorner.y, cOther1.z - cCorner.z).normalize();

      // Determine setback distances based on variant
      let sb0 = chamferDist1;
      let sb1 = chamferDist1;
      if (activeTool === 'sketch-chamfer-two-dist') {
        sb0 = chamferDist1;
        sb1 = chamferDist2;
      } else if (activeTool === 'sketch-chamfer-dist-angle') {
        sb0 = chamferDist1;
        sb1 = chamferDist1 * Math.tan((chamferAngle * Math.PI) / 180);
      }

      // Setback points along each line
      const cTangent0 = cCorner.clone().addScaledVector(cDir0, sb0);
      const cTangent1 = cCorner.clone().addScaledVector(cDir1, sb1);

      const toCSkPt = (v: THREE.Vector3): SketchPoint => ({ id: crypto.randomUUID(), x: v.x, y: v.y, z: v.z });

      const chamferUpdated = activeSketch.entities.flatMap((e) => {
        if (e.id === cEnt0.id) {
          const farPt = cLi0.ptIdx === 0 ? e.points[1] : e.points[0];
          const newCornerPt = toCSkPt(cTangent0);
          return [{ ...e, id: crypto.randomUUID(), points: cLi0.ptIdx === 0 ? [e.points[0], newCornerPt] : [newCornerPt, farPt] }];
        }
        if (e.id === cEnt1.id) {
          const farPt2 = cLi1.ptIdx === 0 ? e.points[1] : e.points[0];
          const newCornerPt2 = toCSkPt(cTangent1);
          return [{ ...e, id: crypto.randomUUID(), points: cLi1.ptIdx === 0 ? [e.points[0], newCornerPt2] : [newCornerPt2, farPt2] }];
        }
        return [e];
      });

      // Insert chamfer line between the two setback points
      chamferUpdated.push({
        id: crypto.randomUUID(),
        type: 'line',
        points: [toCSkPt(cTangent0), toCSkPt(cTangent1)],
      });
      replaceSketchEntities(chamferUpdated);
      setStatusMessage(`Chamfer: ${sb0.toFixed(2)} × ${sb1.toFixed(2)} applied`);
      break;
    }

    // ------------------------------------------------------------------
    // D44: Blend Curve (G1 cubic Bezier / G2 quintic Bezier)
    // ------------------------------------------------------------------
    case 'blend-curve': {
      const clickedWorld = new THREE.Vector3(sketchPoint.x, sketchPoint.y, sketchPoint.z);
      const hit = findBlendEndpoint(clickedWorld, activeSketch);
      if (!hit) {
        setStatusMessage('Blend Curve: click near an endpoint of a sketch entity');
        break;
      }

      if (drawingPoints.length === 0) {
        // First click — store P0 and encode tangentA as a second "point" offset
        // We encode: drawingPoints[0] = P0, drawingPoints[1] = P0 + tangentA * 0.001
        const tangentPt: SketchPoint = {
          id: crypto.randomUUID(),
          x: hit.endpoint.x + hit.tangent.x * 0.001,
          y: hit.endpoint.y + hit.tangent.y * 0.001,
          z: hit.endpoint.z + hit.tangent.z * 0.001,
        };
        const endPt: SketchPoint = {
          id: crypto.randomUUID(),
          x: hit.endpoint.x,
          y: hit.endpoint.y,
          z: hit.endpoint.z,
        };
        setDrawingPoints([endPt, tangentPt]);
        setStatusMessage(`Blend Curve: first endpoint set (${blendCurveMode.toUpperCase()}) — click second endpoint`);
      } else if (drawingPoints.length >= 2) {
        // Second click — compute and emit the Bezier blend
        const p0 = new THREE.Vector3(drawingPoints[0].x, drawingPoints[0].y, drawingPoints[0].z);
        const tanRef = new THREE.Vector3(drawingPoints[1].x, drawingPoints[1].y, drawingPoints[1].z);
        const tangentA = tanRef.clone().sub(p0).normalize();
        const p3 = hit.endpoint;
        const tangentB = hit.tangent;

        const samples = sampleCubicBezier(p0, tangentA, p3, tangentB, 32);
        const samplePts: SketchPoint[] = samples.map((v) => ({
          id: crypto.randomUUID(),
          x: v.x,
          y: v.y,
          z: v.z,
        }));

        addSketchEntity({
          id: crypto.randomUUID(),
          type: 'spline',
          points: samplePts,
          closed: false,
        });
        setDrawingPoints([]);
        setStatusMessage(`Blend Curve (${blendCurveMode.toUpperCase()}) added`);
      }
      break;
    }

    // S4: Isoparametric Curve — single-click places a full-span construction line
    // at the clicked U (horizontal) or V (vertical) parameter along the sketch plane.
    // NOTE: Shift-key direction is handled in SketchInteraction.tsx before this is called;
    // this case provides a fallback that always uses 'u'.
    case 'isoparametric': {
      const dir: 'u' | 'v' = 'u';

      // The click world point is sketchPoint; decompose onto t1/t2 to get the iso value.
      // The sketch origin is approximated as the world origin projected onto the plane —
      // we measure the dot product along the chosen axis.
      const clickWorld = new THREE.Vector3(sketchPoint.x, sketchPoint.y, sketchPoint.z);
      const isoValue = dir === 'u' ? clickWorld.dot(t1) : clickWorld.dot(t2);

      // Build two spanning endpoint world positions ±500 along the other axis.
      const SPAN = 500;
      const along = dir === 'u' ? t2 : t1;    // axis we sweep along
      const fixed  = dir === 'u' ? t1 : t2;   // axis we hold constant

      // Base point: on the fixed axis at isoValue, at zero along 'along'
      const base = fixed.clone().multiplyScalar(isoValue);
      const p1World = base.clone().addScaledVector(along, -SPAN);
      const p2World = base.clone().addScaledVector(along,  SPAN);

      const startPt: SketchPoint = { id: crypto.randomUUID(), x: p1World.x, y: p1World.y, z: p1World.z };
      const endPt: SketchPoint   = { id: crypto.randomUUID(), x: p2World.x, y: p2World.y, z: p2World.z };

      addSketchEntity({
        id: crypto.randomUUID(),
        type: 'isoparametric',
        points: [startPt, endPt],
        isConstruction: true,
        isoParamDir: dir,
        isoParamValue: isoValue,
      });
      setDrawingPoints([]);
      setStatusMessage(`Iso Curve (${dir.toUpperCase()}) placed at ${isoValue.toFixed(2)} — click again for another`);
      break;
    }
    default:
      return false;
  }

  return true;
};

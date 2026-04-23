import { useEffect, useRef, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCADStore } from '../../../store/cadStore';
import { useThemeStore } from '../../../store/themeStore';
import { GeometryEngine } from '../../../engine/GeometryEngine';
import type { SketchPoint } from '../../../types/cad';
import { commitSketchTool } from './sketchInteraction/commitTool';
import { renderSketchPreview } from './sketchInteraction/previewTool';
import { loadDefaultFont, fontPathToSegments } from '../../../utils/sketchTextUtil';
import { useSketchProjectionTools } from './sketchInteraction/hooks/useSketchProjectionTools';
import { useSketchDimensionTool } from './sketchInteraction/hooks/useSketchDimensionTool';
import { useSketchConstraintTool } from './sketchInteraction/hooks/useSketchConstraintTool';
import { SketchInteractionHud } from './sketchInteraction/SketchInteractionHud';

export default function SketchInteraction() {
  const { camera, gl, raycaster, scene } = useThree();
  const activeTool = useCADStore((s) => s.activeTool);
  const activeSketch = useCADStore((s) => s.activeSketch);
  const addSketchEntity = useCADStore((s) => s.addSketchEntity);
  const replaceSketchEntities = useCADStore((s) => s.replaceSketchEntities);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);
  const snapEnabled = useCADStore((s) => s.snapEnabled);
  const sketchSnapEnabled = useCADStore((s) => s.sketchSnapEnabled);
  // NAV-24: per-type object snap settings
  const objectSnapEnabled = useCADStore((s) => s.objectSnapEnabled);
  const snapToEndpoint = useCADStore((s) => s.snapToEndpoint);
  const snapToMidpoint = useCADStore((s) => s.snapToMidpoint);
  const snapToCenter = useCADStore((s) => s.snapToCenter);
  const snapToIntersection = useCADStore((s) => s.snapToIntersection);
  const snapToPerpendicular = useCADStore((s) => s.snapToPerpendicular);
  const snapToTangent = useCADStore((s) => s.snapToTangent);
  const gridSize = useCADStore((s) => s.gridSize);
  const units = useCADStore((s) => s.units);
  const polygonSides = useCADStore((s) => s.sketchPolygonSides);
  const filletRadius = useCADStore((s) => s.sketchFilletRadius);
  const chamferDist1 = useCADStore((s) => s.sketchChamferDist1);
  const chamferDist2 = useCADStore((s) => s.sketchChamferDist2);
  const chamferAngle = useCADStore((s) => s.sketchChamferAngle);
  const tangentCircleRadius = useCADStore((s) => s.tangentCircleRadius);
  const cycleEntityLinetype = useCADStore((s) => s.cycleEntityLinetype);
  const conicRho = useCADStore((s) => s.conicRho);
  const blendCurveMode = useCADStore((s) => s.blendCurveMode);
  const themeColors = useThemeStore((s) => s.colors);
  // D12: Sketch Text
  const sketchTextContent = useCADStore((s) => s.sketchTextContent);
  const sketchTextHeight  = useCADStore((s) => s.sketchTextHeight);
  // SK-A6: formatting flags
  const sketchTextBold    = useCADStore((s) => s.sketchTextBold);
  const sketchTextItalic  = useCADStore((s) => s.sketchTextItalic);
  const commitSketchTextEntities = useCADStore((s) => s.commitSketchTextEntities);
  // D45: Project / Include live-link toggle
  const projectLiveLink = useCADStore((s) => s.projectLiveLink);
  // D46: Project to Surface
  const cancelSketchProjectSurfaceTool = useCADStore((s) => s.cancelSketchProjectSurfaceTool);
  // D28: Dimension tool
  const activeDimensionType = useCADStore((s) => s.activeDimensionType);
  const dimensionOffset = useCADStore((s) => s.dimensionOffset);
  const dimensionDrivenMode = useCADStore((s) => s.dimensionDrivenMode);
  const dimensionOrientation = useCADStore((s) => s.dimensionOrientation);
  const dimensionToleranceMode = useCADStore((s) => s.dimensionToleranceMode);
  const dimensionToleranceUpper = useCADStore((s) => s.dimensionToleranceUpper);
  const dimensionToleranceLower = useCADStore((s) => s.dimensionToleranceLower);
  const addPendingDimensionEntity = useCADStore((s) => s.addPendingDimensionEntity);
  const addSketchDimension = useCADStore((s) => s.addSketchDimension);
  const cancelDimensionTool = useCADStore((s) => s.cancelDimensionTool);
  // D52: Constraint tool state
  const addToConstraintSelection = useCADStore((s) => s.addToConstraintSelection);
  const clearConstraintSelection = useCADStore((s) => s.clearConstraintSelection);
  const addSketchConstraint = useCADStore((s) => s.addSketchConstraint);
  const setActiveTool = useCADStore((s) => s.setActiveTool);
  // S7: 3D sketch multi-plane
  const sketch3DMode = useCADStore((s) => s.sketch3DMode);
  const sketch3DActivePlane = useCADStore((s) => s.sketch3DActivePlane);
  const setSketch3DActivePlane = useCADStore((s) => s.setSketch3DActivePlane);

  const [drawingPoints, setDrawingPoints] = useState<SketchPoint[]>([]);
  const [mousePos, setMousePos] = useState<THREE.Vector3 | null>(null);
  // Refs mirror the same state so the master-effect's DOM handlers can read
  // the latest value WITHOUT having `drawingPoints` / `mousePos` in the
  // effect's dep list. Previously they were deps → every setMousePos call
  // (i.e. every pointermove) tore down and re-attached all 6 DOM listeners,
  // silently dropping pointer events that arrived mid-teardown.
  // Refs are synced in a useEffect (not during render) so React's
  // react-hooks/refs rule stays happy.
  const drawingPointsRef = useRef<SketchPoint[]>(drawingPoints);
  const mousePosRef = useRef<THREE.Vector3 | null>(mousePos);
  useEffect(() => { drawingPointsRef.current = drawingPoints; }, [drawingPoints]);
  useEffect(() => { mousePosRef.current = mousePos; }, [mousePos]);
  // D65: snap indicator target
  const [snapTarget, setSnapTarget] = useState<{ worldPos: THREE.Vector3; type: 'endpoint' | 'midpoint' | 'center' | 'intersection' | 'perpendicular' | 'tangent' } | null>(null);
  const previewRef = useRef<THREE.Group>(null);
  // Stable preview materials — created once, never recreated per frame
  const previewMaterial = useRef(new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 2 }));
  const constructionPreviewMaterial = useRef(new THREE.LineDashedMaterial({
    color: 0xff8800, linewidth: 1, dashSize: 0.3, gapSize: 0.18,
  }));
  const centerlinePreviewMaterial = useRef(new THREE.LineDashedMaterial({
    color: 0x00aa55, linewidth: 1, dashSize: 0.7, gapSize: 0.2,
  }));

  // Scratch Vector3 for useFrame — avoids per-frame allocation
  const startVRef = useRef(new THREE.Vector3());

  // D42: click-drag tangent arc detection for line tool
  const isDraggingArcRef = useRef(false);
  const dragScreenStartRef = useRef<{ x: number; y: number } | null>(null);
  // Set to true on pointerup after a drag; consumed by the next click event.
  const dragJustFinishedRef = useRef(false);

  // S9: 'A' key inline arc toggle during line tool
  const lineArcModeRef = useRef(false);

  // S10: 'X' key construction-mode toggle
  const drawingConstructionRef = useRef(false);
  // S10: construction-mode preview material (cyan dashed)
  const constructionModePreviewMaterial = useRef(new THREE.LineDashedMaterial({
    color: 0x00ccff, linewidth: 1, dashSize: 0.4, gapSize: 0.2,
  }));

  // S7: plane-pick pending — set true when Tab is pressed to redirect draw plane
  const planePickPendingRef = useRef(false);

  // Dispose the shared preview materials when SketchInteraction unmounts
  useEffect(() => {
    const mat = previewMaterial.current;
    const constMat = constructionPreviewMaterial.current;
    const cenMat = centerlinePreviewMaterial.current;
    const constrModeMat = constructionModePreviewMaterial.current;
    return () => {
      mat.dispose();
      constMat.dispose();
      cenMat.dispose();
      constrModeMat.dispose();
    };
  }, []);

  // Clear in-progress drawing when the user switches tools
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawingPoints([]);
    setMousePos(null);
    setSnapTarget(null);
    // S9/S10: reset inline-arc and construction-mode toggles on tool change
    lineArcModeRef.current = false;
    drawingConstructionRef.current = false;
  }, [activeTool]);

  const getSketchPlane = useCallback((): THREE.Plane => {
    if (!activeSketch) return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // S7: when a 3D active draw plane override is set, use it
    if (sketch3DActivePlane) {
      const n = new THREE.Vector3(...sketch3DActivePlane.normal).normalize();
      const o = new THREE.Vector3(...sketch3DActivePlane.origin);
      return new THREE.Plane(n, -n.dot(o));
    }

    // Normals must match getPlaneNormal() in cadStore and the visual plane selector:
    //   XY = horizontal ground   → Y-normal  (0, 1, 0)
    //   XZ = vertical front wall → Z-normal  (0, 0, 1)
    //   YZ = vertical side wall  → X-normal  (1, 0, 0)
    //   custom = face plane → use stored planeNormal & planeOrigin
    switch (activeSketch.plane) {
      case 'XY': return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      case 'XZ': return new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      case 'YZ': return new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
      case 'custom': {
        const n = activeSketch.planeNormal.clone().normalize();
        return new THREE.Plane(n, -n.dot(activeSketch.planeOrigin));
      }
      default:   return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    }
  }, [activeSketch, sketch3DActivePlane]);

  const snapToGrid = useCallback((point: THREE.Vector3): THREE.Vector3 => {
    // D207: sketchSnapEnabled controls snap-to-grid; snapEnabled is global geometry snap
    if (!snapEnabled && !sketchSnapEnabled) return point;
    const snap = gridSize / 10;
    return new THREE.Vector3(
      Math.round(point.x / snap) * snap,
      Math.round(point.y / snap) * snap,
      Math.round(point.z / snap) * snap
    );
  }, [snapEnabled, sketchSnapEnabled, gridSize]);

  // D65 / S8 / NAV-24: find nearest snap candidate within snap radius.
  // Supports endpoint, midpoint, center, intersection (existing) +
  // perpendicular and tangent (NAV-24).
  const SNAP_RADIUS = 4;
  const findSnapCandidate = useCallback((worldPt: THREE.Vector3, drawStart?: THREE.Vector3 | null) => {
    if (!activeSketch || !snapEnabled) return null;
    // NAV-24: master object-snap gate
    if (!objectSnapEnabled) return null;
    let bestDist = SNAP_RADIUS;
    let best: { worldPos: THREE.Vector3; type: 'endpoint' | 'midpoint' | 'center' | 'intersection' | 'perpendicular' | 'tangent' } | null = null;

    // Collect line-like entities for intersection / perpendicular testing
    const lineEntities = activeSketch.entities.filter(
      (e) =>
        (e.type === 'line' || e.type === 'construction-line' || e.type === 'centerline') &&
        e.points.length >= 2,
    );

    for (const e of activeSketch.entities) {
      if ((e.type === 'line' || e.type === 'construction-line' || e.type === 'centerline') && e.points.length >= 2) {
        // Endpoint snap
        if (snapToEndpoint) {
          for (const idx of [0, e.points.length - 1]) {
            const p = e.points[idx];
            const wp = new THREE.Vector3(p.x, p.y, p.z);
            const d = worldPt.distanceTo(wp);
            if (d < bestDist) { bestDist = d; best = { worldPos: wp, type: 'endpoint' }; }
          }
        }
        // Midpoint snap
        if (snapToMidpoint) {
          const p0 = e.points[0], p1 = e.points[e.points.length - 1];
          const mid = new THREE.Vector3((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
          const dm = worldPt.distanceTo(mid);
          if (dm < bestDist) { bestDist = dm; best = { worldPos: mid, type: 'midpoint' }; }
        }
        // Perpendicular snap: foot of perpendicular from worldPt to segment
        if (snapToPerpendicular) {
          const P0 = new THREE.Vector3(e.points[0].x, e.points[0].y, e.points[0].z);
          const P1 = new THREE.Vector3(e.points[e.points.length - 1].x, e.points[e.points.length - 1].y, e.points[e.points.length - 1].z);
          const seg = P1.clone().sub(P0);
          const segLen2 = seg.lengthSq();
          if (segLen2 > 1e-10) {
            const t = worldPt.clone().sub(P0).dot(seg) / segLen2;
            if (t >= 0 && t <= 1) {
              const foot = P0.clone().addScaledVector(seg, t);
              const df = worldPt.distanceTo(foot);
              if (df < bestDist) { bestDist = df; best = { worldPos: foot, type: 'perpendicular' }; }
            }
          }
        }
      } else if ((e.type === 'circle' || e.type === 'arc') && e.points.length >= 1) {
        // Center snap
        if (snapToCenter) {
          const center = new THREE.Vector3(e.points[0].x, e.points[0].y, e.points[0].z);
          const d = worldPt.distanceTo(center);
          if (d < bestDist) { bestDist = d; best = { worldPos: center, type: 'center' }; }
        }
        // Tangent snap: when drawing a line (drawStart set), find tangent point on circle
        // where the line from drawStart to that point is tangent to the circle.
        // PLANE-AWARE: must use sketch t1/t2 axes, not world x/y, so this works on
        // XZ / YZ / arbitrary construction-plane sketches — not just XY.
        if (snapToTangent && drawStart && e.points.length >= 2 && activeSketch) {
          const center = new THREE.Vector3(e.points[0].x, e.points[0].y, e.points[0].z);
          const radiusPt = new THREE.Vector3(e.points[1].x, e.points[1].y, e.points[1].z);
          const r = center.distanceTo(radiusPt);
          if (r > 1e-6) {
            const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
            const dVec = center.clone().sub(drawStart);
            const dist = dVec.length();
            if (dist > r) {
              // Project dVec onto sketch UV to compute the base angle in sketch-plane space
              const du = dVec.dot(t1);
              const dv = dVec.dot(t2);
              const alpha = Math.asin(r / dist);
              const baseAngle = Math.atan2(dv, du);
              for (const sign of [-1, 1]) {
                const angle = baseAngle + sign * (Math.PI / 2 - alpha);
                // Build tangent point in world space via t1*cos + t2*sin
                const tp = center.clone()
                  .addScaledVector(t1, Math.cos(angle) * r)
                  .addScaledVector(t2, Math.sin(angle) * r);
                const dt = worldPt.distanceTo(tp);
                if (dt < bestDist) { bestDist = dt; best = { worldPos: tp, type: 'tangent' }; }
              }
            }
          }
        }
      }
    }

    // S8 / NAV-24: brute-force line-line intersection snap
    if (snapToIntersection) {
      for (let i = 0; i < lineEntities.length; i++) {
        const a = lineEntities[i];
        const A0 = new THREE.Vector3(a.points[0].x, a.points[0].y, a.points[0].z);
        const Ad = new THREE.Vector3(
          a.points[a.points.length - 1].x - a.points[0].x,
          a.points[a.points.length - 1].y - a.points[0].y,
          a.points[a.points.length - 1].z - a.points[0].z,
        );
        const aLen = Ad.length();
        if (aLen < 1e-6) continue;
        Ad.divideScalar(aLen);

        for (let j = i + 1; j < lineEntities.length; j++) {
          const b = lineEntities[j];
          const B0 = new THREE.Vector3(b.points[0].x, b.points[0].y, b.points[0].z);
          const Bd = new THREE.Vector3(
            b.points[b.points.length - 1].x - b.points[0].x,
            b.points[b.points.length - 1].y - b.points[0].y,
            b.points[b.points.length - 1].z - b.points[0].z,
          );
          const bLen = Bd.length();
          if (bLen < 1e-6) continue;
          Bd.divideScalar(bLen);

          const w0 = new THREE.Vector3().subVectors(A0, B0);
          const a11 = Ad.dot(Ad);
          const a12 = -Ad.dot(Bd);
          const a22 = Bd.dot(Bd);
          const b1 = -Ad.dot(w0);
          const b2 = Bd.dot(w0);
          const det = a11 * a22 - a12 * a12;
          if (Math.abs(det) < 1e-8) continue;
          const t = (a22 * b1 - a12 * b2) / det;
          const s = (a11 * b2 - a12 * b1) / det;
          if (t < -0.1 * aLen || t > 1.1 * aLen) continue;
          if (s < -0.1 * bLen || s > 1.1 * bLen) continue;

          const P1 = A0.clone().add(Ad.clone().multiplyScalar(t));
          const P2 = B0.clone().add(Bd.clone().multiplyScalar(s));
          if (P1.distanceTo(P2) > 0.5) continue;

          const mid = P1.clone().add(P2).multiplyScalar(0.5);
          const d = worldPt.distanceTo(mid);
          if (d < bestDist) { bestDist = d; best = { worldPos: mid, type: 'intersection' }; }
        }
      }
    }

    return best;
  }, [activeSketch, snapEnabled, objectSnapEnabled, snapToEndpoint, snapToMidpoint, snapToCenter, snapToIntersection, snapToPerpendicular, snapToTangent]);

  const getWorldPoint = useCallback((event: MouseEvent): THREE.Vector3 | null => {
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const plane = getSketchPlane();
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, intersection);

    if (hit) return snapToGrid(intersection);
    return null;
  }, [camera, gl, raycaster, getSketchPlane, snapToGrid]);

  useSketchProjectionTools({
    activeTool,
    activeSketch,
    camera,
    gl,
    raycaster,
    scene,
    addSketchEntity,
    setStatusMessage,
    projectLiveLink,
    cancelSketchProjectSurfaceTool,
  });

  useSketchDimensionTool({
    activeTool,
    activeSketch,
    activeDimensionType,
    dimensionOffset,
    dimensionDrivenMode,
    dimensionOrientation,
    dimensionToleranceMode,
    dimensionToleranceUpper,
    dimensionToleranceLower,
    addPendingDimensionEntity,
    addSketchDimension,
    cancelDimensionTool,
    getWorldPoint,
    setStatusMessage,
    gl,
  });

  useSketchConstraintTool({
    activeTool,
    activeSketch,
    addToConstraintSelection,
    clearConstraintSelection,
    addSketchConstraint,
    setActiveTool,
    getWorldPoint,
    setStatusMessage,
    gl,
  });

  useEffect(() => {
    if (!activeSketch || activeTool === 'select') return;

    // Plane-aware tangent axes — works for named planes AND custom face planes
    const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);

    // Project a 3-D point difference onto the plane's 2-D local axes
    const projectToPlane = (pt: SketchPoint, origin: SketchPoint) => {
      const d = new THREE.Vector3(pt.x - origin.x, pt.y - origin.y, pt.z - origin.z);
      return { u: d.dot(t1), v: d.dot(t2) };
    };

    const handleMouseMove = (event: MouseEvent) => {
      // Read the latest state via refs so this handler doesn't need to live in
      // the master effect's dep list — see drawingPointsRef/mousePosRef note
      // at the top of the component for why.
      const drawingPoints = drawingPointsRef.current;
      const mousePos = mousePosRef.current;
      void mousePos; // consulted below by the shared helpers via closure
      const point = getWorldPoint(event);
      if (point) {
        // D65 / NAV-24: entity snap — pass drawStart for tangent computation
        const drawStart = drawingPoints.length > 0
          ? new THREE.Vector3(drawingPoints[0].x, drawingPoints[0].y, drawingPoints[0].z)
          : null;
        const snapCandidate = findSnapCandidate(point, drawStart);
        if (snapCandidate) {
          setMousePos(snapCandidate.worldPos.clone());
          setSnapTarget(snapCandidate);
        } else {
          setMousePos(point);
          setSnapTarget(null);
        }
        if (drawingPoints.length > 0) {
          const start = drawingPoints[0];
          if (activeTool === 'circle' || activeTool === 'polygon' || activeTool === 'polygon-inscribed') {
            const radius = point.distanceTo(new THREE.Vector3(start.x, start.y, start.z));
            setStatusMessage(`Radius: ${radius.toFixed(2)} — click to place`);
          } else if (activeTool === 'arc') {
            if (drawingPoints.length === 1) {
              const r = point.distanceTo(new THREE.Vector3(start.x, start.y, start.z));
              setStatusMessage(`Arc radius: ${r.toFixed(2)} — click to set start angle`);
            } else {
              setStatusMessage('Click to set end angle');
            }
          } else if (activeTool === 'circle-2point') {
            const radius = point.distanceTo(new THREE.Vector3(start.x, start.y, start.z)) / 2;
            setStatusMessage(`Diameter: ${(radius*2).toFixed(2)}, r=${radius.toFixed(2)}`);
          } else if (activeTool === 'circle-3point') {
            if (drawingPoints.length === 1) setStatusMessage('Click second point on circle');
            else setStatusMessage('Click third point to complete circle');
          } else if (activeTool === 'arc-3point') {
            if (drawingPoints.length === 1) setStatusMessage('Click a point on the arc');
            else setStatusMessage('Click end point to complete arc');
          } else if (activeTool === 'rectangle-center') {
            const sketchPt: SketchPoint = { id: '', x: point.x, y: point.y, z: point.z };
            const { u: du, v: dv } = projectToPlane(sketchPt, start);
            setStatusMessage(`Width: ${(Math.abs(du)*2).toFixed(2)}, Height: ${(Math.abs(dv)*2).toFixed(2)}`);
          } else if (activeTool === 'polygon-edge') {
            setStatusMessage(`Edge length: ${point.distanceTo(new THREE.Vector3(start.x, start.y, start.z)).toFixed(2)}`);
          } else if (activeTool === 'polygon-circumscribed') {
            const apothem = point.distanceTo(new THREE.Vector3(start.x, start.y, start.z));
            setStatusMessage(`Apothem: ${apothem.toFixed(2)} — click to place`);
          } else {
            const dx = point.x - start.x;
            const dy = point.y - start.y;
            const dz = point.z - start.z;
            setStatusMessage(`Δ: ${dx.toFixed(2)}, ${dy.toFixed(2)}, ${dz.toFixed(2)}`);
          }
        } else {
          setStatusMessage(`Click to start ${activeTool.replace(/-/g, ' ')} — ${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}`);
        }
      }
    };

    const handleClick = (event: MouseEvent) => {
      // Snapshot latest state via refs (see note at top of component).
      const drawingPoints = drawingPointsRef.current;
      const mousePos = mousePosRef.current;
      void mousePos;
      if (event.button !== 0) return;
      // Suppress the click that follows a drag-arc completion
      if (dragJustFinishedRef.current) { dragJustFinishedRef.current = false; return; }

      // S7: plane-pick mode — intercept click to redirect the active draw plane
      if (planePickPendingRef.current && sketch3DMode) {
        const rect = gl.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(mouse, camera);
        const pickable: THREE.Mesh[] = [];
        scene.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.isMesh && obj.userData?.pickable) pickable.push(m);
        });
        const hits = raycaster.intersectObjects(pickable, false);
        if (hits.length > 0 && hits[0].faceIndex !== undefined && hits[0].face) {
          const hit = hits[0];
          // Compute face normal in world space
          const normalLocal = hit.face!.normal.clone();
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
          const worldNormal = normalLocal.applyMatrix3(normalMatrix).normalize();
          // Use the hit point as origin on that plane
          const worldOrigin = hit.point.clone();
          setSketch3DActivePlane({
            normal: [worldNormal.x, worldNormal.y, worldNormal.z],
            origin: [worldOrigin.x, worldOrigin.y, worldOrigin.z],
          });
          planePickPendingRef.current = false;
          setStatusMessage(`Draw plane switched to face — Tab to change again`);
        } else {
          setStatusMessage('No face hit — click a solid face to switch plane');
        }
        return;
      }

      const point = getWorldPoint(event);
      if (!point) return;

      const sketchPoint: SketchPoint = {
        id: crypto.randomUUID(),
        x: point.x,
        y: point.y,
        z: point.z,
      };

      // D12: Sketch Text — resolve font async, then push entities
      if (activeTool === 'sketch-text') {
        const anchorPt = point;
        const textStr    = sketchTextContent;
        const textH      = sketchTextHeight;
        const textFormat = { bold: sketchTextBold, italic: sketchTextItalic };
        setStatusMessage('Placing text…');
        loadDefaultFont().then((font) => {
          const segs2d = fontPathToSegments(font, textStr, 0, 0, textH, 8, textFormat);
          // Transform 2D font segments to 3D world space using sketch axes
          const seg3d = segs2d.map((s) => {
            const p1 = anchorPt.clone()
              .addScaledVector(t1, s.x1)
              .addScaledVector(t2, s.y1);
            const p2 = anchorPt.clone()
              .addScaledVector(t1, s.x2)
              .addScaledVector(t2, s.y2);
            return { x1: p1.x, y1: p1.y, z1: p1.z, x2: p2.x, y2: p2.y, z2: p2.z };
          });
          commitSketchTextEntities(seg3d);
        }).catch(() => {
          setStatusMessage('Sketch Text: font failed to load — check /fonts/Roboto-Regular.ttf');
        });
        return;
      }

      // S9: inline arc toggle — when lineArcMode is active and line tool has a chain start,
      // add a tangent arc from the last point to the new point instead of a straight line.
      const isLineToolActive = activeTool === 'line' || activeTool === 'construction-line' || activeTool === 'centerline';
      if (isLineToolActive && lineArcModeRef.current && drawingPoints.length >= 1) {
        const startPt = drawingPoints[0];
        const endPtWorld = point;
        // Compute tangent direction from last entity or fallback to chord direction
        const sk9 = useCADStore.getState().activeSketch;
        const lastEnt9 = sk9?.entities[sk9.entities.length - 1];
        let tangentDir9: THREE.Vector3;
        if (lastEnt9 && (lastEnt9.type === 'line' || lastEnt9.type === 'construction-line' || lastEnt9.type === 'centerline') && lastEnt9.points.length >= 2) {
          const a9 = lastEnt9.points[0];
          const b9 = lastEnt9.points[lastEnt9.points.length - 1];
          tangentDir9 = new THREE.Vector3(b9.x - a9.x, b9.y - a9.y, b9.z - a9.z).normalize();
        } else if (lastEnt9 && lastEnt9.type === 'arc') {
          const c9 = lastEnt9.points[0];
          const r9 = lastEnt9.radius || 1;
          const ea9 = lastEnt9.endAngle ?? Math.PI;
          const radial9 = new THREE.Vector3(
            t1.x * Math.cos(ea9) + t2.x * Math.sin(ea9),
            t1.y * Math.cos(ea9) + t2.y * Math.sin(ea9),
            t1.z * Math.cos(ea9) + t2.z * Math.sin(ea9),
          );
          const endPtArc9 = { x: c9.x + radial9.x * r9, y: c9.y + radial9.y * r9, z: c9.z + radial9.z * r9 };
          const distToEnd9 = new THREE.Vector3(endPtArc9.x - startPt.x, endPtArc9.y - startPt.y, endPtArc9.z - startPt.z).length();
          if (distToEnd9 < 1) {
            const planeNorm9 = t1.clone().cross(t2).normalize();
            tangentDir9 = radial9.clone().cross(planeNorm9).normalize();
          } else {
            tangentDir9 = endPtWorld.clone().sub(new THREE.Vector3(startPt.x, startPt.y, startPt.z)).normalize();
          }
        } else {
          tangentDir9 = endPtWorld.clone().sub(new THREE.Vector3(startPt.x, startPt.y, startPt.z)).normalize();
        }
        const planeNormal9 = t1.clone().cross(t2).normalize();
        const normalInPlane9 = tangentDir9.clone().cross(planeNormal9).normalize();
        const chord9 = new THREE.Vector3(endPtWorld.x - startPt.x, endPtWorld.y - startPt.y, endPtWorld.z - startPt.z);
        const chordLenSq9 = chord9.lengthSq();
        const projOnNormal9 = chord9.dot(normalInPlane9);
        if (Math.abs(projOnNormal9) < 1e-5 || chordLenSq9 < 0.001) {
          setStatusMessage('Tangent arc too short — click further away');
        } else {
          const d9 = chordLenSq9 / (2 * projOnNormal9);
          const cx9 = startPt.x + normalInPlane9.x * d9;
          const cy9 = startPt.y + normalInPlane9.y * d9;
          const cz9 = startPt.z + normalInPlane9.z * d9;
          const arcRadius9 = Math.abs(d9);
          const toStart9 = new THREE.Vector3(startPt.x - cx9, startPt.y - cy9, startPt.z - cz9);
          const toEnd9 = new THREE.Vector3(endPtWorld.x - cx9, endPtWorld.y - cy9, endPtWorld.z - cz9);
          const startAngle9 = Math.atan2(toStart9.dot(t2), toStart9.dot(t1));
          const endAngle9 = Math.atan2(toEnd9.dot(t2), toEnd9.dot(t1));
          const arcCenter9: SketchPoint = { id: crypto.randomUUID(), x: cx9, y: cy9, z: cz9 };
          const arcEnd9: SketchPoint = { id: crypto.randomUUID(), x: endPtWorld.x, y: endPtWorld.y, z: endPtWorld.z };
          addSketchEntity({
            id: crypto.randomUUID(),
            type: 'arc',
            points: [arcCenter9],
            radius: arcRadius9,
            startAngle: startAngle9,
            endAngle: endAngle9,
            isConstruction: drawingConstructionRef.current || undefined,
          });
          setDrawingPoints([arcEnd9]);
          const arcSuffix = ' [ARC]';
          const constrSuffix = drawingConstructionRef.current ? ' [CONSTRUCTION]' : '';
          setStatusMessage(`Tangent arc added (r=${arcRadius9.toFixed(2)})${arcSuffix}${constrSuffix} — click next point`);
        }
        return;
      }

      // S4: Isoparametric Curve — handled here to access the MouseEvent shiftKey.
      if (activeTool === 'isoparametric') {
        const dir: 'u' | 'v' = event.shiftKey ? 'v' : 'u';
        const clickWorld = point;
        const isoValue = dir === 'u' ? clickWorld.dot(t1) : clickWorld.dot(t2);
        const SPAN = 500;
        const along = dir === 'u' ? t2 : t1;
        const fixed  = dir === 'u' ? t1 : t2;
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
        setStatusMessage(`Iso Curve (${dir.toUpperCase()}) placed at ${isoValue.toFixed(2)} — click again for another, Shift+click for V direction`);
        return;
      }

      // S10: construction-mode toggle — wrap addSketchEntity to inject isConstruction flag
      const addSketchEntityWrapped: typeof addSketchEntity = drawingConstructionRef.current
        ? (entity) => addSketchEntity({ ...entity, isConstruction: true })
        : addSketchEntity;

      commitSketchTool({
        activeTool,
        activeSketch,
        sketchPoint,
        drawingPoints,
        setDrawingPoints,
        t1,
        t2,
        projectToPlane,
        addSketchEntity: addSketchEntityWrapped,
        replaceSketchEntities,
        cycleEntityLinetype,
        setStatusMessage,
        polygonSides,
        filletRadius,
        chamferDist1,
        chamferDist2,
        chamferAngle,
        tangentCircleRadius,
        conicRho,
        blendCurveMode,
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Snapshot latest state via refs (see note at top of component).
      const drawingPoints = drawingPointsRef.current;
      void drawingPoints;
      if (event.key === 'Escape') {
        // S7: if in plane-pick mode, cancel it first
        if (planePickPendingRef.current) {
          planePickPendingRef.current = false;
          setStatusMessage('Plane pick cancelled');
          return;
        }
        setDrawingPoints([]);
        setStatusMessage('Drawing cancelled');
        return;
      }
      // S7: Tab key — enter plane-pick mode (3D sketch only)
      if (event.key === 'Tab' && sketch3DMode) {
        event.preventDefault();
        planePickPendingRef.current = !planePickPendingRef.current;
        if (planePickPendingRef.current) {
          setStatusMessage('Click a face or construction plane to switch draw plane [Tab to cancel]');
        } else {
          setStatusMessage('Plane pick cancelled');
        }
        return;
      }
      // S9: 'A' key — toggle inline arc mode during line tool
      if ((event.key === 'a' || event.key === 'A') && (activeTool === 'line' || activeTool === 'construction-line' || activeTool === 'centerline')) {
        lineArcModeRef.current = !lineArcModeRef.current;
        const base = `Click to place — ${drawingPoints.length === 0 ? 'start point' : 'next point'}`;
        const arcSuffix = lineArcModeRef.current ? ' [ARC]' : '';
        const constrSuffix = drawingConstructionRef.current ? ' [CONSTRUCTION]' : '';
        setStatusMessage(base + arcSuffix + constrSuffix);
        return;
      }
      // S10: 'X' key — toggle construction mode for any sketch drawing tool
      if (event.key === 'x' || event.key === 'X') {
        drawingConstructionRef.current = !drawingConstructionRef.current;
        const arcSuffix = lineArcModeRef.current ? ' [ARC]' : '';
        const constrSuffix = drawingConstructionRef.current ? ' [CONSTRUCTION]' : '';
        setStatusMessage(`${activeTool.replace(/-/g, ' ')}${arcSuffix}${constrSuffix}`);
        return;
      }
    };

    // Right-click stops the current drawing operation at the last placed point;
    // for spline/spline-control tools it commits the curve if ≥2 points are placed.
    const handleContextMenu = (event: MouseEvent) => {
      // Snapshot latest state via refs (see note at top of component).
      const drawingPoints = drawingPointsRef.current;
      if (activeTool === 'spline' && drawingPoints.length >= 2) {
        event.preventDefault();
        event.stopPropagation();
        const curve = new THREE.CatmullRomCurve3(
          drawingPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
        );
        const sampledPts = curve.getPoints(Math.max(50, drawingPoints.length * 8));
        const splinePts: typeof drawingPoints = sampledPts.map((p) => ({
          id: crypto.randomUUID(), x: p.x, y: p.y, z: p.z,
        }));
        addSketchEntity({ id: crypto.randomUUID(), type: 'spline', points: splinePts });
        setDrawingPoints([]);
        setStatusMessage(`Spline added (${drawingPoints.length} fit points)`);
        return;
      }
      if (activeTool === 'spline-control' && drawingPoints.length >= 2) {
        event.preventDefault();
        event.stopPropagation();
        // B-spline-like curve: CatmullRom with tension=0 approximates uniform B-spline
        const curve = new THREE.CatmullRomCurve3(
          drawingPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
          false,
          'catmullrom',
          0,
        );
        const sampledPts = curve.getPoints(Math.max(50, drawingPoints.length * 16));
        const splinePts: typeof drawingPoints = sampledPts.map((p) => ({
          id: crypto.randomUUID(), x: p.x, y: p.y, z: p.z,
        }));
        addSketchEntity({ id: crypto.randomUUID(), type: 'spline', points: splinePts });
        setDrawingPoints([]);
        setStatusMessage(`Control Point Spline added (${drawingPoints.length} control points)`);
        return;
      }
      if (drawingPoints.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        setDrawingPoints([]);
        setStatusMessage('');
      }
    };

    // D42: line-tool click-drag → tangent arc
    const DRAG_THRESHOLD_PX = 8;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      isDraggingArcRef.current = false;
      dragJustFinishedRef.current = false;
      dragScreenStartRef.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerMove = (event: PointerEvent) => {
      // Snapshot latest state via refs (see note at top of component).
      const drawingPoints = drawingPointsRef.current;
      if (event.buttons !== 1) return; // only while left button held
      const start = dragScreenStartRef.current;
      if (!start) return;
      const isLineMode = activeTool === 'line' || activeTool === 'construction-line' || activeTool === 'centerline';
      if (!isLineMode) return;
      if (drawingPoints.length === 0) return; // need a chain anchor
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (!isDraggingArcRef.current && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
        isDraggingArcRef.current = true;
        setStatusMessage('Drag: tangent arc — release to place');
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      // Snapshot latest state via refs (see note at top of component).
      const drawingPoints = drawingPointsRef.current;
      const mousePos = mousePosRef.current;
      if (event.button !== 0) return;
      if (!isDraggingArcRef.current) return;
      isDraggingArcRef.current = false;
      dragJustFinishedRef.current = true;
      dragScreenStartRef.current = null;

      if (drawingPoints.length === 0 || !mousePos) return;
      const isLineMode = activeTool === 'line' || activeTool === 'construction-line' || activeTool === 'centerline';
      if (!isLineMode || !activeSketch) return;

      // Get tangent direction from the last committed entity or the drawingPoints direction
      const sk = useCADStore.getState().activeSketch;
      const { t1: _t1, t2: _t2 } = GeometryEngine.getSketchAxes(activeSketch);
      const lastEntity = sk?.entities[sk.entities.length - 1];
      const chainPt = drawingPoints[0];
      let tangentDir: THREE.Vector3;

      if (lastEntity && (lastEntity.type === 'line' || lastEntity.type === 'construction-line' || lastEntity.type === 'centerline')) {
        const a = lastEntity.points[0];
        const b = lastEntity.points[lastEntity.points.length - 1];
        tangentDir = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
      } else if (lastEntity && lastEntity.type === 'arc') {
        const c = lastEntity.points[0];
        const r = lastEntity.radius || 1;
        const ea = lastEntity.endAngle ?? Math.PI;
        const radial = new THREE.Vector3(
          _t1.x * Math.cos(ea) + _t2.x * Math.sin(ea),
          _t1.y * Math.cos(ea) + _t2.y * Math.sin(ea),
          _t1.z * Math.cos(ea) + _t2.z * Math.sin(ea),
        );
        const endPtArc = { x: c.x + radial.x * r, y: c.y + radial.y * r, z: c.z + radial.z * r };
        const distToEnd = new THREE.Vector3(endPtArc.x - chainPt.x, endPtArc.y - chainPt.y, endPtArc.z - chainPt.z).length();
        if (distToEnd < 1) {
          const planeNorm = _t1.clone().cross(_t2).normalize();
          tangentDir = radial.clone().cross(planeNorm).normalize();
        } else {
          tangentDir = mousePos.clone().sub(new THREE.Vector3(chainPt.x, chainPt.y, chainPt.z)).normalize();
        }
      } else {
        tangentDir = mousePos.clone().sub(new THREE.Vector3(chainPt.x, chainPt.y, chainPt.z)).normalize();
      }

      const startPt = chainPt;
      const endPtWorld = mousePos;
      const planeNormal2 = _t1.clone().cross(_t2).normalize();
      const normalInPlane = tangentDir.clone().cross(planeNormal2).normalize();
      const chord = new THREE.Vector3(endPtWorld.x - startPt.x, endPtWorld.y - startPt.y, endPtWorld.z - startPt.z);
      const chordLenSq = chord.lengthSq();
      const projOnNormal = chord.dot(normalInPlane);
      if (Math.abs(projOnNormal) < 1e-5 || chordLenSq < 0.001) {
        setStatusMessage('Tangent arc too short — skipped');
        return;
      }
      const d = chordLenSq / (2 * projOnNormal);
      const cx = startPt.x + normalInPlane.x * d;
      const cy = startPt.y + normalInPlane.y * d;
      const cz = startPt.z + normalInPlane.z * d;
      const arcRadius = Math.abs(d);
      const toStart = new THREE.Vector3(startPt.x - cx, startPt.y - cy, startPt.z - cz);
      const toEnd = new THREE.Vector3(endPtWorld.x - cx, endPtWorld.y - cy, endPtWorld.z - cz);
      const startAngle = Math.atan2(toStart.dot(_t2), toStart.dot(_t1));
      const endAngle = Math.atan2(toEnd.dot(_t2), toEnd.dot(_t1));
      const arcCenter: SketchPoint = { id: crypto.randomUUID(), x: cx, y: cy, z: cz };
      const arcEnd: SketchPoint = { id: crypto.randomUUID(), x: endPtWorld.x, y: endPtWorld.y, z: endPtWorld.z };
      addSketchEntity({
        id: crypto.randomUUID(),
        type: 'arc',
        points: [arcCenter],
        radius: arcRadius,
        startAngle,
        endAngle,
      });
      setDrawingPoints([arcEnd]);
      setStatusMessage(`Tangent arc added (r=${arcRadius.toFixed(2)}) — click to continue line`);
    };

    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
    // NOTE: `drawingPoints` and `mousePos` are intentionally NOT in this dep
    // list even though they're closed over. Handlers read them via the refs
    // (`drawingPointsRef` / `mousePosRef`) declared at the top of the
    // component, which are kept in sync every render. Including them in deps
    // would re-attach all 6 DOM listeners on every single pointermove
    // (setMousePos fires constantly) — the original pre-fix behaviour that
    // burned CPU and silently dropped events arriving mid-teardown.
  }, [activeSketch, activeTool, getWorldPoint, findSnapCandidate, addSketchEntity, replaceSketchEntities, cycleEntityLinetype, setStatusMessage, polygonSides, filletRadius, chamferDist1, chamferDist2, chamferAngle, tangentCircleRadius, conicRho, blendCurveMode, camera, gl, raycaster, sketch3DMode, setSketch3DActivePlane, scene]);

  // Preview of current drawing operation
  useFrame(({ invalidate }) => {
    if (!previewRef.current) return;
    invalidate(); // keep sketch preview updating in frameloop="demand" mode
    // S10: when construction-mode toggle is active, use cyan dashed material for preview
    const activeLine = drawingConstructionRef.current
      ? constructionModePreviewMaterial.current
      : previewMaterial.current;
    renderSketchPreview({
      previewGroup: previewRef.current,
      drawingPoints,
      mousePos,
      activeSketch,
      activeTool,
      isDraggingArc: isDraggingArcRef.current,
      startV: startVRef.current,
      lineMat: activeLine,
      constructionMat: constructionPreviewMaterial.current,
      centerlineMat: centerlinePreviewMaterial.current,
      conicRho,
      blendCurveMode,
    });
  });

  // Cursor crosshair at mouse position
  if (!mousePos || !activeSketch) return null;

  return (
    <group ref={previewRef}>
      <SketchInteractionHud
        mousePos={mousePos}
        activeSketch={activeSketch}
        activeTool={activeTool}
        drawingPoints={drawingPoints}
        units={units}
        themeColors={themeColors}
        snapTarget={snapTarget}
      />
    </group>
  );
}

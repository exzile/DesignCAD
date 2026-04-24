import { useCallback, useEffect, useMemo } from 'react';
import { Line, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSlicerStore } from '../../../../store/slicerStore';
import type { SliceResult, SliceLayer } from '../../../../types/slicer';
import { buildMoveTimeline, type MoveTimeline } from './previewTimeline';
import { AxisIndicators, BuildPlateGrid, BuildVolumeWireframe, PlateObjectMesh } from './scenePrimitives';

const MOVE_TYPE_COLORS: Record<string, THREE.Color> = {
  'wall-outer': new THREE.Color('#aa1111'),
  'wall-inner': new THREE.Color('#33dd55'),
  infill:       new THREE.Color('#cc5500'),
  'top-bottom': new THREE.Color('#1144bb'),
  support:      new THREE.Color('#ff44ff'),
  skirt:        new THREE.Color('#aaaaaa'),
  brim:         new THREE.Color('#aaaaaa'),
  raft:         new THREE.Color('#888888'),
  bridge:       new THREE.Color('#ff4444'),
  ironing:      new THREE.Color('#88ff88'),
  travel:       new THREE.Color('#666666'),
};
const FALLBACK_COLOR = new THREE.Color('#ffffff');

// Shared unit extrusion-bead geometries. The shaft cylinder is rotated so its
// axis lies along +X, matching the per-instance scale convention
// (X=length, Y=width, Z=layerHeight). Endpoint sphere caps sit at each
// segment's from/to to give a rounded pill appearance from top-down instead
// of the flat-ended rectangle that plain boxes produced. 12 radial segments
// on the shaft and 12×8 on the sphere give a smooth curve without exploding
// tri count for dense slices.
const UNIT_SHAFT_GEO = (() => {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1, true);
  g.rotateZ(Math.PI / 2);
  return g;
})();
const UNIT_CAP_GEO = new THREE.SphereGeometry(0.5, 12, 8);

// Reusable scratch objects to avoid per-frame allocations inside useMemo.
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _pos3 = new THREE.Vector3();
const _scl3 = new THREE.Vector3();

// Visual exaggeration factor for line width. 1.0 = physical width; raising this
// makes walls overlap and blend together, obscuring individual line segments.
const PREVIEW_LINE_SCALE = 1.0;
const PREVIEW_JOIN_EPSILON = 1e-4;

// Each extrusion move is rendered as a physical box (lineWidth × layerHeight ×
// segmentLength), matching Cura's geometry-shader technique. Adjacent layers
// share the same Z range so they appear visually connected from the side.
function LayerLines({
  layer,
  layerHeight,
  isCurrentLayer,
  currentLayerMoveCount,
  showTravel,
  colorMode,
  hiddenTypes,
}: {
  layer: SliceLayer;
  layerHeight: number;
  isCurrentLayer: boolean;
  currentLayerMoveCount: number | undefined;
  showTravel: boolean;
  colorMode: 'type' | 'speed' | 'flow';
  hiddenTypes: ReadonlySet<string>;
}) {
  const { meshes, travelGeo } = useMemo(() => {
    const moves = (isCurrentLayer && currentLayerMoveCount !== undefined)
      ? layer.moves.slice(0, currentLayerMoveCount)
      : layer.moves;

    type Bucket = {
      // Shaft instance data
      mids: number[]; dirs: number[]; lens: number[]; lws: number[]; heights: number[]; cols: number[];
      // Cap instance data (one sphere per endpoint)
      capPos: number[]; capLws: number[]; capHeights: number[]; capCols: number[];
    };
    const byType = new Map<string, Bucket>();
    const travPos: number[] = [];

    const samePoint = (
      a: { x: number; y: number },
      b: { x: number; y: number },
    ): boolean => Math.abs(a.x - b.x) <= PREVIEW_JOIN_EPSILON && Math.abs(a.y - b.y) <= PREVIEW_JOIN_EPSILON;

    for (let moveIndex = 0; moveIndex < moves.length; moveIndex++) {
      const move = moves[moveIndex];
      if (move.type === 'travel') {
        if (showTravel) {
          travPos.push(move.from.x, move.from.y, layer.z, move.to.x, move.to.y, layer.z);
        }
        continue;
      }
      if (hiddenTypes.has(move.type)) continue;

      const dx = move.to.x - move.from.x;
      const dy = move.to.y - move.from.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;

      const dirX = dx / len;
      const dirY = dy / len;

      if (!byType.has(move.type)) byType.set(move.type, { mids: [], dirs: [], lens: [], lws: [], heights: [], cols: [], capPos: [], capLws: [], capHeights: [], capCols: [] });
      const b = byType.get(move.type)!;
      const lw = (move.lineWidth ?? 0.4) * PREVIEW_LINE_SCALE;
      // Bead Z-extent = full layer height so each bead fills its slice and
      // reads as a round elliptical tube instead of a flat ribbon. Anchor the
      // bottom at the previous layer's top (layer.z - layerHeight) so stacked
      // layers touch without overlap.
      const beadHeight = Math.max(0.02, layerHeight);
      const beadZ = layer.z - beadHeight / 2;

      b.mids.push((move.from.x + move.to.x) / 2, (move.from.y + move.to.y) / 2, beadZ);
      b.dirs.push(dirX, dirY);
      b.lens.push(len);
      b.lws.push(lw);
      b.heights.push(beadHeight);

      let col: THREE.Color;
      if (colorMode === 'type') {
        col = MOVE_TYPE_COLORS[move.type] ?? FALLBACK_COLOR;
      } else if (colorMode === 'speed') {
        col = new THREE.Color().setHSL(Math.max(0, (240 - move.speed * 2) / 360), 0.8, 0.55);
      } else {
        col = new THREE.Color().setHSL(Math.max(0, (120 - move.extrusion * 100) / 360), 0.8, 0.55);
      }
      b.cols.push(col.r, col.g, col.b);

      // Caps only at endpoints shared with an adjacent same-type segment.
      // Dangling ends (e.g. infill scan-line terminations) get no cap — a
      // sphere there would protrude W/2 past the endpoint into neighbouring
      // walls, which reads as top-bottom fill overlapping wall-inner beads
      // even though the g-code itself stays inside the wall contour.
      const prev = moveIndex > 0 ? moves[moveIndex - 1] : null;
      const next = moveIndex + 1 < moves.length ? moves[moveIndex + 1] : null;
      const fromShared = prev !== null
        && prev.type === move.type
        && prev.extrusion > 0
        && samePoint(prev.to, move.from);
      const toShared = next !== null
        && next.type === move.type
        && next.extrusion > 0
        && samePoint(move.to, next.from);
      if (fromShared) {
        b.capPos.push(move.from.x, move.from.y, beadZ);
        b.capLws.push(lw);
        b.capHeights.push(beadHeight);
        b.capCols.push(col.r, col.g, col.b);
      }
      if (toShared) {
        b.capPos.push(move.to.x, move.to.y, beadZ);
        b.capLws.push(lw);
        b.capHeights.push(beadHeight);
        b.capCols.push(col.r, col.g, col.b);
      }
    }

    const meshList: Array<{ mesh: THREE.InstancedMesh; type: string; kind: 'shaft' | 'cap' }> = [];
    const col3 = new THREE.Color();
    for (const [type, b] of byType) {
      const shaftCount = b.lens.length;
      if (shaftCount === 0) continue;

      // Lambert gives each bead visible top/side shading under the scene's
      // directional + ambient lights — critical for distinguishing stacked
      // walls on sloped surfaces that would otherwise blend into a solid mass.
      const shaftMat = new THREE.MeshLambertMaterial();
      const shaftMesh = new THREE.InstancedMesh(UNIT_SHAFT_GEO, shaftMat, shaftCount);
      for (let i = 0; i < shaftCount; i++) {
        const angle = Math.atan2(b.dirs[i * 2 + 1], b.dirs[i * 2]);
        _quat.setFromAxisAngle(_zAxis, angle);
        _pos3.set(b.mids[i * 3], b.mids[i * 3 + 1], b.mids[i * 3 + 2]);
        _scl3.set(b.lens[i], b.lws[i], b.heights[i]);
        _mat4.compose(_pos3, _quat, _scl3);
        shaftMesh.setMatrixAt(i, _mat4);
        col3.setRGB(b.cols[i * 3], b.cols[i * 3 + 1], b.cols[i * 3 + 2]);
        shaftMesh.setColorAt(i, col3);
      }
      shaftMesh.instanceMatrix.needsUpdate = true;
      if (shaftMesh.instanceColor) shaftMesh.instanceColor.needsUpdate = true;
      shaftMesh.frustumCulled = false;
      meshList.push({ mesh: shaftMesh, type, kind: 'shaft' });

      // Cap instances at every segment endpoint. Identity rotation, scaled so
      // the cap matches the shaft's cross-section but does NOT protrude past
      // the shaft's length end. At a polygon vertex the cap sphere sits at
      // the shared endpoint; a full W-diameter cap would stick W/2 outward
      // from the vertex in every horizontal direction, which on a wall-inner
      // ring next to the wall-outer was reading as green bleeding over red.
      // Using 0.95 * W keeps caps just shy of the shaft's cross-section so
      // they still smooth the tiny gap at convex turns without bulging past
      // the bead's expected footprint.
      const capCount = b.capLws.length;
      if (capCount > 0) {
        const capMat = new THREE.MeshLambertMaterial();
        const capMesh = new THREE.InstancedMesh(UNIT_CAP_GEO, capMat, capCount);
        _quat.identity();
        for (let i = 0; i < capCount; i++) {
          _pos3.set(b.capPos[i * 3], b.capPos[i * 3 + 1], b.capPos[i * 3 + 2]);
          const capSize = b.capLws[i] * 0.95;
          _scl3.set(capSize, capSize, b.capHeights[i]);
          _mat4.compose(_pos3, _quat, _scl3);
          capMesh.setMatrixAt(i, _mat4);
          col3.setRGB(b.capCols[i * 3], b.capCols[i * 3 + 1], b.capCols[i * 3 + 2]);
          capMesh.setColorAt(i, col3);
        }
        capMesh.instanceMatrix.needsUpdate = true;
        if (capMesh.instanceColor) capMesh.instanceColor.needsUpdate = true;
        capMesh.frustumCulled = false;
        meshList.push({ mesh: capMesh, type, kind: 'cap' });
      }
    }

    const tg = travPos.length > 0 ? new THREE.BufferGeometry() : null;
    if (tg) tg.setAttribute('position', new THREE.Float32BufferAttribute(travPos, 3));

    return { meshes: meshList, travelGeo: tg };
  }, [layer, layerHeight, isCurrentLayer, currentLayerMoveCount, showTravel, colorMode, hiddenTypes]);

  useEffect(() => () => {
    for (const { mesh } of meshes) {
      // Don't dispose mesh.geometry — it's UNIT_SHAFT_GEO or UNIT_CAP_GEO,
      // both module-level singletons shared across every LayerLines instance.
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    }
    travelGeo?.dispose();
  }, [meshes, travelGeo]);

  return (
    <>
      {meshes.map(({ mesh, type, kind }) => (
        <primitive key={`${layer.layerIndex}-${type}-${kind}`} object={mesh} />
      ))}
      {travelGeo && (
        <lineSegments key={`${layer.layerIndex}-travel`} geometry={travelGeo}>
          <lineBasicMaterial color="#333355" transparent opacity={0.4} />
        </lineSegments>
      )}
    </>
  );
}

function InlineGCodePreview({
  sliceResult,
  startLayer,
  currentLayer,
  currentLayerMoveCount,
  showTravel,
  colorMode,
  hiddenTypes,
}: {
  sliceResult: SliceResult;
  startLayer: number;
  currentLayer: number;
  currentLayerMoveCount?: number;
  showTravel: boolean;
  colorMode: 'type' | 'speed' | 'flow';
  hiddenTypes: ReadonlySet<string>;
}) {
  const layers = useMemo(
    () => sliceResult.layers.filter((l) => l.layerIndex >= startLayer && l.layerIndex <= currentLayer),
    [sliceResult, startLayer, currentLayer],
  );

  return (
    <group>
      {layers.map((layer) => {
        const prevZ = layer.layerIndex > 0
          ? (sliceResult.layers[layer.layerIndex - 1]?.z ?? 0)
          : 0;
        const layerH = Math.max(0.05, layer.z - prevZ);
        return (
          <LayerLines
            key={layer.layerIndex}
            layer={layer}
            layerHeight={layerH}
            isCurrentLayer={layer.layerIndex === currentLayer}
            currentLayerMoveCount={currentLayerMoveCount}
            showTravel={showTravel}
            colorMode={colorMode}
            hiddenTypes={hiddenTypes}
          />
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Nozzle Simulation
// ---------------------------------------------------------------------------

function NozzleSimulator({
  timeline,
  simTime,
  playing,
  speed,
  onAdvance,
}: {
  timeline: MoveTimeline;
  simTime: number;
  playing: boolean;
  speed: number;
  onAdvance: (deltaSeconds: number) => void;
}) {
  const { invalidate } = useThree();

  // Playback loop — delegates clamping/pausing to the store setter.
  useFrame((_, delta) => {
    if (!playing) return;
    onAdvance(delta * speed);
    invalidate();
  });

  // Find the current move using binary search over cumulative times.
  const pos = useMemo(() => {
    if (timeline.moves.length === 0) return new THREE.Vector3();
    const cum = timeline.cumulative;
    const clampedT = Math.max(0, Math.min(simTime, timeline.total));
    // Binary search for the first cumulative >= clampedT.
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < clampedT) lo = mid + 1;
      else hi = mid;
    }
    const { move, z } = timeline.moves[lo];
    const prevCum = lo > 0 ? cum[lo - 1] : 0;
    const moveDur = Math.max(1e-6, cum[lo] - prevCum);
    const alpha = Math.max(0, Math.min(1, (clampedT - prevCum) / moveDur));
    const x = move.from.x + (move.to.x - move.from.x) * alpha;
    const y = move.from.y + (move.to.y - move.from.y) * alpha;
    return new THREE.Vector3(x, y, z + 0.2);
  }, [timeline, simTime]);

  return (
    <group>
      {/* Nozzle marker */}
      <mesh position={pos}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshStandardMaterial
          color="#ffcc00"
          emissive="#ff8800"
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Guide line to bed */}
      <Line
        points={[[pos.x, pos.y, 0], [pos.x, pos.y, pos.z]]}
        color="#ffcc00"
        lineWidth={0.5}
        transparent
        opacity={0.35}
      />
    </group>
  );
}

export function SlicerWorkspaceScene() {
  const { invalidate } = useThree();

  const printerProfile = useSlicerStore((s) => s.getActivePrinterProfile());
  const materialProfile = useSlicerStore((s) => s.getActiveMaterialProfile());
  const printProfile = useSlicerStore((s) => s.getActivePrintProfile());
  const plateObjects = useSlicerStore((s) => s.plateObjects);
  const selectedId = useSlicerStore((s) => s.selectedPlateObjectId);
  const selectPlateObject = useSlicerStore((s) => s.selectPlateObject);
  const updatePlateObject = useSlicerStore((s) => s.updatePlateObject);
  const transformMode = useSlicerStore((s) => s.transformMode);
  const previewMode = useSlicerStore((s) => s.previewMode);
  const sliceResult = useSlicerStore((s) => s.sliceResult);
  const previewLayer = useSlicerStore((s) => s.previewLayer);
  const previewLayerStart = useSlicerStore((s) => s.previewLayerStart);
  const previewShowTravel = useSlicerStore((s) => s.previewShowTravel);
  const previewColorMode = useSlicerStore((s) => s.previewColorMode);
  const previewHiddenTypesArr = useSlicerStore((s) => s.previewHiddenTypes);
  const previewHiddenTypesKey = useMemo(
    () => previewHiddenTypesArr.join('|'),
    [previewHiddenTypesArr],
  );
  const hiddenTypes = useMemo(() => new Set(previewHiddenTypesArr), [previewHiddenTypesKey]);
  const previewSimEnabled = useSlicerStore((s) => s.previewSimEnabled);
  const previewSimPlaying = useSlicerStore((s) => s.previewSimPlaying);
  const previewSimSpeed = useSlicerStore((s) => s.previewSimSpeed);
  const previewSimTime = useSlicerStore((s) => s.previewSimTime);
  const advancePreviewSimTime = useSlicerStore((s) => s.advancePreviewSimTime);
  const printabilityReport = useSlicerStore((s) => s.printabilityReport);
  const printabilityHighlight = useSlicerStore((s) => s.printabilityHighlight);

  const highlightByObject = useMemo(() => {
    const map = new Map<string, Set<number>>();
    if (!printabilityReport || !printabilityHighlight) return map;
    for (const o of printabilityReport.objects) {
      if (o.highlightedTriangles.size > 0) map.set(o.objectId, o.highlightedTriangles);
    }
    return map;
  }, [printabilityReport, printabilityHighlight]);

  // When any visible state changes, ask R3F to render one new frame.
  // Without this, frameloop="demand" would never repaint after store updates.
  useEffect(() => { invalidate(); }, [invalidate, plateObjects, selectedId, transformMode]);
  useEffect(() => { invalidate(); }, [
    invalidate, previewMode, sliceResult, previewLayer, previewLayerStart,
  ]);
  useEffect(() => { invalidate(); }, [
    invalidate, previewShowTravel, previewColorMode, previewHiddenTypesKey,
  ]);
  useEffect(() => { invalidate(); }, [
    invalidate, previewSimEnabled, previewSimPlaying, previewSimTime,
  ]);
  useEffect(() => { invalidate(); }, [
    invalidate, printabilityReport, printabilityHighlight,
  ]);

  const bv = printerProfile?.buildVolume ?? { x: 220, y: 220, z: 250 };

  // Build the full move timeline once per slice result. Shared by NozzleSimulator
  // and the sim-state lookup below so we pay the O(n) build cost only once.
  const moveTimeline = useMemo(
    () => (sliceResult
      ? buildMoveTimeline(
        sliceResult,
        {
          filamentDiameter: printerProfile?.filamentDiameter ?? 1.75,
          travelSpeed: printProfile?.travelSpeed ?? 150,
          initialLayerTravelSpeed: printProfile?.initialLayerTravelSpeed,
          retractionDistance: materialProfile?.retractionDistance ?? 0,
          retractionSpeed: materialProfile?.retractionSpeed ?? 0,
          retractionRetractSpeed: materialProfile?.retractionRetractSpeed,
          retractionPrimeSpeed: materialProfile?.retractionPrimeSpeed,
          retractionMinTravel: printProfile?.retractionMinTravel ?? 0,
          minimumExtrusionDistanceWindow: printProfile?.minimumExtrusionDistanceWindow ?? 0,
          maxCombDistanceNoRetract: printProfile?.maxCombDistanceNoRetract ?? 0,
          travelAvoidDistance: printProfile?.travelAvoidDistance ?? 0,
          insideTravelAvoidDistance: printProfile?.insideTravelAvoidDistance ?? 0,
          avoidPrintedParts: printProfile?.avoidPrintedParts ?? false,
          avoidSupports: printProfile?.avoidSupports ?? false,
          zHopWhenRetracted: printProfile?.zHopWhenRetracted ?? ((materialProfile?.retractionZHop ?? 0) > 0),
          zHopHeight: printProfile?.zHopWhenRetracted ? (printProfile?.zHopHeight ?? 0.4) : (materialProfile?.retractionZHop ?? 0),
          zHopSpeed: printProfile?.zHopSpeed,
        },
      )
      : null),
    [
      sliceResult,
      printerProfile?.filamentDiameter,
      materialProfile?.retractionDistance,
      materialProfile?.retractionSpeed,
      materialProfile?.retractionRetractSpeed,
      materialProfile?.retractionPrimeSpeed,
      materialProfile?.retractionZHop,
      printProfile?.travelSpeed,
      printProfile?.initialLayerTravelSpeed,
      printProfile?.retractionMinTravel,
      printProfile?.minimumExtrusionDistanceWindow,
      printProfile?.maxCombDistanceNoRetract,
      printProfile?.travelAvoidDistance,
      printProfile?.insideTravelAvoidDistance,
      printProfile?.avoidPrintedParts,
      printProfile?.avoidSupports,
      printProfile?.zHopWhenRetracted,
      printProfile?.zHopHeight,
      printProfile?.zHopSpeed,
    ],
  );

  // Map simTime → { layerIndex, moveCount } so InlineGCodePreview reveals
  // moves one at a time instead of entire layers at once.
  const simState = useMemo(() => {
    if (!previewSimEnabled || !moveTimeline || moveTimeline.moves.length === 0) {
      return { layerIndex: previewLayer, moveCount: undefined as number | undefined };
    }
    const cum = moveTimeline.cumulative;
    const clampedT = Math.max(0, Math.min(previewSimTime, moveTimeline.total));
    if (clampedT <= 0) {
      return {
        layerIndex: moveTimeline.layerIndices[0] ?? previewLayer,
        moveCount: 0,
      };
    }
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < clampedT) lo = mid + 1;
      else hi = mid;
    }
    return {
      layerIndex: moveTimeline.layerIndices[lo],
      moveCount: moveTimeline.moveWithinLayer[lo] + 1,
    };
  }, [previewSimEnabled, moveTimeline, previewSimTime, previewLayer]);

  const handleMiss = useCallback(() => {
    selectPlateObject(null);
  }, [selectPlateObject]);

  const handleTransformCommit = useCallback((
    id: string,
    pos: { x: number; y: number; z: number },
    rot: { x: number; y: number; z: number },
    scl: { x: number; y: number; z: number },
  ) => {
    updatePlateObject(id, { position: pos, rotation: rot, scale: scl });
  }, [updatePlateObject]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[bv.x, bv.y, bv.z * 1.5]} intensity={0.8} />
      <directionalLight position={[-bv.x / 2, -bv.y / 2, bv.z]} intensity={0.3} />

      <BuildPlateGrid sizeX={bv.x} sizeY={bv.y} />
      <BuildVolumeWireframe x={bv.x} y={bv.y} z={bv.z} />
      <AxisIndicators />

      {previewMode === 'model' && plateObjects.map((obj) => (
        <PlateObjectMesh
          key={obj.id}
          obj={obj}
          isSelected={obj.id === selectedId}
          materialColor={materialProfile?.color ?? '#4fc3f7'}
          highlightedTriangles={highlightByObject.get(obj.id)}
          onClick={() => selectPlateObject(obj.id)}
          transformMode={transformMode}
          onTransformCommit={handleTransformCommit}
        />
      ))}

      {previewMode === 'preview' && sliceResult && (
        <InlineGCodePreview
          sliceResult={sliceResult}
          startLayer={previewLayerStart}
          currentLayer={simState.layerIndex}
          currentLayerMoveCount={simState.moveCount}
          showTravel={previewShowTravel}
          colorMode={previewColorMode}
          hiddenTypes={hiddenTypes}
        />
      )}

      {previewMode === 'preview' && sliceResult && previewSimEnabled && moveTimeline && (
        <NozzleSimulator
          timeline={moveTimeline}
          simTime={previewSimTime}
          playing={previewSimPlaying}
          speed={previewSimSpeed}
          onAdvance={advancePreviewSimTime}
        />
      )}

      <mesh position={[bv.x / 2, bv.y / 2, -0.1]} onClick={handleMiss} visible={false}>
        <planeGeometry args={[bv.x * 2, bv.y * 2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <OrbitControls
        makeDefault
        target={[bv.x / 2, bv.y / 2, 0]}
        minDistance={50}
        maxDistance={bv.x * 4}
        enableDamping
      />
    </>
  );
}

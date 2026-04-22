import * as THREE from 'three';
import type { Feature, Sketch, SketchEntity, SketchPoint } from '../../../types/cad';
import { GeometryEngine } from '../../../engine/GeometryEngine';
import { EXTRUDE_DEFAULTS, REVOLVE_DEFAULTS } from '../defaults';
import type { ExtrudeDirection, ExtrudeOperation } from '../types';
import { useComponentStore } from '../../componentStore';
import type { CADSliceContext } from '../sliceContext';
import type { CADState } from '../state';

export function createExtrudeRevolveSlice({ set, get }: CADSliceContext) {
  const slice: Partial<CADState> = {
  ...EXTRUDE_DEFAULTS,
  setExtrudeSelectedSketchId: (id) => set({
    extrudeSelectedSketchId: id,
    extrudeSelectedSketchIds: id ? [id] : [],
  }),
  setExtrudeSelectedSketchIds: (ids) => set({
    extrudeSelectedSketchIds: ids,
    extrudeSelectedSketchId: ids[0] ?? null,
  }),
  setExtrudeDistance: (distance) => set({ extrudeDistance: distance }),
  setExtrudeDistance2: (distance) => set({ extrudeDistance2: distance }),
  setExtrudeDirection: (d) => set({ extrudeDirection: d }),
  setExtrudeOperation: (o) => set({ extrudeOperation: o }),
  // Thin extrude (D66)
  setExtrudeThinEnabled: (v) => set({ extrudeThinEnabled: v }),
  setExtrudeThinThickness: (t) => set({ extrudeThinThickness: Math.max(0.01, t) }),
  setExtrudeThinSide: (s) => set({ extrudeThinSide: s }),
  // EX-7/EX-8 per-side
  setExtrudeThinSide2: (s) => set({ extrudeThinSide2: s }),
  setExtrudeThinThickness2: (t) => set({ extrudeThinThickness2: Math.max(0.01, t) }),
  // D67 / CORR-8 start options
  setExtrudeStartType: (t) => set({ extrudeStartType: t }),
  setExtrudeStartOffset: (v) => set({ extrudeStartOffset: v }),
  setExtrudeStartEntityId: (id) => set({ extrudeStartEntityId: id }),
  // EX-4: From-Entity face data
  setExtrudeStartFace: (normal, centroid) => set({
    extrudeStartEntityId: centroid.join(','),
    extrudeStartFaceNormal: normal,
    extrudeStartFaceCentroid: centroid,
    statusMessage: 'Start face selected — set extent distance, then OK',
  }),
  clearExtrudeStartFace: () => set({
    extrudeStartEntityId: null,
    extrudeStartFaceNormal: null,
    extrudeStartFaceCentroid: null,
  }),
  // D68 extent types (EX-3: to-object added)
  setExtrudeExtentType: (t) => set({ extrudeExtentType: t }),
  setExtrudeExtentType2: (t) => set({ extrudeExtentType2: t }),
  // EX-3: To-Object face data
  setExtrudeToEntityFace: (id, normal, centroid) => set({
    extrudeToEntityFaceId: id,
    extrudeToEntityFaceNormal: normal,
    extrudeToEntityFaceCentroid: centroid,
    statusMessage: 'To-object face selected — OK to commit',
  }),
  clearExtrudeToEntityFace: () => set({
    extrudeToEntityFaceId: null,
    extrudeToEntityFaceNormal: null,
    extrudeToEntityFaceCentroid: null,
    extrudeToObjectFlipDirection: false,
  }),
  // EX-12
  setExtrudeToObjectFlipDirection: (v) => set({ extrudeToObjectFlipDirection: v }),
  // D69 taper angle
  setExtrudeTaperAngle: (a) => set({ extrudeTaperAngle: a }),
  // EX-6 taper angle side 2
  setExtrudeTaperAngle2: (a) => set({ extrudeTaperAngle2: a }),
  // EX-5 symmetric full-length
  setExtrudeSymmetricFullLength: (v) => set({ extrudeSymmetricFullLength: v }),
  // D102 body kind
  setExtrudeBodyKind: (k) => set({ extrudeBodyKind: k }),
  // EX-9 / CORR-14
  setExtrudeParticipantBodyIds: (ids) => set({ extrudeParticipantBodyIds: ids }),
  setExtrudeConfinedFaceIds: (ids) => set({ extrudeConfinedFaceIds: ids }),
  setExtrudeCreationOccurrence: (id) => set({ extrudeCreationOccurrence: id }),
  setExtrudeTargetBaseFeature: (id) => set({ extrudeTargetBaseFeature: id }),
  startExtrudeTool: () => {
    // Clean up orphaned Press Pull profiles from previous sessions
    const { sketches, features } = get();
    const usedSketchIds = new Set(features.map((f) => f.sketchId).filter(Boolean));
    const cleanedSketches = sketches.filter(
      (s) => !s.name.startsWith('Press Pull Profile') || usedSketchIds.has(s.id),
    );
    set({
      activeTool: 'extrude',
      ...EXTRUDE_DEFAULTS,
      sketches: cleanedSketches,
      extrudeSelectedSketchId: null,
      statusMessage: 'Click a profile or face to extrude',
    });
  },
  startExtrudeFromFace: (boundary, normal, centroid) => {
    if (boundary.length < 3) {
      set({ statusMessage: 'Cannot extrude — face boundary too small' });
      return;
    }
    // Build a synthetic Sketch in the 'custom' face plane. Each consecutive
    // pair of boundary points becomes a 'line' SketchEntity. The loop is
    // closed by the final segment from boundary[n-1] back to boundary[0].
    const points: SketchPoint[] = boundary.map((p) => ({
      id: crypto.randomUUID(),
      x: p.x, y: p.y, z: p.z,
    }));
    const entities: SketchEntity[] = [];
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      entities.push({
        id: crypto.randomUUID(),
        type: 'line',
        points: [points[i], points[next]],
      });
    }
    const { sketches } = get();
    const pressPullCount = sketches.filter((s) => s.name.startsWith('Press Pull Profile')).length;
    const sketch: Sketch = {
      id: crypto.randomUUID(),
      name: `Press Pull Profile ${pressPullCount + 1}`,
      plane: 'custom',
      planeNormal: normal.clone().normalize(),
      planeOrigin: centroid.clone(),
      entities,
      constraints: [],
      dimensions: [],
      fullyConstrained: false,
    };
    // Press-pull defaults to Join (adding material to the existing body).
    // The user can switch to Cut or New Body in the panel dropdown.
    set({
      sketches: [...sketches, sketch],
      extrudeSelectedSketchId: sketch.id,
      extrudeSelectedSketchIds: [sketch.id],
      extrudeDirection: 'positive',
      extrudeOperation: 'join',
      statusMessage: 'Press-pull profile selected — drag arrow or set distance, then OK',
    });
  },
  // EX-11: add a planar face as an additional profile while sketch(es) already selected.
  // Creates a Press Pull Profile sketch from the face boundary and appends it to the
  // current selection — does NOT reset EXTRUDE_DEFAULTS (unlike startExtrudeFromFace).
  addFaceToExtrude: (boundary, normal, centroid) => {
    if (boundary.length < 3) {
      set({ statusMessage: 'Cannot add face — boundary too small' });
      return;
    }
    const points: SketchPoint[] = boundary.map((p) => ({
      id: crypto.randomUUID(),
      x: p.x, y: p.y, z: p.z,
    }));
    const entities: SketchEntity[] = [];
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      entities.push({
        id: crypto.randomUUID(),
        type: 'line',
        points: [points[i], points[next]],
      });
    }
    const { sketches, extrudeSelectedSketchIds } = get();
    const pressPullCount = sketches.filter((s) => s.name.startsWith('Press Pull Profile')).length;
    const sketch: Sketch = {
      id: crypto.randomUUID(),
      name: `Press Pull Profile ${pressPullCount + 1}`,
      plane: 'custom',
      planeNormal: normal.clone().normalize(),
      planeOrigin: centroid.clone(),
      entities,
      constraints: [],
      dimensions: [],
      fullyConstrained: false,
    };
    const newIds = [...extrudeSelectedSketchIds, sketch.id];
    set({
      sketches: [...sketches, sketch],
      extrudeSelectedSketchId: sketch.id,
      extrudeSelectedSketchIds: newIds,
      statusMessage: `${newIds.length} profiles selected — drag arrow or set distance, then OK`,
    });
  },
  loadExtrudeForEdit: (featureId) => {
    const { features } = get();
    const feature = features.find((f) => f.id === featureId);
    if (!feature || feature.type !== 'extrude') return;
    const p = feature.params;
    const sketchId = feature.sketchId ?? null;
    set({
      activeTool: 'extrude',
      editingFeatureId: featureId,
      extrudeSelectedSketchId: sketchId,
      extrudeSelectedSketchIds: sketchId ? [sketchId] : [],
      extrudeDistance: typeof p.distance === 'number' ? p.distance : 10,
      extrudeDistance2: typeof p.distance2 === 'number' ? p.distance2 : 10,
      extrudeDirection: (p.direction as ExtrudeDirection) ?? 'positive',
      extrudeOperation: (p.operation as ExtrudeOperation) ?? 'new-body',
      extrudeThinEnabled: !!p.thin,
      extrudeThinThickness: typeof p.thinThickness === 'number' ? p.thinThickness : 2,
      extrudeThinSide: (p.thinSide as 'side1' | 'side2' | 'center') ?? 'side1',
      extrudeThinSide2: (p.thinSide2 as 'side1' | 'side2' | 'center') ?? 'side1',
      extrudeThinThickness2: typeof p.thinThickness2 === 'number' ? p.thinThickness2 : 2,
      extrudeStartType: (p.startType as 'profile' | 'offset' | 'entity') ?? 'profile',
      extrudeStartOffset: typeof p.startOffset === 'number' ? p.startOffset : 0,
      extrudeStartEntityId: (p.startEntityId as string | null) ?? null,
      extrudeExtentType: (p.extentType as 'distance' | 'all' | 'to-object') ?? 'distance',
      extrudeExtentType2: (p.extentType2 as 'distance' | 'all' | 'to-object') ?? 'distance',
      extrudeToEntityFaceId: (p.toEntityFaceId as string | null) ?? null,
      extrudeToEntityFaceNormal: (p.toEntityFaceNormal as [number, number, number] | null) ?? null,
      extrudeToEntityFaceCentroid: (p.toEntityFaceCentroid as [number, number, number] | null) ?? null,
      extrudeToObjectFlipDirection: !!(p.toObjectFlipDirection),
      extrudeStartFaceNormal: (p.startFaceNormal as [number, number, number] | null) ?? null,
      extrudeStartFaceCentroid: (p.startFaceCentroid as [number, number, number] | null) ?? null,
      extrudeTaperAngle: typeof p.taperAngle === 'number' ? p.taperAngle : 0,
      extrudeTaperAngle2: typeof p.taperAngle2 === 'number' ? p.taperAngle2 : 0,
      extrudeSymmetricFullLength: false,
      extrudeBodyKind: (feature.bodyKind === 'surface' ? 'surface' : 'solid') as 'solid' | 'surface',
      extrudeParticipantBodyIds: Array.isArray(p.participantBodyIds) ? (p.participantBodyIds as unknown as string[]) : [],
      extrudeConfinedFaceIds: Array.isArray(p.confinedFaceIds) ? (p.confinedFaceIds as unknown as string[]) : [],
      extrudeCreationOccurrence: typeof p.creationOccurrence === 'string' ? p.creationOccurrence : null,
      extrudeTargetBaseFeature: typeof p.targetBaseFeature === 'string' ? p.targetBaseFeature : null,
      statusMessage: `Edit extrude: "${feature.name}"`,
    });
  },
  cancelExtrudeTool: () => {
    // Discard any auto-generated press-pull profiles that were never committed
    const { sketches, features } = get();
    const usedSketchIds = new Set(features.map((f) => f.sketchId).filter(Boolean));
    const cleanedSketches = sketches.filter(
      (s) => !s.name.startsWith('Press Pull Profile') || usedSketchIds.has(s.id),
    );
    set({
      activeTool: 'select',
      ...EXTRUDE_DEFAULTS,
      sketches: cleanedSketches,
      statusMessage: 'Extrude cancelled',
    });
  },
  commitExtrude: () => {
    const {
      extrudeSelectedSketchId, extrudeSelectedSketchIds, extrudeDistance, extrudeDistance2, extrudeDirection,
      extrudeOperation, extrudeThinEnabled, extrudeThinThickness, extrudeThinSide,
      extrudeThinSide2, extrudeThinThickness2,
      extrudeStartType, extrudeStartOffset, extrudeStartEntityId, extrudeExtentType, extrudeTaperAngle, extrudeTaperAngle2,
      extrudeBodyKind, extrudeSymmetricFullLength, extrudeParticipantBodyIds,
      extrudeConfinedFaceIds,
      extrudeExtentType2,
      extrudeToEntityFaceId, extrudeToEntityFaceNormal,
      extrudeStartFaceCentroid, extrudeStartFaceNormal,
      extrudeCreationOccurrence,
      extrudeTargetBaseFeature,
      editingFeatureId,
      sketches, features, units,
    } = get();
    // EX-13: edit mode — identify the feature being replaced
    const editingExtrude = editingFeatureId
      ? features.find((f) => f.id === editingFeatureId && f.type === 'extrude') ?? null
      : null;
    const editingIndex = editingExtrude ? features.findIndex((f) => f.id === editingFeatureId) : -1;
    const selectedSketchIds =
      extrudeSelectedSketchIds.length > 0
        ? extrudeSelectedSketchIds
        : (extrudeSelectedSketchId ? [extrudeSelectedSketchId] : []);
    if (selectedSketchIds.length === 0) {
      set({ statusMessage: 'No profile selected' });
      return;
    }
    const selectedProfiles = selectedSketchIds
      .map((id) => {
        const [sketchId, rawIndex] = id.split('::');
        const sourceSketch = sketches.find((s) => s.id === sketchId);
        if (!sourceSketch) return null;
        if (rawIndex === undefined) {
          return { sourceSketch, sketchForOp: sourceSketch, selectionId: id, profileIndex: undefined as number | undefined };
        }
        const parsed = Number(rawIndex);
        if (!Number.isFinite(parsed)) return null;
        const profileSketch = GeometryEngine.createProfileSketch(sourceSketch, parsed);
        if (!profileSketch) return null;
        return { sourceSketch, sketchForOp: profileSketch, selectionId: id, profileIndex: parsed };
      })
      .filter(Boolean) as { sourceSketch: Sketch; sketchForOp: Sketch; selectionId: string; profileIndex: number | undefined }[];

    if (selectedProfiles.length === 0) {
      set({ statusMessage: 'Selected profile not found' });
      return;
    }
    if (extrudeExtentType === 'distance' && Math.abs(extrudeDistance) < 0.01) {
      set({ statusMessage: 'Distance must be non-zero' });
      return;
    }
    get().pushUndo();
    // EX-3: for to-object extent, derive distance from profile plane → face centroid projection
    const { extrudeToEntityFaceCentroid, extrudeToObjectFlipDirection } = get();
    const computeToObjectDistance = (profileSketch: Sketch): number => {
      if (!extrudeToEntityFaceCentroid) return Math.abs(extrudeDistance);
      const target = new THREE.Vector3(...extrudeToEntityFaceCentroid);
      const origin = profileSketch.planeOrigin.clone();
      // EX-4: if From-Entity start is set, use that face centroid as origin
      if (extrudeStartFaceCentroid) origin.set(...extrudeStartFaceCentroid);
      const n = extrudeToEntityFaceNormal
        ? new THREE.Vector3(...extrudeToEntityFaceNormal)
        : profileSketch.planeNormal.clone().normalize();
      // EX-12: directionHint — flip the sign so the extrude goes the other way
      const raw = target.clone().sub(origin).dot(n);
      const d = extrudeToObjectFlipDirection ? -raw : raw;
      return Math.max(0.01, Math.abs(d));
    };
    // Use absolute distance — negative just means the user dragged in reverse
    const absDistance = extrudeExtentType === 'all'
      ? 10000
      : extrudeExtentType === 'to-object'
        ? computeToObjectDistance(
            (selectedProfiles[0]?.sketchForOp) ?? (selectedProfiles[0]?.sourceSketch)
          )
        : Math.abs(extrudeDistance);
    // EX-10: side 2 uses its own independent extent type
    const absDistance2 = extrudeExtentType2 === 'all'
      ? 10000
      : extrudeExtentType2 === 'to-object'
        ? computeToObjectDistance(
            (selectedProfiles[0]?.sketchForOp) ?? (selectedProfiles[0]?.sourceSketch)
          )
        : Math.abs(extrudeDistance2);
    // Direction follows the sign of the distance (two-sides never flips)
    const finalDirection = extrudeDirection === 'two-sides' ? 'two-sides' : (extrudeDistance < 0 ? 'negative' : extrudeDirection);
    // Operation is set explicitly by the user in the panel (new-body, join, cut)
    const finalOperation = extrudeOperation;

    // EX-13: in edit mode, remove the old feature first (new one inserts at same position)
    const nextFeatures = editingExtrude
      ? features.filter((f) => f.id !== editingFeatureId)
      : [...features];
    let createdCount = 0;
    let firstCreatedSketchName: string | null = null;

    for (const selected of selectedProfiles) {
      const { sourceSketch, sketchForOp, profileIndex } = selected;
      const isClosedProfile = GeometryEngine.isSketchClosedProfile(sketchForOp);
      const resolvedBodyKind: 'solid' | 'surface' = (!isClosedProfile || extrudeBodyKind === 'surface') ? 'surface' : 'solid';

      // Generate mesh: surface → thin → standard solid (taper is rebuilt by
      // ExtrudedBodies via buildExtrudeFeatureMesh, so no stored mesh).
      let featureMesh: THREE.Mesh | undefined;
      if (resolvedBodyKind === 'surface') {
        featureMesh = GeometryEngine.extrudeSketchSurface(sketchForOp, absDistance) ?? undefined;
      } else if (extrudeThinEnabled) {
        const thinSide: 'inside' | 'outside' | 'center' = extrudeThinSide === 'side1' ? 'inside' : extrudeThinSide === 'side2' ? 'outside' : 'center';
        featureMesh = GeometryEngine.extrudeThinSketch(sketchForOp, absDistance, extrudeThinThickness, thinSide) ?? undefined;
      } else {
        featureMesh = GeometryEngine.extrudeSketch(sketchForOp, absDistance) ?? undefined;
      }

      // Apply start offset to thin/surface stored meshes (standard solid +
      // taper get the offset applied during the CSG rebuild instead).
      if (featureMesh && extrudeStartType === 'offset' && Math.abs(extrudeStartOffset) > 0.001) {
        const n = GeometryEngine.getSketchExtrudeNormal(sketchForOp);
        featureMesh.position.addScaledVector(n, extrudeStartOffset);
      }

      // Standard solid extrudes (with or without taper/offset) are rebuilt by
      // the ExtrudedBodies CSG pipeline so they participate in join/cut. Only
      // thin and surface extrudes need a stored mesh.
      const needsStoredMesh = resolvedBodyKind === 'surface' || extrudeThinEnabled;

      // Multi-profile selection: when the user picks several profiles and
      // chooses 'new-body', profiles that overlap each other should fuse into
      // a single body (Fusion 360 parity — they are "connected" after extrude).
      // We do this by routing the 2nd-onwards profile through the 'join' path,
      // which already has the bbox-overlap check + auto-promote-to-new-body
      // fallback for disconnected profiles. The 1st profile stays 'new-body'
      // so disconnected selections still start with a fresh body.
      let effectiveOperation = finalOperation;
      const isMultiProfileSubsequent =
        finalOperation === 'new-body' &&
        selectedProfiles.length > 1 &&
        createdCount > 0 &&
        resolvedBodyKind === 'solid' &&
        !extrudeThinEnabled;
      if (isMultiProfileSubsequent) effectiveOperation = 'join';
      // ── Fusion 360 parity: auto-promote 'join' → 'new-body' when detached ──
      // If the user chose 'join' but the proposed geometry doesn't intersect any
      // existing solid body (e.g. an offset extrusion floating in space), Fusion
      // 360 automatically creates a new body. We replicate that here by doing a
      // cheap bounding-box check against all currently committed solid extrudes.
      if (effectiveOperation === 'join' && resolvedBodyKind === 'solid' && !extrudeThinEnabled) {
        const existingSolids = nextFeatures.filter(
          (f) => f.type === 'extrude' && !f.suppressed && f.visible &&
                 f.bodyKind !== 'surface' &&
                 (f.params.operation === 'new-body' || f.params.operation === 'join'),
        );
        if (existingSolids.length === 0) {
          // No solid bodies yet — this must be the first one
          effectiveOperation = 'new-body';
        } else {
          // Build the proposed geometry once. We need its bbox for cheap
          // pre-filtering AND the baked world-space geometry for the exact
          // CSG-intersection test that determines real overlap.
          const proposedMesh = GeometryEngine.buildExtrudeFeatureMesh(
            sketchForOp, absDistance, finalDirection, extrudeTaperAngle,
            extrudeStartType === 'offset' ? extrudeStartOffset : 0,
            absDistance2,
            extrudeTaperAngle2,
          );
          if (proposedMesh) {
            proposedMesh.updateMatrixWorld(true);
            const proposedBox = new THREE.Box3().setFromObject(proposedMesh);
            const proposedGeomW = GeometryEngine.bakeMeshWorldGeometry(proposedMesh);
            proposedMesh.geometry.dispose();

            let intersectsAny = false;
            for (const ef of existingSolids) {
              const efSk = sketches.find((s) => s.id === ef.sketchId);
              if (!efSk) continue;
              const efPI = ef.params.profileIndex as number | undefined;
              const efSketchForOp = efPI !== undefined
                ? GeometryEngine.createProfileSketch(efSk, efPI)
                : efSk;
              if (!efSketchForOp) continue;
              const efMesh = GeometryEngine.buildExtrudeFeatureMesh(
                efSketchForOp,
                (ef.params.distance as number) ?? 10,
                ((ef.params.direction as string) || 'positive') as 'positive' | 'negative' | 'symmetric' | 'two-sides',
                (ef.params.taperAngle as number) ?? 0,
                (ef.params.startType as string) === 'offset' ? ((ef.params.startOffset as number) ?? 0) : 0,
                (ef.params.distance2 as number) ?? (ef.params.distance as number) ?? 10,
              );
              if (!efMesh) continue;
              efMesh.updateMatrixWorld(true);
              const efBox = new THREE.Box3().setFromObject(efMesh);
              // Cheap bbox pre-filter. If the boxes don't even touch we can
              // skip the expensive CSG work entirely.
              if (!proposedBox.intersectsBox(efBox)) {
                efMesh.geometry.dispose();
                continue;
              }
              // Accurate test: do the two solids truly overlap in volume,
              // or do they just touch at a corner/edge? CSG intersection
              // produces an empty (or near-empty) geometry for the latter.
              // Threshold 6 = 2 triangles; anything less is degenerate
              // coplanar contact (touching face), not volumetric overlap.
              const efGeomW = GeometryEngine.bakeMeshWorldGeometry(efMesh);
              efMesh.geometry.dispose();
              try {
                const inter = GeometryEngine.csgIntersect(proposedGeomW, efGeomW);
                const triVerts = (inter.attributes.position as THREE.BufferAttribute | undefined)?.count ?? 0;
                inter.dispose();
                if (triVerts > 6) {
                  intersectsAny = true;
                  efGeomW.dispose();
                  break;
                }
              } catch { /* malformed geometry — fall back to bbox result */
                intersectsAny = true;
                efGeomW.dispose();
                break;
              }
              efGeomW.dispose();
            }
            proposedGeomW.dispose();
            if (!intersectsAny) effectiveOperation = 'new-body';
          }
        }
      }

      const featureId = crypto.randomUUID();
      let componentId: string | undefined;
      let bodyId: string | undefined;
      // When an extrude produces geometrically disconnected pieces (two
      // disjoint profiles, or CSG cut that split a body) each piece should
      // show up as its own entry in the Bodies browser. Build a preview
      // mesh here solely to count connected components, and register one
      // body per piece. The extra ids are stored on the feature so the
      // renderer can match a split geometry → bodies by index.
      let extraBodyIds: string[] = [];
      if (effectiveOperation === 'new-body') {
        const componentStore = useComponentStore.getState();
        componentId = componentStore.activeComponentId ?? componentStore.rootComponentId;
        const bodyCount = Object.keys(componentStore.bodies).length + 1;
        const bodyLabel = `${resolvedBodyKind === 'surface' ? 'Surface' : 'Body'} ${bodyCount}`;
        const createdBodyId = componentStore.addBody(componentId, bodyLabel);
        if (createdBodyId) {
          bodyId = createdBodyId;
          componentStore.addFeatureToBody(createdBodyId, featureId);
          // Only store mesh on body for thin/taper/surface — standard solid
          // extrudes are rendered by the CSG pipeline in ExtrudedBodies.
          if (needsStoredMesh && featureMesh) componentStore.setBodyMesh(createdBodyId, featureMesh);
        }
        // Detect disconnected pieces — only for standard (CSG-pipeline) solids.
        if (!needsStoredMesh && createdBodyId) {
          try {
            const probe = GeometryEngine.buildExtrudeFeatureMesh(
              sketchForOp,
              absDistance,
              finalDirection,
              extrudeTaperAngle,
              extrudeStartType === 'offset' ? extrudeStartOffset : 0,
              absDistance2,
              extrudeTaperAngle2,
            );
            if (probe) {
              const parts = GeometryEngine.splitByConnectedComponents(probe.geometry);
              if (parts.length > 1) {
                for (let i = 1; i < parts.length; i++) {
                  const extraId = componentStore.addBody(
                    componentId,
                    `${bodyLabel}.${i + 1}`,
                  );
                  if (extraId) {
                    componentStore.addFeatureToBody(extraId, featureId);
                    extraBodyIds.push(extraId);
                  }
                }
              }
              // splitByConnectedComponents returns [probe.geometry] (same ref)
              // when singly connected; otherwise fresh allocations. Dispose the
              // parts list — which contains the original when singly connected —
              // so we never double-dispose.
              for (const g of parts) g.dispose();
            }
          } catch { /* ignore — fall back to single body */ }
        }
      } else if (effectiveOperation === 'new-component') {
        const componentStore = useComponentStore.getState();
        const parentId = componentStore.activeComponentId ?? componentStore.rootComponentId;
        const newCompId = componentStore.addComponent(parentId, 'Component ' + (Object.keys(componentStore.components ?? {}).length + 1));
        const createdBodyId = componentStore.addBody(newCompId, 'Body 1');
        componentId = newCompId;
        bodyId = createdBodyId;
        if (createdBodyId) {
          componentStore.addFeatureToBody(createdBodyId, featureId);
          if (needsStoredMesh && featureMesh) componentStore.setBodyMesh(createdBodyId, featureMesh);
        }
      }

      const feature: Feature = {
        id: featureId,
        name: `${extrudeThinEnabled ? 'Thin ' : ''}${effectiveOperation === 'cut' ? 'Cut' : 'Extrude'} ${features.filter(f => f.type === 'extrude').length + createdCount + 1}`,
        type: 'extrude',
        sketchId: sourceSketch.id,
        bodyId,
        componentId,
        params: {
          distance: finalDirection === 'symmetric'
            ? (extrudeSymmetricFullLength ? absDistance / 2 : absDistance)
            : absDistance,
          distanceExpr: String(absDistance),
          ...(finalDirection === 'two-sides' ? { distance2: absDistance2 } : {}),
          // Extra body ids for disconnected pieces (2nd piece onwards). The
          // renderer uses these to label each split component separately so
          // every disconnected piece becomes its own row in the Bodies list.
          ...(extraBodyIds.length > 0 ? { extraBodyIds } : {}),
          direction: finalDirection,
          operation: effectiveOperation,
          thin: extrudeThinEnabled,
          thinThickness: extrudeThinThickness,
          thinSide: extrudeThinSide,
          // EX-7/EX-8: per-side thin values (relevant only when direction=two-sides)
          thinSide2: extrudeThinSide2,
          thinThickness2: extrudeThinThickness2,
          startType: extrudeStartType,
          startOffset: extrudeStartOffset,
          ...(extrudeStartType === 'entity' ? { startEntityId: extrudeStartEntityId } : {}),
          // EX-4: From-Entity face data
          ...(extrudeStartFaceCentroid ? { startFaceCentroid: extrudeStartFaceCentroid, startFaceNormal: extrudeStartFaceNormal } : {}),
          // EX-9: participant bodies (empty array = all bodies)
          ...(extrudeParticipantBodyIds.length > 0 ? { participantBodyIds: extrudeParticipantBodyIds } : {}),
          // SDK-12: confined faces (empty = no confinement)
          ...(extrudeConfinedFaceIds.length > 0 ? { confinedFaceIds: extrudeConfinedFaceIds } : {}),
          // EX-15: occurrence context the profile was created in
          ...(extrudeCreationOccurrence ? { creationOccurrence: extrudeCreationOccurrence } : {}),
          // EX-16: target base feature container for direct-edit mode
          ...(extrudeTargetBaseFeature ? { targetBaseFeature: extrudeTargetBaseFeature } : {}),
          extentType: extrudeExtentType,
          // EX-3/EX-12: save to-object face data + flip for edit round-trip
          ...(extrudeExtentType === 'to-object' && extrudeToEntityFaceCentroid
            ? { toEntityFaceId: extrudeToEntityFaceId, toEntityFaceNormal: extrudeToEntityFaceNormal, toEntityFaceCentroid: extrudeToEntityFaceCentroid, toObjectFlipDirection: extrudeToObjectFlipDirection }
            : {}),
          ...(finalDirection === 'two-sides' ? { extentType2: extrudeExtentType2 } : {}),
          taperAngle: extrudeTaperAngle,
          ...(finalDirection === 'two-sides' ? { taperAngle2: extrudeTaperAngle2 } : {}),
          profileIndex,
        },
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        // Standard solid extrudes (no thin, no taper) must NOT store a mesh —
        // ExtrudedBodies.tsx CSG pipeline rebuilds them from sketch + params
        // via buildExtrudeFeatureMesh and applies csgSubtract/csgUnion.
        // Only thin/taper/surface extrudes store a mesh (can't be rebuilt
        // from just sketch + distance + direction).
        mesh: needsStoredMesh ? featureMesh : undefined,
        bodyKind: resolvedBodyKind,
        // EX-16: when targeting a base feature, exclude from parametric timeline
        ...(extrudeTargetBaseFeature ? { suppressTimeline: true } : {}),
        // EX-17: stable synthetic face IDs — start, end, and one side-face per sketch edge
        startFaceIds: [`${featureId}_start_0`],
        endFaceIds: [`${featureId}_end_0`],
        sideFaceIds: sketchForOp.entities.map((_, ei) => `${featureId}_side_${ei}`),
      };

      // Dispose the mesh if we're not storing it to avoid GPU leak
      if (!needsStoredMesh && featureMesh) {
        featureMesh.geometry.dispose();
      }

      // EX-13: edit mode inserts at the old feature's index; create mode appends
      if (editingExtrude && editingIndex >= 0) {
        nextFeatures.splice(editingIndex, 0, feature);
      } else {
        nextFeatures.push(feature);
      }
      createdCount += 1;
      if (!firstCreatedSketchName) firstCreatedSketchName = sourceSketch.name;
    }

    const actionVerb = editingExtrude ? 'Updated' : (finalOperation === 'cut' ? 'Cut' : 'Extruded');
    set({
      features: nextFeatures,
      activeTool: 'select',
      editingFeatureId: null,
      ...EXTRUDE_DEFAULTS,
      statusMessage:
        createdCount > 1
          ? `${actionVerb} ${createdCount} profiles${extrudeExtentType === 'all' ? ' (All)' : ` by ${absDistance}${units}`}`
          : `${actionVerb} ${firstCreatedSketchName ?? 'profile'}${extrudeExtentType === 'all' ? ' (All)' : ` by ${absDistance}${units}`}`,
    });
  },

  // ─── Revolve tool ──────────────────────────────────────────────────────
  ...REVOLVE_DEFAULTS,
  setRevolveSelectedSketchId: (id) => set({ revolveSelectedSketchId: id }),
  setRevolveAxis: (a) => set({ revolveAxis: a }),
  setRevolveAngle: (angle) => set({ revolveAngle: angle }),
  // D70 direction modes
  setRevolveDirection: (d) => set({ revolveDirection: d }),
  setRevolveAngle2: (a) => set({ revolveAngle2: a }),
  // D103 body kind
  setRevolveBodyKind: (k) => set({ revolveBodyKind: k }),
  // CORR-10
  setRevolveIsProjectAxis: (v) => set({ revolveIsProjectAxis: v }),
  // Face mode
  setRevolveProfileMode: (m) => set({ revolveProfileMode: m }),
  startRevolveFromFace: (boundary, normal) => {
    if (boundary.length < 3) return;
    const flat = boundary.flatMap((v) => [v.x, v.y, v.z]);
    set({
      revolveFaceBoundary: flat,
      revolveFaceNormal: [normal.x, normal.y, normal.z],
      statusMessage: 'Face selected — set axis and angle, then click OK',
    });
  },
  startRevolveTool: () => {
    set({
      activeTool: 'revolve',
      ...REVOLVE_DEFAULTS,
      statusMessage: 'Revolve — pick a sketch profile or use Face mode',
    });
  },
  cancelRevolveTool: () => {
    set({
      activeTool: 'select',
      ...REVOLVE_DEFAULTS,
      statusMessage: 'Revolve cancelled',
    });
  },
  commitRevolve: () => {
    const { revolveProfileMode, revolveSelectedSketchId, revolveFaceBoundary, revolveAxis, revolveAngle, revolveDirection, revolveAngle2, revolveBodyKind, revolveIsProjectAxis, sketches, features, units } = get();

    // ── Face mode ──────────────────────────────────────────────────────────
    if (revolveProfileMode === 'face') {
      if (!revolveFaceBoundary || revolveFaceBoundary.length < 9) {
        set({ statusMessage: 'Click a face in the viewport first' });
        return;
      }
      const primaryAngle = revolveDirection === 'symmetric' ? revolveAngle / 2 : revolveAngle;
      if (Math.abs(primaryAngle) < 0.5) {
        set({ statusMessage: 'Angle must be greater than 0' });
        return;
      }
      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `${revolveBodyKind === 'surface' ? 'Surface ' : ''}Revolve ${features.filter((f) => f.type === 'revolve').length + 1}`,
        type: 'revolve',
        params: {
          angle: revolveAngle,
          axis: revolveAxis,
          direction: revolveDirection,
          angle2: revolveAngle2,
          faceRevolve: true,
          faceBoundary: revolveFaceBoundary,
          isProjectAxis: revolveIsProjectAxis,
        },
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        bodyKind: revolveBodyKind === 'surface' ? 'surface' : 'solid',
      };
      const angleDesc = revolveDirection === 'symmetric' ? `±${revolveAngle / 2}°` : `${revolveAngle}°`;
      get().pushUndo();
      set({
        features: [...features, feature],
        activeTool: 'select',
        ...REVOLVE_DEFAULTS,
        statusMessage: `Revolved face by ${angleDesc} around ${revolveAxis} (${units})`,
      });
      return;
    }

    // ── Sketch mode ────────────────────────────────────────────────────────
    if (!revolveSelectedSketchId) {
      set({ statusMessage: 'No profile selected for revolve' });
      return;
    }
    const sketch = sketches.find((s) => s.id === revolveSelectedSketchId);
    if (!sketch) {
      set({ statusMessage: 'Selected profile not found' });
      return;
    }
    // For symmetric, each side gets angle/2; for two-sides, side1=revolveAngle, side2=revolveAngle2.
    // The stored angle is always the primary (or full) angle — the renderer uses revolveDirection.
    const primaryAngle = revolveDirection === 'symmetric' ? revolveAngle / 2 : revolveAngle;
    if (Math.abs(primaryAngle) < 0.5) {
      set({ statusMessage: 'Angle must be greater than 0' });
      return;
    }
    // S5: if centerline axis, find centerline entity in sketch and extract axis
    let resolvedAxisKey = revolveAxis as string;
    let centerlineAxisDirection: [number, number, number] | undefined;
    let centerlineAxisOrigin: [number, number, number] | undefined;
    if (revolveAxis === 'centerline') {
      const clEntity = sketch.entities.find((e) => e.type === 'centerline' && e.points.length >= 2);
      if (!clEntity) {
        set({ statusMessage: 'Spun Profile: no centerline found in sketch — add a centerline entity first' });
        return;
      }
      const p0 = clEntity.points[0];
      const p1 = clEntity.points[clEntity.points.length - 1];
      const dir = new THREE.Vector3(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z).normalize();
      centerlineAxisDirection = [dir.x, dir.y, dir.z];
      centerlineAxisOrigin = [p0.x, p0.y, p0.z];
      // Map to nearest standard axis for LatheGeometry orientation fallback
      const ax = Math.abs(dir.x), ay = Math.abs(dir.y), az = Math.abs(dir.z);
      resolvedAxisKey = ax >= ay && ax >= az ? 'X' : ay >= ax && ay >= az ? 'Y' : 'Z';
    }
    get().pushUndo();
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `${revolveBodyKind === 'surface' ? 'Surface ' : ''}Revolve ${features.filter((f) => f.type === 'revolve').length + 1}`,
      type: 'revolve',
      sketchId: revolveSelectedSketchId,
      params: {
        angle: revolveAngle,
        axis: resolvedAxisKey,
        ...(centerlineAxisDirection ? { useCenterline: true, axisDirection: centerlineAxisDirection, axisOrigin: centerlineAxisOrigin } : {}),
        direction: revolveDirection,
        angle2: revolveAngle2,
        isProjectAxis: revolveIsProjectAxis,
      },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: revolveBodyKind === 'surface' ? 'surface' : 'solid',
    };
    const angleDesc = revolveDirection === 'symmetric'
      ? `±${revolveAngle / 2}°`
      : revolveDirection === 'two-sides'
        ? `${revolveAngle}°/${revolveAngle2}°`
        : `${revolveAngle}°`;
    set({
      features: [...features, feature],
      activeTool: 'select',
      ...REVOLVE_DEFAULTS,
      statusMessage: `Revolved ${sketch.name} by ${angleDesc} around ${revolveAxis === 'centerline' ? 'sketch centerline' : revolveAxis} (${units})`,
    });
  },

  // ─── Sweep tool (D30 / D104) ───────────────────────────────────────────
  };

  return slice;
}

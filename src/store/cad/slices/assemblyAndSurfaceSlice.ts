import * as THREE from 'three';
import type { ContactSetEntry, Feature, InterferenceResult, JointOriginRecord } from '../../../types/cad';
import { GeometryEngine } from '../../../engine/GeometryEngine';
import { useComponentStore } from '../../componentStore';
import type { CADSliceContext } from '../sliceContext';
import type { CADState } from '../state';

export function createAssemblyAndSurfaceSlice({ set, get }: CADSliceContext) {
  const slice: Partial<CADState> = {
  jointOrigins: [],
  showJointOriginDialog: false,
  jointOriginPickedPoint: null,
  openJointOriginDialog: () => set({ activeDialog: 'joint-origin', showJointOriginDialog: true, jointOriginPickedPoint: null }),
  closeJointOriginDialog: () => set({ activeDialog: null, showJointOriginDialog: false, jointOriginPickedPoint: null }),
  setJointOriginPoint: (p) => set({ jointOriginPickedPoint: p }),
  commitJointOrigin: (params) => {
    const { jointOrigins, jointOriginPickedPoint } = get();
    const n = jointOrigins.length + 1;
    const record: JointOriginRecord = {
      id: crypto.randomUUID(),
      name: params.name || `Joint Origin ${n}`,
      componentId: params.componentId,
      position: jointOriginPickedPoint ?? [0, 0, 0],
      normal: [0, 1, 0],
    };
    set({ jointOrigins: [...jointOrigins, record], activeDialog: null, showJointOriginDialog: false, jointOriginPickedPoint: null });
  },

  // ── D196 — Interference ─────────────────────────────────────────────────
  showInterferenceDialog: false,
  interferenceResults: [],
  openInterferenceDialog: () => set({ activeDialog: 'interference', showInterferenceDialog: true }),
  closeInterferenceDialog: () => set({ activeDialog: null, showInterferenceDialog: false }),
  computeInterference: () => {
    const { features } = get();
    const solidFeatures = features.filter(
      (f) => f.mesh && f.visible && (!f.bodyKind || f.bodyKind === 'solid') && (f.mesh as THREE.Mesh).isMesh,
    );
    const results: InterferenceResult[] = [];
    for (let i = 0; i < solidFeatures.length; i++) {
      for (let j = i + 1; j < solidFeatures.length; j++) {
        const fA = solidFeatures[i];
        const fB = solidFeatures[j];
        const meshA = fA.mesh as THREE.Mesh;
        const meshB = fB.mesh as THREE.Mesh;
        const boxA = new THREE.Box3().setFromObject(meshA);
        const boxB = new THREE.Box3().setFromObject(meshB);
        let hasInterference = false;
        let intersectionCurveCount = 0;
        if (boxA.intersectsBox(boxB)) {
          const curves = GeometryEngine.computeMeshIntersectionCurve(meshA, meshB, 1e-3);
          hasInterference = curves.length > 0;
          intersectionCurveCount = curves.length;
        }
        results.push({ bodyAName: fA.name, bodyBName: fB.name, hasInterference, intersectionCurveCount });
      }
    }
    set({ interferenceResults: results });
  },

  // ── A22 — Mirror Component ────────────────────────────────────────────────
  showMirrorComponentDialog: false,
  openMirrorComponentDialog: () => set({ activeDialog: 'mirror-component', showMirrorComponentDialog: true }),
  closeMirrorComponentDialog: () => set({ activeDialog: null, showMirrorComponentDialog: false }),

  // ── A23 — Duplicate With Joints ──────────────────────────────────────────
  showDuplicateWithJointsDialog: false,
  duplicateWithJointsTargetId: null,
  openDuplicateWithJointsDialog: (componentId) => set({ activeDialog: 'duplicate-with-joints', showDuplicateWithJointsDialog: true, duplicateWithJointsTargetId: componentId }),
  closeDuplicateWithJointsDialog: () => set({ activeDialog: null, showDuplicateWithJointsDialog: false, duplicateWithJointsTargetId: null }),

  // ── A26 — Bill of Materials ───────────────────────────────────────────────
  showBOMDialog: false,
  openBOMDialog: () => set({ activeDialog: 'bom', showBOMDialog: true }),
  closeBOMDialog: () => set({ activeDialog: null, showBOMDialog: false }),
  getBOMEntries: () => {
    const componentStore = useComponentStore.getState();
    const { components, bodies } = componentStore;

    // Count instances by name
    const nameCounts: Record<string, number> = {};
    for (const comp of Object.values(components)) {
      if (comp.parentId === null) continue; // skip root
      nameCounts[comp.name] = (nameCounts[comp.name] ?? 0) + 1;
    }

    // Track which names we've already added to avoid double-counting
    const seenNames = new Set<string>();
    const entries: import('../../../components/dialogs/assembly/BOMDialog').BOMEntry[] = [];
    let partNumber = 1;

    for (const comp of Object.values(components)) {
      if (comp.parentId === null) continue; // skip root
      if (seenNames.has(comp.name)) continue;
      seenNames.add(comp.name);

      // Material — use the first body's material name, if any
      let material = '\u2014';
      if (comp.bodyIds.length > 0) {
        const firstBody = bodies[comp.bodyIds[0]];
        if (firstBody?.material?.name) material = firstBody.material.name;
      }

      // Estimated mass from bounding box volume * 1.0 g/cm³
      let estimatedMass = '\u2014';
      for (const bodyId of comp.bodyIds) {
        const body = bodies[bodyId];
        if (!body?.mesh) continue;
        const box = new THREE.Box3().setFromObject(body.mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        // size is in mm, volume in mm³, convert to cm³ (*0.001), density 1 g/cm³
        const volumeCm3 = (size.x * size.y * size.z) * 0.001;
        const massG = volumeCm3 * 1.0;
        estimatedMass = `${massG.toFixed(1)} g`;
        break;
      }

      entries.push({
        partNumber,
        name: comp.name,
        quantity: nameCounts[comp.name] ?? 1,
        material,
        estimatedMass,
        description: '',
      });
      partNumber++;
    }

    return entries.sort((a, b) => a.partNumber - b.partNumber);
  },

  // ── A12 — Contact Sets ────────────────────────────────────────────────────
  contactSets: [],
  showContactSetsDialog: false,
  openContactSetsDialog: () => set({ activeDialog: 'contact-sets', showContactSetsDialog: true }),
  closeContactSetsDialog: () => set({ activeDialog: null, showContactSetsDialog: false }),
  addContactSet: (comp1Id, comp2Id) => {
    const { contactSets } = get();
    const componentStore = useComponentStore.getState();
    const comp1 = componentStore.components[comp1Id];
    const comp2 = componentStore.components[comp2Id];
    const name = `Contact ${comp1?.name ?? comp1Id}–${comp2?.name ?? comp2Id}`;
    const entry: ContactSetEntry = {
      id: crypto.randomUUID(),
      name,
      component1Id: comp1Id,
      component2Id: comp2Id,
      enabled: true,
    };
    set({ contactSets: [...contactSets, entry] });
  },
  toggleContactSet: (id) => set((state) => ({
    contactSets: state.contactSets.map((cs) => cs.id === id ? { ...cs, enabled: !cs.enabled } : cs),
  })),
  removeContactSet: (id) => set((state) => ({
    contactSets: state.contactSets.filter((cs) => cs.id !== id),
  })),
  enableAllContactSets: () => set((state) => ({
    contactSets: state.contactSets.map((cs) => ({ ...cs, enabled: true })),
  })),
  disableAllContactSets: () => set((state) => ({
    contactSets: state.contactSets.map((cs) => ({ ...cs, enabled: false })),
  })),

  // ── A13 — Insert Component ────────────────────────────────────────────────
  showInsertComponentDialog: false,
  openInsertComponentDialog: () => set({ activeDialog: 'insert-component', showInsertComponentDialog: true }),
  closeInsertComponentDialog: () => set({ activeDialog: null, showInsertComponentDialog: false }),
  commitInsertComponent: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.type === 'import').length + 1;
    const componentStore = useComponentStore.getState();
    const rootId = componentStore.rootComponentId;
    componentStore.addComponent(rootId, params.name);
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: params.name || `Inserted Component ${n}`,
      type: 'import',
      params: { sourceUrl: params.sourceUrl, scale: params.scale, posX: params.position[0], posY: params.position[1], posZ: params.position[2] },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    };
    get().addFeature(feature);
    set({ activeDialog: null, showInsertComponentDialog: false });
    get().setStatusMessage(`Inserted component: ${params.name} (mesh loading deferred)`);
  },

// ── D197–D203 Surface & Body Analysis Overlays ──────────────────────────
  activeAnalysis: null,
  setActiveAnalysis: (a) => set((s) => ({
    activeAnalysis: s.activeAnalysis === a ? null : a,
  })),
  analysisParams: {
    direction: 'y',
    frequency: 8,
    minAngle: 15,
    uCount: 5,
    vCount: 5,
    minRadius: 1.0,
    combScale: 1.0,
  },
  setAnalysisParams: (p) => set((s) => ({
    analysisParams: { ...s.analysisParams, ...p },
  })),

  // ── SFC7 — Fill Surface ──────────────────────────────────────────────────
  showFillDialog: false,
  fillBoundaryEdgeIds: [],
  fillBoundaryEdgeData: [],
  openFillDialog: () => set({ activeDialog: 'fill', showFillDialog: true, fillBoundaryEdgeIds: [], fillBoundaryEdgeData: [] }),
  addFillBoundaryEdge: (id, a, b) => set((s) => {
    if (s.fillBoundaryEdgeIds.includes(id)) return s;
    const data = a && b
      ? [...s.fillBoundaryEdgeData, { id, a, b }]
      : s.fillBoundaryEdgeData;
    return {
      fillBoundaryEdgeIds: [...s.fillBoundaryEdgeIds, id],
      fillBoundaryEdgeData: data,
    };
  }),
  closeFillDialog: () => set({ activeDialog: null, showFillDialog: false, fillBoundaryEdgeIds: [], fillBoundaryEdgeData: [] }),
  commitFill: (params) => {
    get().pushUndo();
    const { features, fillBoundaryEdgeData } = get();
    const n = features.filter((f) => f.params?.featureKind === 'fill').length + 1;

    // Assemble a single boundary loop by chaining edges that share endpoints.
    // Greedy walk: start at the first edge, then repeatedly find an edge whose
    // 'a' or 'b' endpoint matches the current chain tail (within tolerance).
    const TOL = 1e-4;
    const eq = (p: [number, number, number], q: [number, number, number]) =>
      Math.abs(p[0] - q[0]) < TOL && Math.abs(p[1] - q[1]) < TOL && Math.abs(p[2] - q[2]) < TOL;
    const buildLoop = (edges: Array<{ id: string; a: [number, number, number]; b: [number, number, number] }>): THREE.Vector3[] => {
      if (edges.length === 0) return [];
      const remaining = [...edges];
      const first = remaining.shift()!;
      const chain: [number, number, number][] = [first.a, first.b];
      while (remaining.length > 0) {
        const tail = chain[chain.length - 1];
        const idx = remaining.findIndex((e) => eq(e.a, tail) || eq(e.b, tail));
        if (idx < 0) break; // chain broken — return what we have
        const next = remaining.splice(idx, 1)[0];
        chain.push(eq(next.a, tail) ? next.b : next.a);
      }
      return chain.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    };

    const loop = buildLoop(fillBoundaryEdgeData);
    // Fall back to placeholder ONLY when no real edge data was captured —
    // then at least there's something visible to anchor the dialog flow.
    const FALLBACK_LOOP: THREE.Vector3[] = [
      new THREE.Vector3(-5, 0, -5),
      new THREE.Vector3( 5, 0, -5),
      new THREE.Vector3( 5, 0,  5),
      new THREE.Vector3(-5, 0,  5),
    ];
    const boundaryPoints: THREE.Vector3[][] = [loop.length >= 3 ? loop : FALLBACK_LOOP];
    const continuity = params.continuityPerEdge;
    const geom = GeometryEngine.fillSurface(
      boundaryPoints,
      continuity.length > 0 ? continuity : ['G0'],
    );
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Fill ${n}`,
      type: 'thicken',
      params: {
        featureKind: 'fill',
        boundaryEdgeCount: params.boundaryEdgeCount,
        continuityPerEdge: params.continuityPerEdge.map((s: 'G0' | 'G1' | 'G2') => ({ G0: 0, G1: 1, G2: 2 }[s] ?? 0)),
        operation: params.operation,
      },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'surface',
    };
    get().addFeature(feature);
    set({ activeDialog: null, showFillDialog: false, fillBoundaryEdgeIds: [], fillBoundaryEdgeData: [] });
    get().setStatusMessage(`Fill ${n} created`);
  },

  // ── SFC8 — Offset Curve to Surface ──────────────────────────────────────
  showOffsetCurveDialog: false,
  openOffsetCurveDialog: () => set({ activeDialog: 'offset-curve', showOffsetCurveDialog: true }),
  closeOffsetCurveDialog: () => set({ activeDialog: null, showOffsetCurveDialog: false }),
  commitOffsetCurve: (params) => {
    const { sketches, features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'offset-curve').length + 1;

    let geom: THREE.BufferGeometry;
    const sketch = params.sketchId ? sketches.find((s) => s.id === params.sketchId) : null;
    if (sketch && sketch.entities.length > 0) {
      // Flatten first entity's points to world-space Vector3 array
      const entity = sketch.entities[0];
      const pts = entity.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
      const normal = sketch.planeNormal.clone().normalize();
      const dir = params.direction === 'flip' ? normal.clone().negate() : normal;
      geom = GeometryEngine.offsetCurveToSurface(pts, params.distance, dir);
    } else {
      // Fallback strip
      const fallbackPts = [
        new THREE.Vector3(-5, 0, 0),
        new THREE.Vector3( 5, 0, 0),
      ];
      geom = GeometryEngine.offsetCurveToSurface(fallbackPts, params.distance, new THREE.Vector3(0, 1, 0));
    }

    const mat = new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Offset Curve ${n}`,
      type: 'sweep',
      sketchId: params.sketchId ?? undefined,
      params: { featureKind: 'offset-curve', distance: params.distance, direction: params.direction },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'surface',
    };
    get().addFeature(feature);
    set({ activeDialog: null, showOffsetCurveDialog: false });
    get().setStatusMessage(`Offset Curve ${n} created`);
  },

  // ── SFC16 — Surface Merge ────────────────────────────────────────────────
  showSurfaceMergeDialog: false,
  surfaceMergeFace1Id: null,
  surfaceMergeFace2Id: null,
  openSurfaceMergeDialog: () => set({ activeDialog: 'surface-merge', showSurfaceMergeDialog: true, surfaceMergeFace1Id: null, surfaceMergeFace2Id: null }),
  setSurfaceMergeFace1: (id) => set({ surfaceMergeFace1Id: id }),
  setSurfaceMergeFace2: (id) => set({ surfaceMergeFace2Id: id }),
  closeSurfaceMergeDialog: () => set({ activeDialog: null, showSurfaceMergeDialog: false, surfaceMergeFace1Id: null, surfaceMergeFace2Id: null }),
  commitSurfaceMerge: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'surface-merge').length + 1;

    // Attempt geometry merge if both face meshes are available
    let mesh: Feature['mesh'] | undefined;
    const allFeatures = features;
    const findMeshByFaceId = (faceId: string): THREE.Mesh | null => {
      for (const f of allFeatures) {
        if (f.mesh && (f.mesh as THREE.Object3D).userData?.faceId === faceId) {
          return f.mesh as THREE.Mesh;
        }
      }
      return null;
    };
    const meshA = params.face1Id ? findMeshByFaceId(params.face1Id) : null;
    const meshB = params.face2Id ? findMeshByFaceId(params.face2Id) : null;
    if (meshA && meshB) {
      const mergedGeom = GeometryEngine.mergeSurfaces(meshA, meshB);
      const mat = new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
      mesh = new THREE.Mesh(mergedGeom, mat);
      (mesh as THREE.Mesh).castShadow = true;
      (mesh as THREE.Mesh).receiveShadow = true;
    }

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Surface Merge ${n}`,
      type: 'thicken',
      params: { featureKind: 'surface-merge', face1Id: params.face1Id ?? '', face2Id: params.face2Id ?? '' },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'surface',
    };
    get().addFeature(feature);
    set({ activeDialog: null, showSurfaceMergeDialog: false, surfaceMergeFace1Id: null, surfaceMergeFace2Id: null });
    get().setStatusMessage(`Surface Merge ${n} created`);
  },

  // ── SFC18 — Delete Face ──────────────────────────────────────────────────
  showDeleteFaceDialog: false,
  deleteFaceIds: [],
  openDeleteFaceDialog: () => set({ activeDialog: 'delete-face', showDeleteFaceDialog: true, deleteFaceIds: [] }),
  addDeleteFace: (id) => set((s) => ({
    deleteFaceIds: s.deleteFaceIds.includes(id) ? s.deleteFaceIds : [...s.deleteFaceIds, id],
  })),
  clearDeleteFaces: () => set({ deleteFaceIds: [] }),
  closeDeleteFaceDialog: () => set({ activeDialog: null, showDeleteFaceDialog: false, deleteFaceIds: [] }),
  commitDeleteFace: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'delete-face').length + 1;
    const faceIds = params.faceIds.length > 0 ? params.faceIds : get().deleteFaceIds;
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Delete Face ${n}`,
      type: 'thicken',
      params: { featureKind: 'delete-face', faceIds: faceIds.join(','), healMode: params.healMode },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'surface',
    };
    get().addFeature(feature);
    set({ activeDialog: null, showDeleteFaceDialog: false, deleteFaceIds: [] });
    get().setStatusMessage(`Delete Face ${n}: ${faceIds.length} face${faceIds.length !== 1 ? 's' : ''} removed`);
  },

  // ── SFC10 — Surface Trim ──────────────────────────────────────────────────
  commitSurfaceTrim: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'surface-trim').length + 1;

    const sourceMesh = features.find((f) => f.id === params.sourceFeatureId)?.mesh as THREE.Mesh | undefined;
    const trimmerMesh = features.find((f) => f.id === params.trimmerFeatureId)?.mesh as THREE.Mesh | undefined;

    let mesh: Feature['mesh'] | undefined;
    if (sourceMesh && (sourceMesh as THREE.Mesh).isMesh && trimmerMesh && (trimmerMesh as THREE.Mesh).isMesh) {
      const trimmedGeo = GeometryEngine.trimSurface(sourceMesh, trimmerMesh, params.keepSide);
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x3b82f6, metalness: 0.0, roughness: 0.5,
        transparent: true, opacity: 0.6, side: THREE.DoubleSide,
      });
      const trimMesh = new THREE.Mesh(trimmedGeo, mat);
      trimMesh.castShadow = true;
      trimMesh.receiveShadow = true;
      mesh = trimMesh;
    }

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Surface Trim ${n}`,
      type: 'split-body',
      params: {
        featureKind: 'surface-trim',
        sourceFeatureId: params.sourceFeatureId,
        trimmerFeatureId: params.trimmerFeatureId,
        keepSide: params.keepSide,
      },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'surface',
    };
    get().addFeature(feature);
    get().setStatusMessage(`Surface Trim ${n}: keep ${params.keepSide}`);
  },

  // ── SFC14 — Surface Split ─────────────────────────────────────────────────
  commitSurfaceSplit: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'surface-split').length + 1;

    const sourceMesh = features.find((f) => f.id === params.sourceFeatureId)?.mesh as THREE.Mesh | undefined;
    const splitterMesh = features.find((f) => f.id === params.splitterFeatureId)?.mesh as THREE.Mesh | undefined;

    const newFeatures: Feature[] = [];

    if (sourceMesh && (sourceMesh as THREE.Mesh).isMesh && splitterMesh && (splitterMesh as THREE.Mesh).isMesh) {
      const geos = GeometryEngine.splitSurface(sourceMesh, splitterMesh);
      const colors = [0x3b82f6, 0x10b981];

      geos.forEach((geo, idx) => {
        if (geo.attributes.position && (geo.attributes.position as THREE.BufferAttribute).count === 0) return;
        const mat = new THREE.MeshPhysicalMaterial({
          color: colors[idx] ?? 0x3b82f6, metalness: 0.0, roughness: 0.5,
          transparent: true, opacity: 0.6, side: THREE.DoubleSide,
        });
        const halfMesh = new THREE.Mesh(geo, mat);
        halfMesh.castShadow = true;
        halfMesh.receiveShadow = true;

        newFeatures.push({
          id: crypto.randomUUID(),
          name: `Surface Split ${n}${geos.length > 1 ? `-${idx + 1}` : ''}`,
          type: 'split-body',
          params: {
            featureKind: 'surface-split',
            sourceFeatureId: params.sourceFeatureId,
            splitterFeatureId: params.splitterFeatureId,
            halfIndex: idx,
          },
          mesh: halfMesh,
          visible: true,
          suppressed: false,
          timestamp: Date.now(),
          bodyKind: 'surface',
        });
      });
    }

    if (newFeatures.length === 0) {
      // Fallback placeholder if no mesh found
      newFeatures.push({
        id: crypto.randomUUID(),
        name: `Surface Split ${n}`,
        type: 'split-body',
        params: {
          featureKind: 'surface-split',
          sourceFeatureId: params.sourceFeatureId,
          splitterFeatureId: params.splitterFeatureId,
        },
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        bodyKind: 'surface',
      });
    }

    // Hide original surface
    const nextFeatures = features.map((f) =>
      f.id === params.sourceFeatureId ? { ...f, visible: false } : f,
    );

    set({ features: [...nextFeatures, ...newFeatures] });
    get().setStatusMessage(`Surface Split ${n}: split into ${newFeatures.length} part${newFeatures.length !== 1 ? 's' : ''}`);
  },

  // ── SFC15 — Untrim ────────────────────────────────────────────────────────
  commitUntrim: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'untrim').length + 1;

    const sourceMesh = features.find((f) => f.id === params.sourceFeatureId)?.mesh as THREE.Mesh | undefined;

    let mesh: Feature['mesh'] | undefined;
    if (sourceMesh && (sourceMesh as THREE.Mesh).isMesh) {
      const untrimmedGeo = GeometryEngine.untrimSurface(sourceMesh, params.expandFactor);
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x8899aa, metalness: 0.0, roughness: 0.5,
        transparent: true, opacity: 0.6, side: THREE.DoubleSide,
      });
      const untrimMesh = new THREE.Mesh(untrimmedGeo, mat);
      untrimMesh.castShadow = true;
      untrimMesh.receiveShadow = true;
      mesh = untrimMesh;
    }

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Untrim ${n}`,
      type: 'sweep',
      params: {
        featureKind: 'untrim',
        sourceFeatureId: params.sourceFeatureId,
        expandFactor: params.expandFactor,
      },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'surface',
    };
    get().addFeature(feature);
    get().setStatusMessage(`Untrim ${n}: expanded ${params.expandFactor}×`);
  },

  // ── SFC9 — Offset Surface ────────────────────────────────────────────────
  commitOffsetSurface: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'offset-surface').length + 1;

    // Find the most recent surface body mesh to use as source
    const sourceMesh = [...features].reverse().find(
      (f) => f.mesh && (f.mesh as THREE.Mesh).isMesh && f.bodyKind === 'surface',
    )?.mesh as THREE.Mesh | undefined;

    let mesh: Feature['mesh'] | undefined;
    if (sourceMesh) {
      const dist =
        params.direction === 'inward'  ? -Math.abs(params.offsetDistance)
        : params.direction === 'outward' ?  Math.abs(params.offsetDistance)
        : Math.abs(params.offsetDistance); // 'both' — use positive; two bodies would need two calls
      const offsetGeo = GeometryEngine.offsetSurface(sourceMesh, dist);
      const mat = new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
      mesh = new THREE.Mesh(offsetGeo, mat);
      (mesh as THREE.Mesh).castShadow = true;
      (mesh as THREE.Mesh).receiveShadow = true;
    }

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Offset Surface ${n}`,
      type: 'thicken',
      params: { featureKind: 'offset-surface', ...params },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'surface',
    };
    get().addFeature(feature);
    get().setStatusMessage(`Offset Surface ${n}: ${params.offsetDistance}mm ${params.direction}`);
  },

  // ── SFC11 — Surface Extend ───────────────────────────────────────────────
  commitSurfaceExtend: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'extend-surface').length + 1;

    const sourceMesh = [...features].reverse().find(
      (f) => f.mesh && (f.mesh as THREE.Mesh).isMesh && f.bodyKind === 'surface',
    )?.mesh as THREE.Mesh | undefined;

    // Map dialog extensionType to GeometryEngine mode
    const modeMap: Record<string, 'natural' | 'tangent' | 'perpendicular'> = {
      natural:    'natural',
      linear:     'tangent',
      curvature:  'natural',
    };
    const mode = modeMap[params.extensionType] ?? 'natural';

    let mesh: Feature['mesh'] | undefined;
    if (sourceMesh) {
      const extGeo = GeometryEngine.extendSurface(sourceMesh, params.extendDistance, mode);
      const mat = new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
      mesh = new THREE.Mesh(extGeo, mat);
      (mesh as THREE.Mesh).castShadow = true;
      (mesh as THREE.Mesh).receiveShadow = true;
    }

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Surface Extend ${n}`,
      type: 'sweep',
      params: { featureKind: 'extend-surface', ...params },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'surface',
    };
    get().addFeature(feature);
    get().setStatusMessage(`Surface Extend ${n}: ${params.extendDistance}mm ${params.extensionType}`);
  },

  // ── SFC12 — Stitch ───────────────────────────────────────────────────────
  commitStitch: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'stitch').length + 1;

    // Collect source meshes by feature ID (fall back to most-recent surface bodies)
    let sourceMeshes: THREE.Mesh[];
    if (params.sourceFeatureIds.length > 0) {
      sourceMeshes = params.sourceFeatureIds
        .map((id) => features.find((f) => f.id === id)?.mesh as THREE.Mesh | undefined)
        .filter((m): m is THREE.Mesh => !!m && (m as THREE.Mesh).isMesh);
    } else {
      // Fallback: use all surface body meshes
      sourceMeshes = features
        .filter((f) => f.mesh && (f.mesh as THREE.Mesh).isMesh && f.bodyKind === 'surface')
        .map((f) => f.mesh as THREE.Mesh);
    }

    let mesh: Feature['mesh'] | undefined;
    let isSolid = false;

    if (sourceMeshes.length > 0) {
      const result = GeometryEngine.stitchSurfaces(sourceMeshes, params.tolerance);
      isSolid = result.isSolid;
      const mat = isSolid
        ? new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide })
        : new THREE.MeshPhysicalMaterial({ color: 0x3b82f6, metalness: 0.0, roughness: 0.5, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
      const newMesh = new THREE.Mesh(result.geometry, mat);
      newMesh.castShadow = true;
      newMesh.receiveShadow = true;
      mesh = newMesh;
    }

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Stitch ${n}`,
      type: 'thicken',
      params: {
        featureKind: 'stitch',
        tolerance: params.tolerance,
        closeOpenEdges: params.closeOpenEdges,
        keepOriginal: params.keepOriginal,
        sourceFeatureIds: params.sourceFeatureIds.join(','),
        isSolid: isSolid ? 1 : 0,
      },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: isSolid ? 'solid' : 'surface',
    };

    // Hide source bodies unless keepOriginal is set
    const nextFeatures = params.keepOriginal
      ? features
      : features.map((f) =>
          params.sourceFeatureIds.includes(f.id) ? { ...f, visible: false } : f,
        );

    set({ features: [...nextFeatures, feature] });
    get().setStatusMessage(`Stitch ${n}: ${isSolid ? 'closed solid' : 'surface quilt'} from ${sourceMeshes.length} bodies`);
  },

  // ── SFC13 — Unstitch ─────────────────────────────────────────────────────
  commitUnstitch: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'unstitch').length + 1;

    const sourceMesh = features.find((f) => f.id === params.sourceFeatureId)?.mesh as THREE.Mesh | undefined;

    const newFeatures: Feature[] = [];

    if (sourceMesh && (sourceMesh as THREE.Mesh).isMesh) {
      const geos = GeometryEngine.unstitchSurface(sourceMesh);

      geos.forEach((geo, idx) => {
        const mat = new THREE.MeshPhysicalMaterial({
          color: 0x3b82f6, metalness: 0.0, roughness: 0.5,
          transparent: true, opacity: 0.45, side: THREE.DoubleSide,
        });
        const faceMesh = new THREE.Mesh(geo, mat);
        faceMesh.castShadow = true;
        faceMesh.receiveShadow = true;

        newFeatures.push({
          id: crypto.randomUUID(),
          name: `Surface Face ${n}${geos.length > 1 ? `-${idx + 1}` : ''}`,
          type: 'split-body',
          params: {
            featureKind: 'unstitch',
            sourceFeatureId: params.sourceFeatureId,
            faceIndex: idx,
            keepOriginal: params.keepOriginal ? 1 : 0,
          },
          mesh: faceMesh,
          visible: true,
          suppressed: false,
          timestamp: Date.now(),
          bodyKind: 'surface',
        });
      });
    } else {
      // No mesh found — create a placeholder feature so the record exists
      newFeatures.push({
        id: crypto.randomUUID(),
        name: `Unstitch ${n}`,
        type: 'split-body',
        params: {
          featureKind: 'unstitch',
          sourceFeatureId: params.sourceFeatureId,
          keepOriginal: params.keepOriginal ? 1 : 0,
        },
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
        bodyKind: 'surface',
      });
    }

    // Hide the original stitched body unless keepOriginal is set
    const nextFeatures = params.keepOriginal
      ? features
      : features.map((f) =>
          f.id === params.sourceFeatureId ? { ...f, visible: false } : f,
        );

    set({ features: [...nextFeatures, ...newFeatures] });
    get().setStatusMessage(`Unstitch ${n}: separated into ${newFeatures.length} face${newFeatures.length !== 1 ? 's' : ''}`);
  },

  // ── SFC17 — Thicken ──────────────────────────────────────────────────────
  commitThicken: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'thicken-solid').length + 1;

    const sourceMesh = [...features].reverse().find(
      (f) => f.mesh && (f.mesh as THREE.Mesh).isMesh && f.bodyKind === 'surface',
    )?.mesh as THREE.Mesh | undefined;

    let mesh: Feature['mesh'] | undefined;
    if (sourceMesh) {
      const thickGeo = GeometryEngine.thickenSurface(sourceMesh, params.thickness, params.direction);
      const mat = new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
      mesh = new THREE.Mesh(thickGeo, mat);
      (mesh as THREE.Mesh).castShadow = true;
      (mesh as THREE.Mesh).receiveShadow = true;
    }

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Thicken (${params.thickness}mm, ${params.direction})`,
      type: 'thicken',
      params: { featureKind: 'thicken-solid', ...params },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'solid',
    };
    get().addFeature(feature);
    get().setStatusMessage(`Thicken ${n}: ${params.thickness}mm ${params.direction}`);
  },

  // ── SFC22 — Surface Primitives ───────────────────────────────────────────
  showSurfacePrimitivesDialog: false,
  openSurfacePrimitivesDialog: () => set({ activeDialog: 'surface-primitives', showSurfacePrimitivesDialog: true }),
  closeSurfacePrimitivesDialog: () => set({ activeDialog: null, showSurfacePrimitivesDialog: false }),
  commitSurfacePrimitive: (params) => {
    const { features } = get();
    const n = features.filter((f) => f.params?.featureKind === 'surface-primitive').length + 1;

    const geom = GeometryEngine.createSurfacePrimitive(params.type, {
      width: params.width ?? 10,
      height: params.height ?? 10,
      depth: params.depth ?? 10,
      radius: params.radius ?? 5,
      height2: params.height2 ?? 10,
      tube: params.tube ?? 2,
    });
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Surface ${params.type.charAt(0).toUpperCase() + params.type.slice(1)} ${n}`,
      type: 'primitive',
      params: { featureKind: 'surface-primitive', ...params },
      mesh,
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
      bodyKind: 'surface',
    };
    get().addFeature(feature);
    set({ activeDialog: null, showSurfacePrimitivesDialog: false });
    get().setStatusMessage(`Surface ${params.type} primitive created`);
  },

  // ── MM1 — Design history mode ───────────────────────────────────────────
  };

  return slice;
}
